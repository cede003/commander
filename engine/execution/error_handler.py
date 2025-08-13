from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Dict, Optional

from engine.utils.status_tracker import StatusTracker
from .context import WorkflowContext
 


class ErrorHandler:
    """Centralized runtime error handling for node execution.

    Encapsulates logging, strategy resolution, and strategy execution
    (retry, pause, exit, continue).
    """

    @staticmethod
    async def handle_error(
        node_id: str,
        wf_ctx: WorkflowContext,
        stopwatch: Dict[str, Any],
        error_message: str,
        execute_node: Callable[[str, WorkflowContext], Awaitable[Dict[str, Any]]],
        result: Optional[Dict[str, Any]] = None,
        exception: Optional[Exception] = None,
    ) -> Dict[str, Any]:
        node = wf_ctx.get_node(node_id)
        StatusTracker.error_run(node, stopwatch, error_message)

        if result:
            wf_ctx.record_result(node_id, result)

        wf_ctx.workflow_logger.log_node_error(
            node_id,
            exception or Exception(error_message),
            node.get("error_handling", {}),
            {
                "node_id": node_id,
                "domain": node.get("domain", "browser"),
                "type": node.get("type", "action"),
                "subtype": node.get("subtype"),
                "inputs": wf_ctx.current_inputs,
                "properties": wf_ctx.properties,
                **({"result": result} if result else {}),
            },
        )

        strategy = ErrorHandler._get_error_strategy(node, wf_ctx)
        if strategy == "retry":
            return await ErrorHandler._retry_node(node_id, wf_ctx, execute_node)
        if strategy == "pause":
            return await ErrorHandler._pause_node(node_id, wf_ctx)
        if strategy == "exit":
            return await ErrorHandler._exit_workflow(node_id, node, wf_ctx, error_message)

        
        wf_ctx.workflow_logger.log_continue_after_error(node_id)
        return {"node_id": node_id, "status": "failed_but_continued", "error": error_message}

    @staticmethod
    async def _retry_node(
        node_id: str,
        wf_ctx: WorkflowContext,
        execute_node: Callable[[str, WorkflowContext], Awaitable[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        node = wf_ctx.get_node(node_id)
        cfg = ErrorHandler._get_retry_config(node, wf_ctx)
        attempt = wf_ctx.get_retry(node_id)
        if attempt < cfg["max_attempts"]:
            wf_ctx.increment_retry(node_id)
            wf_ctx.workflow_logger.log_retry_attempt(node_id, attempt + 1, cfg["max_attempts"])
            await asyncio.sleep(cfg["retry_delay"])
            return await execute_node(node_id, wf_ctx)
        wf_ctx.workflow_logger.log_retry_failure(node_id, cfg["max_attempts"])
        # Escalate to exit workflow when max attempts are exhausted
        return await ErrorHandler._exit_workflow(
            node_id,
            node,
            wf_ctx,
            f"Max retries reached for node {node_id}",
        )

    @staticmethod
    async def _pause_node(node_id: str, wf_ctx: WorkflowContext) -> Dict[str, Any]:
        node = wf_ctx.get_node(node_id)
        seconds = ErrorHandler._get_pause_seconds(node, wf_ctx)
        wf_ctx.workflow_logger.log_pause_execution(node_id, seconds)
        try:
            StatusTracker.pause_run(node, f"Paused for {seconds} seconds")
        except Exception:
            pass
        await asyncio.sleep(seconds)
        return {"node_id": node_id, "status": "paused_and_continued", "pause_duration": seconds}

    @staticmethod
    async def _exit_workflow(node_id: str, node: Dict[str, Any], wf_ctx: WorkflowContext, error: str) -> Dict[str, Any]:
        wf_ctx.workflow_logger.log_workflow_exit(node_id, Exception(error))
        raise Exception(f"Workflow exited from node {node_id}: {error}")

    @staticmethod
    def _get_error_strategy(node: Dict[str, Any], wf_ctx: WorkflowContext) -> str:
        node_opts = node.get("error_handling", {}) or {}
        strategy = node_opts.get("strategy", (wf_ctx.default_error_handling or {}).get("strategy", "continue"))
        return strategy if strategy in {"retry", "continue", "pause", "exit"} else "continue"

    @staticmethod
    def _get_retry_config(node: Dict[str, Any], wf_ctx: WorkflowContext) -> Dict[str, Any]:
        node_opts = node.get("error_handling", {}) or {}
        defaults = wf_ctx.default_error_handling or {}
        return {
            "max_attempts": node_opts.get("max_retry_attempts", defaults.get("max_retry_attempts", 3)),
            "retry_delay": node_opts.get("retry_delay", defaults.get("retry_delay", 1)),
        }

    @staticmethod
    def _get_pause_seconds(node: Dict[str, Any], wf_ctx: WorkflowContext) -> int:
        node_opts = node.get("error_handling", {}) or {}
        defaults = wf_ctx.default_error_handling or {}
        return int(node_opts.get("pause_seconds", defaults.get("pause_seconds", 5)))

