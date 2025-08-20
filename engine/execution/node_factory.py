"""
Node Factory - Creates executable nodes from workflow definitions
Updated to work with TypedDict-based state management.
"""

import asyncio
from typing import Dict, Any, Callable, Awaitable
from engine.registry.tool_registry import tool_registry
from engine.execution.workflow_state import WorkflowState
from engine.utils.logging.logger import logger
from engine.utils.templating.placeholder_utils import interpolate_placeholders
from engine.utils.async_utils import await_coroutines_recursively
from engine.utils.execution_utils import execute_with_timeout, create_node_metadata


def create_node_from_tool(node_id: str, node_data: Dict[str, Any]) -> Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]:
    domain = node_data.get("domain")
    operation = node_data.get("operation")

    if not all([domain, operation]):
        raise ValueError(f"Node {node_id} missing required fields: domain, operation")

    tool = tool_registry.get_tool(domain, operation)
    if not tool:
        raise ValueError(f"Tool not found: {domain}.{operation}")

    node_properties = node_data.get("properties", {})
    node_inputs = node_data.get("inputs", {})
    node_outputs = node_data.get("outputs", {})

    async def tool_node(state: Dict[str, Any]) -> Dict[str, Any]:
        workflow_state: WorkflowState = state
        
        logger.info(f"Node {node_id} started")

        # Resolve property placeholders
        resolved_properties = {}
        for property_key, property_value in node_properties.items():
            if isinstance(property_value, str):
                resolved_properties[property_key] = interpolate_placeholders(property_value, workflow_state)
            else:
                resolved_properties[property_key] = property_value

        try:
            # Get timeout from workflow state
            timeout = workflow_state.get("node_timeout", 5.0)

            # Execute tool with timeout handling
            raw_result = await execute_with_timeout(
                tool.ainvoke if hasattr(tool, "ainvoke") else tool.invoke,
                (resolved_properties,),
                timeout=timeout
            )

            # Recursively await any coroutines inside the result
            result = await await_coroutines_recursively(raw_result)

            # Create node metadata and assign result to all output fields
            node_metadata = create_node_metadata(success=True)
            for field_name in node_outputs:
                node_metadata[field_name] = result

            # Ensure outputs exist and update with result
            workflow_state.setdefault("outputs", {})
            workflow_state["outputs"][node_id] = {
                field: node_metadata[field] for field in node_outputs
            }

            # Update general workflow state
            workflow_state["current_node"] = node_id
            workflow_state["success"] = True

            logger.info(f"Node {node_id} completed successfully")
            
            # Ensure the workflow state is properly updated
            return workflow_state

        except asyncio.TimeoutError:
            timeout = workflow_state.get("node_timeout", 5.0)
            error_msg = f"Node {node_id} timed out after {timeout} seconds"
            logger.error(error_msg)
            return handle_node_error(workflow_state, node_id, node_outputs, error_msg, is_timeout=True)

        except Exception as e:
            error_msg = f"Node {node_id} failed: {e}"
            logger.error(error_msg)
            return handle_node_error(workflow_state, node_id, node_outputs, error_msg)

    return tool_node


def handle_node_error(workflow_state, node_id, node_outputs, error_msg, is_timeout=False):
    # Ensure outputs exist
    workflow_state.setdefault("outputs", {})
    
    # Create error metadata
    error_metadata = create_node_metadata(success=False, error=error_msg, timeout=is_timeout)
    
    # Populate output fields with None
    for field in node_outputs.keys():
        error_metadata[field] = None
    
    # Update state
    workflow_state["outputs"][node_id] = {field: None for field in node_outputs}
    workflow_state["current_node"] = node_id
    workflow_state["error"] = error_msg
    workflow_state["success"] = False
    
    # Log
    logger.error(error_msg)
    
    return workflow_state



