"""
Safe expression evaluator for workflow node and edge conditions.

Supports simple boolean expressions referencing names in the execution context,
such as inputs, results, properties, and nodes. Uses Python's AST with a
whitelist of allowed nodes and operators to avoid arbitrary code execution.
"""

from __future__ import annotations

import ast
from typing import Any, Dict


class SafeExpressionError(Exception):
    pass


class ExpressionEvaluator:
    """Evaluate simple boolean expressions safely against a context dict."""

    @staticmethod
    def evaluate(expression: str, context: Dict[str, Any]) -> bool:
        if expression is None or (isinstance(expression, str) and expression.strip() == ""):
            return True

        try:
            tree = ast.parse(expression, mode="eval")
            ExpressionEvaluator._validate_ast(tree)
            return bool(ExpressionEvaluator._eval_node(tree.body, context))
        except SafeExpressionError:
            raise
        except Exception as exc:
            raise SafeExpressionError(f"Invalid condition expression: {expression} ({exc})")

    @staticmethod
    def _validate_ast(node: ast.AST) -> None:
        allowed_nodes = (
            ast.Expression,
            ast.BoolOp,
            ast.BinOp,
            ast.UnaryOp,
            ast.Compare,
            ast.Name,
            ast.Load,
            ast.Constant,
            ast.And,
            ast.Or,
            ast.Not,
            ast.Eq,
            ast.NotEq,
            ast.Lt,
            ast.LtE,
            ast.Gt,
            ast.GtE,
            ast.In,
            ast.NotIn,
            ast.Is,
            ast.IsNot,
            ast.Attribute,
            ast.Subscript,
            ast.Index,
            ast.Slice,
            ast.Dict,
            ast.List,
            ast.Tuple,
            ast.Str,
            ast.Num,
        )

        for child in ast.walk(node):
            if not isinstance(child, allowed_nodes):
                raise SafeExpressionError(f"Disallowed expression element: {type(child).__name__}")

    @staticmethod
    def _eval_node(node: ast.AST, context: Dict[str, Any]) -> Any:
        if isinstance(node, ast.Constant):
            return node.value

        if isinstance(node, ast.Name):
            return context.get(node.id)

        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(ExpressionEvaluator._eval_node(v, context) for v in node.values)
            if isinstance(node.op, ast.Or):
                return any(ExpressionEvaluator._eval_node(v, context) for v in node.values)
            raise SafeExpressionError("Unsupported boolean operator")

        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            return not ExpressionEvaluator._eval_node(node.operand, context)

        if isinstance(node, ast.BinOp):
            left = ExpressionEvaluator._eval_node(node.left, context)
            right = ExpressionEvaluator._eval_node(node.right, context)
            # Only support addition for string concatenation or numeric add for simplicity
            from operator import add
            if isinstance(node.op, ast.Add):
                return add(left, right)
            raise SafeExpressionError("Unsupported binary operation")

        if isinstance(node, ast.Compare):
            left = ExpressionEvaluator._eval_node(node.left, context)
            for op, comparator in zip(node.ops, node.comparators):
                right = ExpressionEvaluator._eval_node(comparator, context)
                if isinstance(op, ast.Eq) and not (left == right):
                    return False
                elif isinstance(op, ast.NotEq) and not (left != right):
                    return False
                elif isinstance(op, ast.Lt) and not (left < right):
                    return False
                elif isinstance(op, ast.LtE) and not (left <= right):
                    return False
                elif isinstance(op, ast.Gt) and not (left > right):
                    return False
                elif isinstance(op, ast.GtE) and not (left >= right):
                    return False
                elif isinstance(op, ast.In) and not (left in right):
                    return False
                elif isinstance(op, ast.NotIn) and not (left not in right):
                    return False
                elif isinstance(op, ast.Is) and not (left is right):
                    return False
                elif isinstance(op, ast.IsNot) and not (left is not right):
                    return False
                left = right
            return True

        if isinstance(node, ast.Attribute):
            value = ExpressionEvaluator._eval_node(node.value, context)
            if isinstance(value, dict):
                return value.get(node.attr)
            return getattr(value, node.attr, None)

        if isinstance(node, ast.Subscript):
            container = ExpressionEvaluator._eval_node(node.value, context)
            key = ExpressionEvaluator._eval_node(node.slice, context) if not isinstance(node.slice, ast.Slice) else slice(
                ExpressionEvaluator._eval_node(node.slice.lower, context) if node.slice.lower else None,
                ExpressionEvaluator._eval_node(node.slice.upper, context) if node.slice.upper else None,
                ExpressionEvaluator._eval_node(node.slice.step, context) if node.slice.step else None,
            )
            try:
                return container[key]
            except Exception:
                return None

        if isinstance(node, ast.Tuple):
            return tuple(ExpressionEvaluator._eval_node(elt, context) for elt in node.elts)

        if isinstance(node, ast.List):
            return [ExpressionEvaluator._eval_node(elt, context) for elt in node.elts]

        if isinstance(node, ast.Dict):
            return {
                ExpressionEvaluator._eval_node(k, context): ExpressionEvaluator._eval_node(v, context)
                for k, v in zip(node.keys, node.values)
            }

        raise SafeExpressionError(f"Unsupported expression element: {type(node).__name__}")

