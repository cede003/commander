"""
Type definitions for the workflow execution engine.
Updated to align with modular WorkflowState structure.
"""

from typing import TypedDict, Dict, Any, List, Optional, Literal
from langchain_core.messages import BaseMessage


class ExecutionContext(TypedDict, total=False):
    """Execution control and tracking information."""
    current_node: Optional[str]
    status: Literal["running", "error", "success", "pending"]
    error: Optional[str]
    success: Optional[bool]
    retry_count: int
    node_timeout: float


class WorkflowData(TypedDict, total=False):
    """Inputs, outputs, and intermediate workflow data."""
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    intermediate: Dict[str, Any]
    page_state: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]


class AIMemory(TypedDict, total=False):
    """AI context and variable interpolation state."""
    messages: List[BaseMessage]
    variables: Dict[str, Any]


class DebugInfo(TypedDict, total=False):
    """Debug information, logs, and timestamps."""
    log: List[str]
    timestamps: Dict[str, Any]
    debug_data: Optional[Dict[str, Any]]


class WorkflowState(TypedDict, total=False):
    """Refactored workflow state with clean separation of concerns."""
    execution: ExecutionContext
    data: WorkflowData
    memory: AIMemory
    debug: DebugInfo