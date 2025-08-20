"""
Workflow Validator - Pre-run validation for workflows.

Checks:
- JSON Schema compliance (resolves local $refs)
- Function existence in registry and central specs
- Required inputs presence (with template-aware allowances)
- Edge/node referential integrity and basic graph sanity
- Condition expressions are syntactically valid
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Tuple

from jsonschema import Draft202012Validator, RefResolver

from engine.utils import TemplateEngine
from engine.utils import ExpressionEvaluator, SafeExpressionError

# IMPORTANT: import via top-level module names to share singletons with helpers
from registry.central_spec import get_function_spec, get_required_inputs
from registry.function_registry import registry

# Ensure browser functions are registered into the registry (wrappers from specs)
# Importing helpers via top-level name triggers auto-registration in the same namespace
from browser import helpers as _browser_helpers  # noqa: F401


def _schemas_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "schemas"))


def _load_schema(name: str) -> Dict[str, Any]:
    schemas_dir = _schemas_dir()
    with open(os.path.join(schemas_dir, name), "r", encoding="utf-8") as f:
        import json

        return json.load(f)


def _validate_jsonschema(workflow_data: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    workflow_schema = _load_schema("workflow_schema.json")

    # Base URI for resolving local refs like ./node_schema.json
    base_uri = f"file://{_schemas_dir().rstrip('/')}/"
    resolver = RefResolver(base_uri=base_uri, referrer=workflow_schema)
    validator = Draft202012Validator(workflow_schema, resolver=resolver)

    for err in sorted(validator.iter_errors(workflow_data), key=lambda e: e.path):
        path = "/".join([str(p) for p in err.path])
        location = f" at $.{path}" if path else ""
        errors.append(f"Schema validation error{location}: {err.message}")
    return errors


def _extract_results_reference(template_expr: str) -> Tuple[str, str]:
    """If expr is results.<node_id>.<rest>, return (node_id, rest). Else ("", "")."""
    if template_expr.startswith("results."):
        parts = template_expr.split(".")
        if len(parts) >= 2:
            return parts[1], ".".join(parts[2:]) if len(parts) > 2 else ""
    return "", ""


def _validate_node_function_and_inputs(
    node_id: str,
    node: Dict[str, Any],
    workflow_inputs: Dict[str, Any],
    nodes: Dict[str, Any],
) -> Tuple[List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    domain = node.get("domain")
    type_name = node.get("type")
    subtype = node.get("subtype")
    inputs = node.get("inputs", {}) or {}
    properties = node.get("properties", {}) or {}

    # Spec existence
    spec = get_function_spec(domain, type_name, subtype)
    if not spec:
        errors.append(f"Node '{node_id}': unknown function {domain}.{type_name}.{subtype}")
    else:
        # Registry existence (wrappers should be registered from helpers import)
        if registry.get_function(domain, type_name, subtype) is None:
            errors.append(
                f"Node '{node_id}': function not registered in runtime registry: {domain}.{type_name}.{subtype}"
            )

        # Required inputs presence
        required = get_required_inputs(domain, type_name, subtype) or []
        for req in required:
            if req not in inputs:
                errors.append(
                    f"Node '{node_id}': missing required input '{req}' for {domain}.{type_name}.{subtype}"
                )
                continue

            value = inputs.get(req)
            # If templated, verify that it is resolvable from workflow inputs/properties, or references an existing node's results
            if isinstance(value, str) and "{{" in value:
                variables = TemplateEngine.extract_template_variables(value)
                for var in variables:
                    if var.startswith("inputs."):
                        key = var[len("inputs.") :]
                        if key not in workflow_inputs:
                            errors.append(
                                f"Node '{node_id}': template '{var}' for '{req}' references missing workflow input '{key}'"
                            )
                    elif var.startswith("properties."):
                        key = var[len("properties.") :]
                        if key not in properties:
                            warnings.append(
                                f"Node '{node_id}': template '{var}' for '{req}' references missing node property '{key}'"
                            )
                    elif var.startswith("results."):
                        ref_node, _ = _extract_results_reference(var)
                        if not ref_node or ref_node not in nodes:
                            errors.append(
                                f"Node '{node_id}': template '{var}' for '{req}' references unknown node '{ref_node}'"
                            )
                        else:
                            # We cannot pre-validate output shape; warn only
                            warnings.append(
                                f"Node '{node_id}': '{req}' depends on results from node '{ref_node}', cannot fully validate pre-run"
                            )
                    else:
                        # Generic context access; we cannot be certain. Warn.
                        warnings.append(
                            f"Node '{node_id}': template '{var}' for '{req}' may not be resolvable pre-run"
                        )
            elif value is None:
                errors.append(
                    f"Node '{node_id}': required input '{req}' is None for {domain}.{type_name}.{subtype}"
                )

    # Validate node condition syntax (if provided)
    cond = node.get("conditions")
    if isinstance(cond, str) and cond.strip():
        try:
            # Provide minimal context to catch syntax issues
            ExpressionEvaluator.evaluate(
                cond,
                {
                    "inputs": workflow_inputs,
                    "results": {},
                    "properties": properties,
                    "nodes": nodes,
                },
            )
        except SafeExpressionError as exc:
            errors.append(f"Node '{node_id}': invalid condition expression: {exc}")
        except Exception as exc:
            warnings.append(f"Node '{node_id}': condition expression may not evaluate pre-run: {exc}")

    return errors, warnings


def _validate_edges(workflow_data: Dict[str, Any]) -> Tuple[List[str], List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []
    starting_nodes: List[str] = []

    nodes = workflow_data.get("nodes", {}) or {}
    edges = workflow_data.get("edges", []) or []

    node_ids = set(nodes.keys())
    incoming = {e.get("to") for e in edges if isinstance(e, dict)}
    starting_nodes = [nid for nid in node_ids if nid not in incoming]
    if len(starting_nodes) == 0 and len(node_ids) > 0:
        warnings.append("No starting nodes detected (every node has an incoming edge)")

    # Referential integrity of edges
    for idx, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"Edge at index {idx} is not an object")
            continue
        src = edge.get("from")
        dst = edge.get("to")
        if src not in node_ids:
            errors.append(f"Edge {idx}: 'from' references unknown node '{src}'")
        if dst not in node_ids:
            errors.append(f"Edge {idx}: 'to' references unknown node '{dst}'")

        cond = edge.get("condition")
        if isinstance(cond, str) and cond.strip():
            try:
                ExpressionEvaluator.evaluate(
                    cond,
                    {
                        "inputs": workflow_data.get("inputs", {}) or {},
                        "results": {},
                        "properties": {},
                        "nodes": nodes,
                    },
                )
            except SafeExpressionError as exc:
                errors.append(f"Edge {idx}: invalid condition expression: {exc}")
            except Exception as exc:
                warnings.append(f"Edge {idx}: condition expression may not evaluate pre-run: {exc}")

    return errors, warnings, starting_nodes


def validate_workflow(workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate workflow, returning a structured report.

    Returns:
        {
          "valid": bool,
          "errors": [str],
          "warnings": [str],
          "summary": {"num_nodes": int, "num_edges": int, "starting_nodes": [str]}
        }
    """
    errors: List[str] = []
    warnings: List[str] = []

    # 1) JSON Schema
    errors.extend(_validate_jsonschema(workflow_data))

    nodes = workflow_data.get("nodes", {}) or {}
    workflow_inputs = workflow_data.get("inputs", {}) or {}

    # 2) Node function spec + required inputs
    for node_id, node in nodes.items():
        node_errors, node_warnings = _validate_node_function_and_inputs(
            node_id, node or {}, workflow_inputs, nodes
        )
        errors.extend(node_errors)
        warnings.extend(node_warnings)

    # 3) Edge referential integrity and conditions
    edge_errors, edge_warnings, starting_nodes = _validate_edges(workflow_data)
    errors.extend(edge_errors)
    warnings.extend(edge_warnings)

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "num_nodes": len(nodes),
            "num_edges": len(workflow_data.get("edges", []) or []),
            "starting_nodes": starting_nodes,
        },
    }

