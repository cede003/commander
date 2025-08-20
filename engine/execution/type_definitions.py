"""
Type definitions for the workflow execution engine.
"""

from typing import TypedDict, Dict, Any, List, Optional
from langchain_core.messages import BaseMessage


class MessagesState(TypedDict):
    """State schema for LangGraph workflow execution with messages."""
    messages: List[BaseMessage]
    inputs: Dict[str, Any]
    results: Dict[str, Any]
    current_node: str
    workflow_data: Dict[str, Any]