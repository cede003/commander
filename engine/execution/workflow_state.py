from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage
from engine.utils.logging.logger import logger
from engine.browser.session_manager import get_browser_session, initialize_browser_session, cleanup_browser_session

# Default timeout for nodes
DEFAULT_NODE_TIMEOUT = 5.0


class WorkflowState(TypedDict, total=False):
    inputs: Dict[str, Any]
    messages: List[BaseMessage]
    success: Optional[bool]
    error: Optional[str]
    current_node: Optional[str]
    metadata: Optional[Dict[str, Any]]
    node_timeout: Optional[float]
    outputs: Optional[Dict[str, Any]]


async def create_initial_state(workflow_data: dict = None, initial_data: dict = None, messages: list = None) -> WorkflowState:
    """Create the initial workflow state"""
    state: WorkflowState = {
        "inputs": {},
        "messages": messages or [],
        "success": False,
        "node_timeout": DEFAULT_NODE_TIMEOUT,
        "outputs": {}
    }

    if initial_data:
        state["inputs"].update(initial_data)

    if workflow_data and "inputs" in workflow_data:
        state["inputs"].update(workflow_data["inputs"])

    return state


def add_message(state: WorkflowState, message: BaseMessage) -> None:
    state.setdefault("messages", []).append(message)


def add_human_message(state: WorkflowState, content: str) -> None:
    from langchain_core.messages import HumanMessage
    add_message(state, HumanMessage(content=content))


def add_ai_message(state: WorkflowState, content: str) -> None:
    from langchain_core.messages import AIMessage
    add_message(state, AIMessage(content=content))


def add_tool_message(state: WorkflowState, content: str, tool_call_id: Optional[str] = None) -> None:
    from langchain_core.messages import ToolMessage
    add_message(state, ToolMessage(content=content, tool_call_id=tool_call_id or "tool"))


__all__ = [
    "WorkflowState",
    "create_initial_state",
    "add_message",
    "add_human_message",
    "add_ai_message",
    "add_tool_message",
]
