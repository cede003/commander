from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict
from .logger import log


class StatusTracker:
    """Track and update node status and execution info."""

    @staticmethod
    def _now() -> str:
        return datetime.utcnow().isoformat()

    @staticmethod
    def start_run(node_id: str, node_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Persist node_id on the node data for downstream consumers (e.g., logging)
        node_data["node_id"] = node_id
        node_data["status"] = "running"
        node_data["status_message"] = "Node execution started"
        runs = node_data.setdefault("execution_info", {}).setdefault("runs", [])
        attempt = context.get("retry_count", {}).get(node_id, 0) + 1
        run_data = {
            "attempt": attempt,
            "started_at": StatusTracker._now(),
            "status_message": "Node execution started",
        }
        runs.append(run_data)
        try:
            log.log_node_start(node_id)
            log.debug(run_data)
        except Exception:
            pass
        return {"_start_time": time.time()}

    @staticmethod
    def complete_run(node_data: Dict[str, Any], stopwatch: Dict[str, Any], status_message: str = "Node completed successfully") -> None:
        node_data["status"] = "complete"
        node_data["status_message"] = status_message
        run = node_data["execution_info"]["runs"][-1]
        run_data = {
            "completed_at": StatusTracker._now(),
            "execution_time_seconds": time.time() - stopwatch.get("_start_time", time.time()),
            "execution_result": "success",
            "status_message": status_message,
        }
        run.update(run_data)
        try:
            log.debug(run_data)
        except Exception:
            pass

    @staticmethod
    def error_run(node_data: Dict[str, Any], stopwatch: Dict[str, Any], error_message: str) -> None:
        node_data["status"] = "error"
        msg = f"Node failed: {error_message}"
        node_data["status_message"] = msg
        run = node_data["execution_info"]["runs"][-1]
        run_data = {
            "completed_at": StatusTracker._now(),
            "execution_time_seconds": time.time() - stopwatch.get("_start_time", time.time()),
            "execution_result": "error",
            "status_message": msg,
        }
        run.update(run_data)
        try:
            node_id = node_data.get("node_id", "(unknown)")
            log.log_node_error(node_id, error_message)
            log.debug(run_data)
        except Exception:
            pass

    @staticmethod
    def skip_run(node_data: Dict[str, Any], reason: str = "Node condition evaluated to false") -> None:
        now = StatusTracker._now()
        node_data["status"] = "skipped"
        node_data["status_message"] = reason
        runs = node_data.setdefault("execution_info", {}).setdefault("runs", [])
        run_data = {
            "attempt": len(runs) + 1,
            "started_at": now,
            "completed_at": now,
            "execution_time_seconds": 0.0,
            "execution_result": "skipped",
            "status_message": reason,
        }
        runs.append(run_data)
        try:
            log.debug(run_data)
        except Exception:
            pass

    @staticmethod
    def pause_run(node_data: Dict[str, Any], reason: str = "Paused due to error handling strategy") -> None:
        now = StatusTracker._now()
        node_data["status"] = "paused"
        node_data["status_message"] = reason
        runs = node_data.setdefault("execution_info", {}).setdefault("runs", [])
        run_data = {
            "attempt": len(runs) + 1,
            "started_at": now,
            "completed_at": now,
            "execution_time_seconds": 0.0,
            "execution_result": "skipped",
            "status_message": reason,
        }
        runs.append(run_data)
        try:
            log.debug(run_data)
        except Exception:
            pass