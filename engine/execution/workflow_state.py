from typing import TypedDict, List, Dict, Any, Optional, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from engine.utils.logging.logger import logger
from engine.browser.session_manager import get_browser_session, initialize_browser_session, cleanup_browser_session

# Default timeout for nodes
DEFAULT_NODE_TIMEOUT = 5.0


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


def create_initial_state(workflow_data: dict, messages: list = None) -> WorkflowState:
    """Create the initial workflow state with the new modular structure."""
    state: WorkflowState = {
        "execution": {
            "current_node": None,
            "status": "pending",
            "error": None,
            "success": False,
            "retry_count": 0,
            "node_timeout": DEFAULT_NODE_TIMEOUT
        },
        "data": {
            "inputs": {},
            "outputs": {},
            "intermediate": {},
            "page_state": None,
            "metadata": {}
        },
        "memory": {
            "messages": messages or [],
            "variables": {}
        },
        "debug": {
            "log": [],
            "timestamps": {},
            "debug_data": {}
        }
    }

    if workflow_data and "inputs" in workflow_data:
        state["data"]["inputs"].update(workflow_data["inputs"])

    return state


def add_message(state: WorkflowState, message: BaseMessage) -> None:
    """Add a message to the AI memory."""
    state["memory"]["messages"].append(message)


def add_human_message(state: WorkflowState, content: str) -> None:
    """Add a human message to the AI memory."""
    add_message(state, HumanMessage(content=content))


def add_ai_message(state: WorkflowState, content: str) -> None:
    """Add an AI message to the AI memory."""
    add_message(state, AIMessage(content=content))


def add_tool_message(state: WorkflowState, content: str, tool_call_id: Optional[str] = None) -> None:
    """Add a tool message to the AI memory."""
    add_message(state, ToolMessage(content=content, tool_call_id=tool_call_id or "tool"))


# Helper functions for accessing and updating the new state structure
def get_current_node(state: WorkflowState) -> Optional[str]:
    """Get the current node from the execution context."""
    return state["execution"]["current_node"]


def set_current_node(state: WorkflowState, node_id: str) -> None:
    """Set the current node in the execution context."""
    state["execution"]["current_node"] = node_id


def get_success(state: WorkflowState) -> Optional[bool]:
    """Get the success status from the execution context."""
    return state["execution"]["success"]


def set_success(state: WorkflowState, success: bool) -> None:
    """Set the success status in the execution context."""
    state["execution"]["success"] = success
    state["execution"]["status"] = "success" if success else "error"


def get_error(state: WorkflowState) -> Optional[str]:
    """Get the error from the execution context."""
    return state["execution"]["error"]


def set_error(state: WorkflowState, error: str) -> None:
    """Set the error in the execution context."""
    state["execution"]["error"] = error
    state["execution"]["status"] = "error"
    state["execution"]["success"] = False


def get_inputs(state: WorkflowState) -> Dict[str, Any]:
    """Get the inputs from the workflow data."""
    return state["data"]["inputs"]


def get_outputs(state: WorkflowState) -> Dict[str, Any]:
    """Get the outputs from the workflow data."""
    return state["data"]["outputs"]


def set_outputs(state: WorkflowState, outputs: Dict[str, Any]) -> None:
    """Set the outputs in the workflow data."""
    state["data"]["outputs"] = outputs


def get_node_timeout(state: WorkflowState) -> float:
    """Get the node timeout from the execution context."""
    return state["execution"]["node_timeout"]


def set_node_timeout(state: WorkflowState, timeout: float) -> None:
    """Set the node timeout in the execution context."""
    state["execution"]["node_timeout"] = timeout


def add_log_entry(state: WorkflowState, entry: str) -> None:
    """Add a log entry to the debug info."""
    state["debug"]["log"].append(entry)


def add_timestamp(state: WorkflowState, key: str, timestamp: Any) -> None:
    """Add a timestamp to the debug info."""
    state["debug"]["timestamps"][key] = timestamp


def get_messages(state: WorkflowState) -> List[BaseMessage]:
    """Get the messages from the AI memory."""
    return state["memory"]["messages"]


def set_messages(state: WorkflowState, messages: List[BaseMessage]) -> None:
    """Set the messages in the AI memory."""
    state["memory"]["messages"] = messages

def get_status(state: WorkflowState) -> str:
    return state["execution"]["status"]

def set_status(state: WorkflowState, status: str):
    state["execution"]["status"] = status


__all__ = [
    "WorkflowState",
    "ExecutionContext",
    "WorkflowData",
    "AIMemory",
    "DebugInfo",
    "create_initial_state",
    "add_message",
    "add_human_message",
    "add_ai_message",
    "add_tool_message",
    "get_current_node",
    "set_current_node",
    "get_success",
    "set_success",
    "get_error",
    "set_error",
    "get_inputs",
    "get_outputs",
    "set_outputs",
    "get_node_timeout",
    "set_node_timeout",
    "add_log_entry",
    "add_timestamp",
    "get_messages",
    "set_messages",
]
