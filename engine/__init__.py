"""
Commander Engine - Streamlined workflow execution engine
Provides a clean, efficient interface for executing complex workflows using LangGraph.
"""

# Core execution components
from engine.execution.commander_engine import CommanderEngine

# Import the new TypedDict-based state management
from engine.execution.workflow_state import (
    WorkflowState,
    create_initial_state,
    add_message,
    add_human_message,
    add_ai_message,
    add_tool_message,
)

# Browser session management
from engine.browser.session_manager import (
    BrowserSessionManager,
    session_manager,
    initialize_browser_session,
    get_browser_session,
    get_browser_session_async,
    cleanup_browser_session,
    is_browser_session_ready,
    restart_browser_session,
)

# Registry and tools
from engine.registry.tool_registry import (
    ToolRegistry,
    tool_registry,
    execute_tool,
)

# Browser tools
from engine.browser.browser_tool import BrowserTool
from engine.browser.session import BrowserSession

# Custom functions
from engine.browser.custom_functions import console_log

# Utility functions
from engine.utils.logging.logger import logger
from engine.utils.templating.template_engine import TemplateEngine

# Version and metadata
__version__ = "2.0.0"
__author__ = "Commander Team"
__description__ = "Streamlined workflow execution engine with TypedDict state management"

# Public API
__all__ = [
    # Core engine
    "CommanderEngine",
    
    # State management
    "WorkflowState",
    "create_initial_state",
    "add_message",
    "add_human_message",
    "add_ai_message",
    "add_tool_message",
    
    # Browser session management
    "BrowserSessionManager",
    "session_manager",
    "initialize_browser_session",
    "get_browser_session",
    "get_browser_session_async",
    "cleanup_browser_session",
    "is_browser_session_ready",
    "restart_browser_session",
    
    # Registry
    "ToolRegistry",
    "tool_registry",
    "execute_tool",
    
    # Browser tools
    "BrowserTool",
    "BrowserSession",
    
    # Custom functions
    "console_log",
    
    # Utilities
    "logger",
    "TemplateEngine",
]