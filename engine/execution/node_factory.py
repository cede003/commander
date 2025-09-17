"""
Node Factory - Creates executable nodes from workflow definitions
Updated to work with modular WorkflowState structure.
"""

import asyncio
from typing import Dict, Any, Callable, Awaitable
from engine.registry.tool_registry import tool_registry
from engine.execution.workflow_state import (
    WorkflowState, 
    get_current_node, 
    set_current_node, 
    get_success, 
    set_success, 
    get_error, 
    set_error, 
    get_outputs, 
    set_outputs, 
    get_node_timeout,
    add_log_entry
)
from engine.utils.logging.logger import logger
from engine.utils.templating.placeholder_utils import interpolate_placeholders
from engine.utils.async_utils import await_coroutines_recursively
from engine.utils.execution_utils import execute_with_timeout, create_node_metadata


def _validate_node_data(node_id: str, node_data: Dict[str, Any]) -> None:
    """Validate that node data contains required fields."""
    domain = node_data.get("domain")
    operation = node_data.get("operation")

    if not all([domain, operation]):
        raise ValueError(f"Node {node_id} missing required fields: domain, operation")


def _get_tool(domain: str, operation: str):
    """Get tool from registry and validate it exists."""
    tool = tool_registry.get_tool(domain, operation)
    if not tool:
        raise ValueError(f"Tool not found: {domain}.{operation}")
    return tool


def _resolve_arguments(node_arguments: Dict[str, Any], workflow_state: WorkflowState) -> Dict[str, Any]:
    """Resolve placeholder values in node arguments."""
    resolved_arguments = {}
    for argument_key, argument_value in node_arguments.items():
        if isinstance(argument_value, str):
            resolved_arguments[argument_key] = interpolate_placeholders(argument_value, workflow_state)
        else:
            resolved_arguments[argument_key] = argument_value
    return resolved_arguments


def _execute_tool_with_timeout(tool, resolved_arguments: Dict[str, Any], timeout: float):
    """Execute tool with timeout handling."""
    return execute_with_timeout(
        tool.ainvoke if hasattr(tool, "ainvoke") else tool.invoke,
        (resolved_arguments,),
        timeout=timeout
    )


def _update_workflow_state_success(workflow_state: WorkflowState, node_id: str, 
                                 node_outputs: Dict[str, Any], result: Any) -> WorkflowState:
    """Update workflow state after successful node execution."""
    # Create node metadata and assign result to all output fields
    node_metadata = create_node_metadata(success=True)
    for field_name in node_outputs:
        node_metadata[field_name] = result

    # Get current outputs and update with result
    current_outputs = get_outputs(workflow_state)
    current_outputs[node_id] = {
        field: node_metadata[field] for field in node_outputs
    }
    set_outputs(workflow_state, current_outputs)

    # Update execution context
    set_current_node(workflow_state, node_id)
    set_success(workflow_state, True)
    
    # Add log entry with output if available
    entry = f"Node {node_id} completed successfully"
    output_entry = f" with output {result}" if result and result != {} else ""
    add_log_entry(workflow_state, f"{entry}{output_entry}")
    logger.info(f"{entry}{output_entry}")
    return workflow_state


def create_node_from_tool(node_id: str, node_data: Dict[str, Any]) -> Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]:
    """Create an executable node function from tool definition."""
    # Validate input data
    _validate_node_data(node_id, node_data)
    
    # Get tool and node configuration
    tool = _get_tool(node_data["domain"], node_data["operation"])
    node_arguments = node_data.get("arguments", {})
    node_outputs = node_data.get("outputs", {})

    async def tool_node(state: Dict[str, Any]) -> Dict[str, Any]:
        workflow_state: WorkflowState = state
        
        logger.info(f"Node {node_id} started")

        try:
            # Resolve argument placeholders
            resolved_arguments = _resolve_arguments(node_arguments, workflow_state)

            # Get timeout and execute tool
            timeout = get_node_timeout(workflow_state)
            raw_result = await _execute_tool_with_timeout(tool, resolved_arguments, timeout)

            # Recursively await any coroutines inside the result
            result = await await_coroutines_recursively(raw_result)

            # Update workflow state with success
            workflow_state = _update_workflow_state_success(workflow_state, node_id, node_outputs, result)

            return workflow_state

        except asyncio.TimeoutError:
            timeout = get_node_timeout(workflow_state)
            error_msg = f"Node {node_id} timed out after {timeout} seconds"
            logger.error(error_msg)
            return handle_node_error(workflow_state, node_id, node_outputs, error_msg, is_timeout=True)

        except Exception as e:
            error_msg = f"Node {node_id} failed: {e}"
            logger.error(error_msg)
            return handle_node_error(workflow_state, node_id, node_outputs, error_msg)

    return tool_node


def handle_node_error(workflow_state: WorkflowState, node_id: str, node_outputs: Dict[str, Any], 
                     error_msg: str, is_timeout: bool = False) -> WorkflowState:
    """Handle node execution errors and update workflow state accordingly."""
    # Get current outputs and update with error metadata
    current_outputs = get_outputs(workflow_state)
    
    # Create error metadata
    error_metadata = create_node_metadata(success=False, error=error_msg, timeout=is_timeout)
    
    # Populate output fields with None
    for field in node_outputs.keys():
        error_metadata[field] = None
    
    # Update outputs
    current_outputs[node_id] = {field: None for field in node_outputs}
    set_outputs(workflow_state, current_outputs)
    
    # Update execution context
    set_current_node(workflow_state, node_id)
    set_error(workflow_state, error_msg)
    
    # Add log entry
    add_log_entry(workflow_state, f"Node {node_id} failed: {error_msg}")
    
    # Log
    logger.error(error_msg)
    
    return workflow_state


