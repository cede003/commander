from __future__ import annotations
from typing import Any, Dict

from registry.function_registry import execute_node
from engine.utils import TemplateEngine
from engine.utils.status_tracker import StatusTracker
from .context import WorkflowContext
from .error_handler import ErrorHandler


class ExecutionEngine:

    async def run(self, wf_ctx: WorkflowContext) -> Dict[str, Any]:
        for node_id in wf_ctx.get_starting_nodes():
            await self._execute_node_chain(node_id, wf_ctx)
        return {
            "success": True,
            "results": wf_ctx.results,
            "workflow_id": wf_ctx.workflow_id,
            "run_id": wf_ctx.run_id,
            "workflow_name": wf_ctx.workflow_name,
            "updated_workflow": wf_ctx.workflow_data,
        }

    async def _execute_node_chain(self, node_id: str, wf_ctx: WorkflowContext):
        result = await self._execute_node(node_id, wf_ctx)
        if result.get("status") in {"skipped", "paused_and_continued", "failed_but_continued", "terminated"}:
            return
        for edge in wf_ctx.get_outgoing_edges(node_id):
            if wf_ctx.eval_edge_condition(edge.get("condition")):
                await self._execute_node_chain(edge.get("to"), wf_ctx)

    async def _execute_node(self, node_id: str, wf_ctx: WorkflowContext) -> Dict[str, Any]:
        node = wf_ctx.get_node(node_id)
        if not wf_ctx.eval_node_condition(node):
            StatusTracker.skip_run(node)
            return {"node_id": node_id, "status": "skipped", "reason": "condition_false"}

        inputs = self._prepare_inputs(node.get("inputs", {}), wf_ctx)
        stopwatch = StatusTracker.start_run(node_id, node, wf_ctx.get_registry_context())
        wf_ctx.set_current_node(node_id, node.get("properties", {}), inputs)

        # Human-readable info log
        wf_ctx.workflow_logger.workflow_logger.info(f"Executing node: {node_id}")

        

        try:
            result = await execute_node(
                node.get("domain", "browser"),
                node.get("type", "action"),
                node.get("subtype"),
                inputs,
                wf_ctx.get_registry_context(),
            )

            if isinstance(result, dict) and result.get("success") is False:
                return await ErrorHandler.handle_error(
                    node_id,
                    wf_ctx,
                    stopwatch,
                    result.get("error", "Execution failed"),
                    execute_node=self._execute_node,
                    result=result,
                )

            return self._handle_success(node_id, node, wf_ctx, stopwatch, result)

        except Exception as e:
            return await ErrorHandler.handle_error(
                node_id,
                wf_ctx,
                stopwatch,
                str(e),
                execute_node=self._execute_node,
                exception=e,
            )

    def _prepare_inputs(self, raw_inputs: Dict[str, Any], wf_ctx: WorkflowContext) -> Dict[str, Any]:
        if TemplateEngine.has_template_variables(raw_inputs):
            raw_inputs = TemplateEngine.process_template_variables(raw_inputs, wf_ctx.get_registry_context())
        TemplateEngine.validate_template_variables(raw_inputs, wf_ctx.get_registry_context())
        return raw_inputs

    def _handle_success(self, node_id, node, wf_ctx, stopwatch, result):
        StatusTracker.complete_run(node, stopwatch)
        wf_ctx.record_result(node_id, result)

        exec_info = node.get("execution_info", {}).get("runs", [])
        exec_time = exec_info[-1].get("execution_time_seconds", 0.0) if exec_info else 0.0

        # Structured debug progress event
        wf_ctx.workflow_logger.log_node_success(node_id, exec_time)
        wf_ctx.workflow_logger.log_node_result(node_id, result)
        return result

    
