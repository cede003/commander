from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, Optional
from ..logging.logger import logger as logger


class NodeTracker:
    """Track and update individual node status and execution info."""

    STATUS_RUNNING = "running"
    STATUS_COMPLETE = "complete"
    STATUS_ERROR = "error"
    STATUS_SKIPPED = "skipped"
    STATUS_PAUSED = "paused"

    @staticmethod
    def _now() -> str:
        """Get current UTC timestamp in ISO format."""
        return datetime.utcnow().isoformat()

    @staticmethod
    def _get_workflow_logger(context_or_node: Dict[str, Any]) -> Optional[Any]:
        """Safely extract workflow logger from context or node data."""
        if not isinstance(context_or_node, dict):
            return None
        
        # Try direct workflow_logger first, then nested context
        wf_logger = context_or_node.get("workflow_logger")
        if wf_logger:
            return wf_logger
        
        context = context_or_node.get("context", {})
        if isinstance(context, dict):
            return context.get("workflow_logger")
        
        return None

    @staticmethod
    def _validate_status_transition(current_status: Optional[str], new_status: str) -> bool:
        """Validate if a status transition is allowed."""
        from ..evaluation.validator import validate_status_transition
        return validate_status_transition(current_status, new_status)

    @staticmethod
    def _record_run(
        node_data: Dict[str, Any],
        status: str,
        update_fields: Dict[str, Any],
        new_run: bool = False,
        attempt: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Record or update execution run data with validation."""
        if not isinstance(node_data, dict):
            raise ValueError("node_data must be a dictionary")
        
        if status not in [NodeTracker.STATUS_RUNNING, NodeTracker.STATUS_COMPLETE, 
                         NodeTracker.STATUS_ERROR, NodeTracker.STATUS_SKIPPED, NodeTracker.STATUS_PAUSED]:
            raise ValueError(f"Invalid status: {status}")
        
        # Validate status transition
        current_status = node_data.get("status")
        if not NodeTracker._validate_status_transition(current_status, status):
            logger.warning(f"[workflow] Unexpected status transition: {current_status} -> {status}")
        
        runs = node_data.setdefault("execution_info", {}).setdefault("runs", [])
        
        if new_run:
            run_entry = {
                "attempt": attempt or len(runs) + 1,
                "started_at": NodeTracker._now(),
                "status_message": update_fields.get("status_message", "Node execution started"),
            }
            runs.append(run_entry)
        else:
            if not runs:
                raise ValueError("Cannot update non-existent run")
            run_entry = runs[-1]

        run_entry.update(update_fields)
        node_data["status"] = status
        node_data["status_message"] = update_fields.get("status_message", status.capitalize())
        
        return run_entry

    @staticmethod
    def _log_with_fallback(
        wf_logger: Optional[Any], 
        method_name: str, 
        *args, 
        fallback: str = "", 
        **kwargs
    ) -> None:
        """Log using workflow logger with fallback to direct logging."""
        try:
            if wf_logger and hasattr(wf_logger, method_name):
                method = getattr(wf_logger, method_name)
                if callable(method):
                    method(*args, **kwargs)
                else:
                    logger.debug(f"[workflow] Workflow logger method {method_name} is not callable")
                    logger.info(fallback)
            else:
                logger.info(fallback)
        except Exception as e:
            logger.debug(f"[workflow] Failed to use workflow logger method {method_name}: {e}")
            # Still try fallback logging
            try:
                logger.info(fallback)
            except Exception:
                pass  # Final fallback - silent

    @staticmethod
    def start_run(node_id: str, node_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Start execution of a node and record initial status."""
        if not node_id:
            raise ValueError("node_id cannot be empty")
        
        node_data["node_id"] = node_id

        attempt = context.get("retry_count", {}).get(node_id, 0) + 1
        run_data = NodeTracker._record_run(
            node_data,
            status=NodeTracker.STATUS_RUNNING,
            update_fields={},
            new_run=True,
            attempt=attempt,
        )

        wf_logger = NodeTracker._get_workflow_logger(context)
        NodeTracker._log_with_fallback(
            wf_logger,
            "log_node_start",
            node_id,
            fallback=f"[workflow] Starting node: {node_id}"
        )
        
        logger.debug(f"[workflow] Node {node_id} execution started", extra={
            "node_id": node_id,
            "attempt": attempt,
            "run_data": run_data,
            "context": "node_tracker"
        })

        return {"_start_time": time.time()}

    @staticmethod
    def complete_run(node_data: Dict[str, Any], stopwatch: Dict[str, Any], message: str = "Node completed successfully") -> None:
        """Mark a node execution as complete and record success metrics."""
        execution_time = time.time() - stopwatch.get("_start_time", time.time())
        
        run_data = NodeTracker._record_run(
            node_data,
            status=NodeTracker.STATUS_COMPLETE,
            update_fields={
                "completed_at": NodeTracker._now(),
                "execution_time_seconds": execution_time,
                "execution_result": "success",
                "status_message": message,
            }
        )

        node_id = node_data.get("node_id", "(unknown)")
        wf_logger = NodeTracker._get_workflow_logger(node_data)
        
        NodeTracker._log_with_fallback(
            wf_logger,
            "log_node_success",
            node_id,
            exec_time=execution_time,
            fallback=f"[workflow] Node {node_id} completed in {execution_time:.2f}s"
        )
        
        logger.debug(f"[workflow] Node {node_id} completion details", extra={
            "node_id": node_id,
            "execution_time": execution_time,
            "run_data": run_data,
            "context": "node_tracker"
        })

    @staticmethod
    def error_run(node_data: Dict[str, Any], stopwatch: Dict[str, Any], error_message: str) -> None:
        """Mark a node execution as failed and record error details."""
        execution_time = time.time() - stopwatch.get("_start_time", time.time())
        status_msg = f"Node failed: {error_message}"
        
        run_data = NodeTracker._record_run(
            node_data,
            status=NodeTracker.STATUS_ERROR,
            update_fields={
                "completed_at": NodeTracker._now(),
                "execution_time_seconds": execution_time,
                "execution_result": "error",
                "status_message": status_msg,
            }
        )

        node_id = node_data.get("node_id", "(unknown)")
        wf_logger = NodeTracker._get_workflow_logger(node_data)
        
        NodeTracker._log_with_fallback(
            wf_logger,
            "log_node_error",
            node_id,
            err=error_message,
            fallback=f"[workflow] Node {node_id} failed: {error_message}"
        )
        
        logger.debug(f"[workflow] Node {node_id} error details", extra={
            "node_id": node_id,
            "error_message": error_message,
            "execution_time": execution_time,
            "run_data": run_data,
            "context": "node_tracker"
        })

    @staticmethod
    def skip_run(node_data: Dict[str, Any], reason: str = "Node condition evaluated to false") -> None:
        """Mark a node as skipped and record skip reason."""
        now = NodeTracker._now()
        
        run_data = NodeTracker._record_run(
            node_data,
            status=NodeTracker.STATUS_SKIPPED,
            update_fields={
                "started_at": now,
                "completed_at": now,
                "execution_time_seconds": 0.0,
                "execution_result": "skipped",
                "status_message": reason,
            },
            new_run=True
        )

        node_id = node_data.get("node_id", "(unknown)")
        logger.info(f"[workflow] Node {node_id} skipped: {reason}")
        
        logger.debug(f"[workflow] Node {node_id} skip details", extra={
            "node_id": node_id,
            "skip_reason": reason,
            "run_data": run_data,
            "context": "node_tracker"
        })

    @staticmethod
    def pause_run(node_data: Dict[str, Any], reason: str = "Paused due to error handling strategy") -> None:
        """Mark a node as paused and record pause reason."""
        now = NodeTracker._now()
        
        run_data = NodeTracker._record_run(
            node_data,
            status=NodeTracker.STATUS_PAUSED,
            update_fields={
                "started_at": now,
                "completed_at": now,
                "execution_time_seconds": 0.0,
                "execution_result": "paused",
                "status_message": reason,
            },
            new_run=True
        )

        node_id = node_data.get("node_id", "(unknown)")
        logger.info(f"[workflow] Node {node_id} paused: {reason}")
        
        logger.debug(f"[workflow] Node {node_id} pause details", extra={
            "node_id": node_id,
            "pause_reason": reason,
            "run_data": run_data,
            "context": "node_tracker"
        })

    @staticmethod
    def get_performance_metrics(node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract performance metrics from node execution data."""
        runs = node_data.get("execution_info", {}).get("runs", [])
        if not runs:
            return {}
        
        total_time = sum(r.get("execution_time_seconds", 0) for r in runs)
        avg_time = total_time / len(runs) if runs else 0
        
        return {
            "total_executions": len(runs),
            "total_time": total_time,
            "average_time": avg_time,
            "last_execution_time": runs[-1].get("execution_time_seconds", 0),
            "success_count": len([r for r in runs if r.get("execution_result") == "success"]),
            "error_count": len([r for r in runs if r.get("execution_result") == "error"]),
            "skip_count": len([r for r in runs if r.get("execution_result") == "skipped"]),
            "pause_count": len([r for r in runs if r.get("execution_result") == "paused"])
        }

    @staticmethod
    def get_node_summary(node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get a summary of node execution status and metrics."""
        metrics = NodeTracker.get_performance_metrics(node_data)
        
        return {
            "node_id": node_data.get("node_id"),
            "current_status": node_data.get("status"),
            "status_message": node_data.get("status_message"),
            "performance": metrics,
            "last_run": node_data.get("execution_info", {}).get("runs", [])[-1] if node_data.get("execution_info", {}).get("runs") else None
        }


# Backward compatibility alias
StatusTracker = NodeTracker 