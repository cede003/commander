"""
WorkflowContext - Encapsulates runtime state for workflow execution.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional, List
from engine.utils import ExpressionEvaluator


class WorkflowContext:
    """Holds all mutable and immutable data needed by the engine to run a workflow."""

    def __init__(
        self,
        workflow_data: Dict[str, Any],
        session: Any,
        workflow_logger: Any,
        workflow_id: Optional[str] = None,
        run_id: Optional[str] = None,
    ) -> None:
        self.workflow_data = workflow_data
        self.session = session
        self.workflow_logger = workflow_logger

        metadata = workflow_data.get("metadata", {})
        self.workflow_name: str = metadata.get("name", "Unknown")
        self.workflow_id: str = workflow_id or metadata.get("id", str(uuid.uuid4()))
        self.run_id: str = run_id or str(uuid.uuid4())

        # Core components from workflow
        self.nodes: Dict[str, Any] = workflow_data.get("nodes", {})
        self.edges: Any = workflow_data.get("edges", [])
        self.inputs: Dict[str, Any] = workflow_data.get("inputs", {})
        self.default_error_handling: Dict[str, Any] = workflow_data.get("default_error_handling", {})

        # Runtime state
        self.properties: Dict[str, Any] = {}
        self.results: Dict[str, Any] = {}
        self.retry_count: Dict[str, int] = {}

        # Cached state for execution convenience
        self._registry_context_cache: Optional[Dict[str, Any]] = None
        self.current_node_id: Optional[str] = None
        self.current_inputs: Optional[Dict[str, Any]] = None

    def get_registry_context(self) -> Dict[str, Any]:
        """Return a cached registry context dict, refreshed with current references."""
        if self._registry_context_cache is None:
            self._registry_context_cache = {}
        # Always refresh references so the cache stays in sync with latest state
        self._registry_context_cache.update({
            "inputs": self.inputs,
            "results": self.results,
            "session": self.session,
            "nodes": self.nodes,
            "edges": self.edges,
            "properties": self.properties,
            "workflow_id": self.workflow_id,
            "run_id": self.run_id,
            "workflow_logger": self.workflow_logger,
            "workflow_data": self.workflow_data,
            "default_error_handling": self.default_error_handling,
            "retry_count": self.retry_count,
        })
        return self._registry_context_cache

    def get_eval_context(self, node_properties: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Context for expression evaluation (conditions)."""
        return {
            "inputs": self.inputs,
            "results": self.results,
            "properties": node_properties or self.properties,
            "nodes": self.nodes,
        }

    # --------------------------
    # Data access helpers
    # --------------------------
    def set_current_node(self, node_id: str, properties: Optional[Dict[str, Any]] = None, prepared_inputs: Optional[Dict[str, Any]] = None) -> None:
        self.current_node_id = node_id
        self.properties = properties or {}
        self.current_inputs = prepared_inputs
        # keep registry context in sync
        if self._registry_context_cache is not None:
            self._registry_context_cache["properties"] = self.properties

    def get_node(self, node_id: str) -> Dict[str, Any]:
        return self.nodes[node_id]

    def get_outgoing_edges(self, node_id: str) -> List[Dict[str, Any]]:
        return [edge for edge in self.edges if edge.get("from") == node_id]

    def get_starting_nodes(self) -> List[str]:
        incoming = {edge.get("to") for edge in self.edges}
        return list(set(self.nodes) - incoming)

    # --------------------------
    # Condition helpers
    # --------------------------
    def eval_node_condition(self, node: Dict[str, Any]) -> bool:
        conditions = node.get("conditions")
        if not conditions:
            return True
        try:
            return bool(ExpressionEvaluator.evaluate(conditions, self.get_eval_context(node.get("properties", {}))))
        except Exception:
            return False

    def eval_edge_condition(self, condition_expr: Optional[str]) -> bool:
        if not condition_expr:
            return True
        try:
            return bool(ExpressionEvaluator.evaluate(condition_expr, self.get_eval_context()))
        except Exception:
            return False

    # --------------------------
    # Results and retries helpers
    # --------------------------
    def record_result(self, node_id: str, result: Any) -> None:
        self.results[node_id] = result
        # keep registry context in sync if cached
        if self._registry_context_cache is not None:
            self._registry_context_cache["results"] = self.results

    def get_retry(self, node_id: str) -> int:
        return self.retry_count.get(node_id, 0)

    def increment_retry(self, node_id: str) -> int:
        new_value = self.retry_count.get(node_id, 0) + 1
        self.retry_count[node_id] = new_value
        if self._registry_context_cache is not None:
            self._registry_context_cache["retry_count"] = self.retry_count
        return new_value

    # --------------------------
    # Error handling helpers (moved to ErrorHandler; kept minimal runtime state only)
    # --------------------------
    # Note: Strategy resolution and config calculation lives in ErrorHandler now.

