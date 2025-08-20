from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, List
from ..logging.logger import logger as logger
from .node_tracker import NodeTracker


class WorkflowTracker:
    """Track and manage workflow-level execution information and node runs."""
    
    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_COMPLETE = "complete"
    STATUS_ERROR = "error"
    STATUS_PAUSED = "paused"
    STATUS_CANCELLED = "cancelled"

    def __init__(self, workflow_id: str, workflow_name: str, run_id: Optional[str] = None):
        """Initialize workflow tracker with workflow metadata."""
        self.workflow_id = workflow_id
        self.workflow_name = workflow_name
        self.run_id = run_id or str(uuid.uuid4())
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.status = self.STATUS_PENDING
        self.status_message = "Workflow initialized"
        
        # Execution tracking
        self.node_trackers: Dict[str, NodeTracker] = {}
        self.execution_history: List[Dict[str, Any]] = []
        self.error_count = 0
        self.success_count = 0
        self.skip_count = 0
        self.pause_count = 0
        
        # Performance metrics
        self.total_nodes = 0
        self.completed_nodes = 0
        self.failed_nodes = 0

    def start_workflow(self) -> None:
        """Mark workflow execution as started."""
        self.start_time = time.time()
        self.status = self.STATUS_RUNNING
        self.status_message = "Workflow execution started"
        
        logger.info(f"[workflow] Starting workflow: {self.workflow_name} (ID: {self.workflow_id}, Run: {self.run_id})")
        logger.debug(f"[workflow] Workflow execution started", extra={
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "start_time": self.start_time,
            "context": "workflow_tracker"
        })

    def complete_workflow(self, message: str = "Workflow completed successfully") -> None:
        """Mark workflow execution as completed."""
        self.end_time = time.time()
        self.status = self.STATUS_COMPLETE
        self.status_message = message
        
        execution_time = self.end_time - self.start_time if self.start_time else 0
        
        logger.info(f"[workflow] Workflow completed: {self.workflow_name} in {execution_time:.2f}s")
        logger.debug(f"[workflow] Workflow completion details", extra={
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "execution_time": execution_time,
            "total_nodes": self.total_nodes,
            "completed_nodes": self.completed_nodes,
            "failed_nodes": self.failed_nodes,
            "context": "workflow_tracker"
        })

    def error_workflow(self, error_message: str) -> None:
        """Mark workflow execution as failed."""
        self.end_time = time.time()
        self.status = self.STATUS_ERROR
        self.status_message = f"Workflow failed: {error_message}"
        
        execution_time = self.end_time - self.start_time if self.start_time else 0
        
        logger.error(f"[workflow] Workflow failed: {self.workflow_name} after {execution_time:.2f}s - {error_message}")
        logger.debug(f"[workflow] Workflow error details", extra={
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "error_message": error_message,
            "execution_time": execution_time,
            "context": "workflow_tracker"
        })

    def pause_workflow(self, reason: str = "Workflow execution paused") -> None:
        """Mark workflow execution as paused."""
        self.status = self.STATUS_PAUSED
        self.status_message = reason
        
        logger.info(f"[workflow] Workflow paused: {self.workflow_name} - {reason}")
        logger.debug(f"[workflow] Workflow pause details", extra={
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "pause_reason": reason,
            "context": "workflow_tracker"
        })

    def cancel_workflow(self, reason: str = "Workflow execution cancelled") -> None:
        """Mark workflow execution as cancelled."""
        self.end_time = time.time()
        self.status = self.STATUS_CANCELLED
        self.status_message = reason
        
        execution_time = self.end_time - self.start_time if self.start_time else 0
        
        logger.info(f"[workflow] Workflow cancelled: {self.workflow_name} after {execution_time:.2f}s - {reason}")
        logger.debug(f"[workflow] Workflow cancellation details", extra={
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "cancel_reason": reason,
            "execution_time": execution_time,
            "context": "workflow_tracker"
        })

    def register_node(self, node_id: str, node_data: Dict[str, Any]) -> None:
        """Register a node for tracking."""
        self.total_nodes += 1
        self.node_trackers[node_id] = NodeTracker()
        
        logger.debug(f"[workflow] Registered node for tracking: {node_id}", extra={
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "total_nodes": self.total_nodes,
            "context": "workflow_tracker"
        })

    def start_node_execution(self, node_id: str, node_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Start tracking a node execution."""
        if node_id not in self.node_trackers:
            self.register_node(node_id, node_data)
        
        # Start node tracking
        stopwatch = NodeTracker.start_run(node_id, node_data, context)
        
        # Record in execution history
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "node_started",
            "node_id": node_id,
            "workflow_status": self.status
        })
        
        return stopwatch

    def complete_node_execution(self, node_id: str, node_data: Dict[str, Any], stopwatch: Dict[str, Any], message: str = "Node completed successfully") -> None:
        """Mark a node execution as completed."""
        NodeTracker.complete_run(node_data, stopwatch, message)
        
        # Update workflow metrics
        self.completed_nodes += 1
        
        # Record in execution history
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "node_completed",
            "node_id": node_id,
            "workflow_status": self.status,
            "execution_time": time.time() - stopwatch.get("_start_time", time.time())
        })
        
        logger.debug(f"[workflow] Node completed: {node_id} (completed: {self.completed_nodes}/{self.total_nodes})", extra={
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "completed_nodes": self.completed_nodes,
            "total_nodes": self.total_nodes,
            "context": "workflow_tracker"
        })

    def error_node_execution(self, node_id: str, node_data: Dict[str, Any], stopwatch: Dict[str, Any], error_message: str) -> None:
        """Mark a node execution as failed."""
        NodeTracker.error_run(node_data, stopwatch, error_message)
        
        # Update workflow metrics
        self.failed_nodes += 1
        self.error_count += 1
        
        # Record in execution history
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "node_error",
            "node_id": node_id,
            "workflow_status": self.status,
            "error_message": error_message,
            "execution_time": time.time() - stopwatch.get("_start_time", time.time())
        })
        
        logger.debug(f"[workflow] Node failed: {node_id} (failed: {self.failed_nodes}/{self.total_nodes})", extra={
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "failed_nodes": self.failed_nodes,
            "total_nodes": self.total_nodes,
            "context": "workflow_tracker"
        })

    def skip_node_execution(self, node_id: str, node_data: Dict[str, Any], reason: str = "Node condition evaluated to false") -> None:
        """Mark a node execution as skipped."""
        NodeTracker.skip_run(node_data, reason)
        
        # Update workflow metrics
        self.skip_count += 1
        
        # Record in execution history
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "node_skipped",
            "node_id": node_id,
            "workflow_status": self.status,
            "skip_reason": reason
        })
        
        logger.debug(f"[workflow] Node skipped: {node_id} (skipped: {self.skip_count})", extra={
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "skip_count": self.skip_count,
            "context": "workflow_tracker"
        })

    def pause_node_execution(self, node_id: str, node_data: Dict[str, Any], reason: str = "Node execution paused") -> None:
        """Mark a node execution as paused."""
        NodeTracker.pause_run(node_data, reason)
        
        # Update workflow metrics
        self.pause_count += 1
        
        # Record in execution history
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "node_paused",
            "node_id": node_id,
            "workflow_status": self.status,
            "pause_reason": reason
        })
        
        logger.debug(f"[workflow] Node paused: {node_id} (paused: {self.pause_count})", extra={
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "pause_count": self.pause_count,
            "context": "workflow_tracker"
        })

    def get_workflow_summary(self) -> Dict[str, Any]:
        """Get a comprehensive summary of workflow execution."""
        execution_time = 0
        if self.start_time:
            end_time = self.end_time or time.time()
            execution_time = end_time - self.start_time
        
        return {
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "run_id": self.run_id,
            "status": self.status,
            "status_message": self.status_message,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "execution_time_seconds": execution_time,
            "total_nodes": self.total_nodes,
            "completed_nodes": self.completed_nodes,
            "failed_nodes": self.failed_nodes,
            "error_count": self.error_count,
            "success_count": self.success_count,
            "skip_count": self.skip_count,
            "pause_count": self.pause_count,
            "completion_percentage": (self.completed_nodes / self.total_nodes * 100) if self.total_nodes > 0 else 0,
            "success_rate": (self.success_count / self.total_nodes * 100) if self.total_nodes > 0 else 0
        }

    def get_node_status_summary(self) -> Dict[str, Any]:
        """Get a summary of all node statuses."""
        node_summaries = {}
        for node_id, node_tracker in self.node_trackers.items():
            # This would need to be implemented based on how node data is stored
            # For now, return basic info
            node_summaries[node_id] = {
                "tracked": True,
                "tracker": node_tracker.__class__.__name__
            }
        
        return {
            "total_tracked_nodes": len(self.node_trackers),
            "node_summaries": node_summaries
        }

    def get_execution_timeline(self) -> List[Dict[str, Any]]:
        """Get a chronological timeline of all execution events."""
        return sorted(self.execution_history, key=lambda x: x["timestamp"])

    def export_execution_data(self) -> Dict[str, Any]:
        """Export complete execution data for analysis or persistence."""
        return {
            "workflow_summary": self.get_workflow_summary(),
            "node_status_summary": self.get_node_status_summary(),
            "execution_timeline": self.get_execution_timeline(),
            "exported_at": datetime.utcnow().isoformat()
        } 