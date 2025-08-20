"""
Registry Package - Tool registry and specifications
"""

# Tool registry imports
from .tool_registry import tool_registry, execute_tool

# Tool factory imports
from .tool_factory import ToolFactory

def register_all_tools():
    """Register all available tools in the registry"""
    factory = ToolFactory()
    # The ToolFactory constructor automatically registers all tools
    return factory

__all__ = [
    # Tool registry exports
    'tool_registry',
    'execute_tool',
    
    # Tool factory exports
    'ToolFactory',
    'register_all_tools',
] 