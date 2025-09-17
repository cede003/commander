"""
Tool Registry - Manages LangChain Tool instances
Updated to work with modular WorkflowState structure.
"""

from typing import Dict, Any, Optional, List
from langchain_core.tools import BaseTool
from engine.utils.logging.logger import logger
from engine.execution.workflow_state import (
    WorkflowState, 
    get_inputs, 
    get_outputs, 
    set_outputs, 
    set_success, 
    set_error
)


class ToolRegistry:
    """Registry for LangChain Tool instances using domain.operation structure"""
    
    def __init__(self):
        self._registry: Dict[str, Dict[str, BaseTool]] = {}
    
    def register_tool(self, domain: str, operation: str, tool: BaseTool):
        """Register a LangChain Tool in the registry using domain.operation structure"""
        if domain not in self._registry:
            self._registry[domain] = {}
        
        self._registry[domain][operation] = tool
        logger.debug(f"Registered Tool: {domain}.{operation}")
    
    def get_tool(self, domain: str, operation: str) -> Optional[BaseTool]:
        """Get a Tool from the registry using domain.operation structure"""
        return self._registry.get(domain, {}).get(operation)
    
    def list_tools(self) -> Dict[str, List[str]]:
        """List all registered tools by domain"""
        result = {}
        for domain, operations in self._registry.items():
            result[domain] = list(operations.keys())
        return result
    
    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools as a flat list"""
        tools = []
        for domain in self._registry.values():
            for tool in domain.values():
                tools.append(tool)
        return tools
    
    def get_tools_by_domain(self, domain: str) -> List[BaseTool]:
        """Get all tools for a specific domain"""
        return list(self._registry.get(domain, {}).values())
    
    def get_tool_by_full_name(self, full_name: str) -> Optional[BaseTool]:
        """Get a tool by its full name (domain.operation)"""
        if '.' in full_name:
            domain, operation = full_name.split('.', 1)
            return self.get_tool(domain, operation)
        return None


# Global registry instance
tool_registry = ToolRegistry()


async def execute_tool(domain: str, operation: str, workflow_state: WorkflowState) -> WorkflowState:
    """
    Execute a tool using the registry with modular WorkflowState structure.
    
    Args:
        domain: Tool domain (e.g., 'browser')
        operation: Tool operation (e.g., 'goto', 'click')
        workflow_state: WorkflowState dictionary containing inputs and state
        
    Returns:
        WorkflowState: Updated workflow state with results
    """
    tool = tool_registry.get_tool(domain, operation)
    
    if not tool:
        raise Exception(f"Tool not found: {domain}.{operation}")

    try:
        # Extract inputs from workflow state
        inputs = get_inputs(workflow_state).copy()
        
        # Execute the tool
        result = await tool.ainvoke(inputs)
        
        # Update workflow state with results
        current_outputs = get_outputs(workflow_state)
        
        if isinstance(result, dict):
            current_outputs.update(result)
        else:
            current_outputs["result"] = result
        
        current_outputs["method"] = f"{domain}.{operation}"
        set_outputs(workflow_state, current_outputs)
        set_success(workflow_state, True)
        
        return workflow_state
        
    except Exception as e:
        set_error(workflow_state, str(e))
        return workflow_state 