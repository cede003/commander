"""
Utility for displaying node status information
"""

import json
from typing import Dict, Any
from datetime import datetime
from utils.logger import log


def format_node_status(node_id: str, node_data: Dict[str, Any]) -> str:
    """Format a single node's status information"""
    status = node_data.get('status', 'unknown')
    status_message = node_data.get('status_message', '')
    started_at = node_data.get('started_at', '')
    completed_at = node_data.get('completed_at', '')
    execution_time = node_data.get('execution_time', 0)
    
    # Status emoji mapping
    status_emojis = {
        'queued': '⏳',
        'running': '🔄',
        'complete': '✅',
        'error': '❌',
        'skipped': '⏭️',
        'paused': '⏸️'
    }
    
    emoji = status_emojis.get(status, '❓')
    
    # Format timestamps
    started_str = f"Started: {started_at}" if started_at else ""
    completed_str = f"Completed: {completed_at}" if completed_at else ""
    time_str = f"Time: {execution_time:.2f}s" if execution_time else ""
    
    # Build status line
    status_line = f"{emoji} {node_id}: {status.upper()}"
    if status_message:
        status_line += f" - {status_message}"
    
    # Add timing info
    if started_str or completed_str or time_str:
        timing_info = [info for info in [started_str, completed_str, time_str] if info]
        status_line += f" ({', '.join(timing_info)})"
    
    return status_line


def display_workflow_status(workflow_data: Dict[str, Any]) -> str:
    """Display status for all nodes in a workflow"""
    nodes = workflow_data.get('nodes', {})
    
    if not nodes:
        return "No nodes found in workflow"
    
    status_lines = []
    status_lines.append("📊 Workflow Node Status:")
    status_lines.append("=" * 50)
    
    for node_id, node_data in nodes.items():
        status_line = format_node_status(node_id, node_data)
        status_lines.append(status_line)
    
    return "\n".join(status_lines)


def get_node_status_summary(workflow_data: Dict[str, Any]) -> Dict[str, int]:
    """Get a summary of node statuses"""
    nodes = workflow_data.get('nodes', {})
    summary = {
        'queued': 0,
        'running': 0,
        'complete': 0,
        'error': 0,
        'skipped': 0,
        'paused': 0,
        'total': len(nodes)
    }
    
    for node_data in nodes.values():
        status = node_data.get('status', 'unknown')
        if status in summary:
            summary[status] += 1
    
    return summary


def print_workflow_status(workflow_data: Dict[str, Any]):
    """Print workflow status to console at debug level"""
    status_display = display_workflow_status(workflow_data)
    log.debug("Workflow Status Display:")
    log.debug(status_display)
    
    summary = get_node_status_summary(workflow_data)
    summary_text = f"""📈 Status Summary:
  Total nodes: {summary['total']}
  Complete: {summary['complete']}
  Error: {summary['error']}
  Skipped: {summary['skipped']}
  Running: {summary['running']}
  Queued: {summary['queued']}"""
    
    log.debug(summary_text)


if __name__ == "__main__":
    # Example usage
    example_workflow = {
        "nodes": {
            "node1": {
                "id": "node1",
                "status": "complete",
                "status_message": "Successfully executed",
                "started_at": "2024-01-01T10:00:00",
                "completed_at": "2024-01-01T10:00:05",
                "execution_time": 5.2
            },
            "node2": {
                "id": "node2",
                "status": "error",
                "status_message": "Element not found",
                "started_at": "2024-01-01T10:00:05",
                "completed_at": "2024-01-01T10:00:06",
                "execution_time": 1.1
            }
        }
    }
    
    print_workflow_status(example_workflow) 