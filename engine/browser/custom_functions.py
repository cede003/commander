"""
Custom Actions - Complex actions with business logic and domain-specific automation
Updated to work with the new tool registration system.
"""

from typing import Dict, Any
from langchain_core.tools import tool
from engine.utils.logging.logger import logger
from engine.registry.tool_registry import tool_registry

def register_tool(domain: str, operation: str):
    """Custom decorator that registers the tool with our registry."""
    def decorator(func):
        # Create the BaseTool object
        tool_obj = tool(func)
        # Register it with our registry
        tool_registry.register_tool(domain, operation, tool_obj)
        # Return the original function (not the tool object)
        return func
    return decorator

@register_tool(domain="browser", operation="console_log")
def console_log(message: str = "No message provided", level: str = "info") -> str:
    """Log a message to console via unified logger"""
    if level == "debug":
        logger.debug(message)
    elif level in ("warn", "warning"):
        logger.warning(message)
    elif level == "error":
        logger.error(message)
    else:
        logger.info(message)

    return f"Logged: {message}"
