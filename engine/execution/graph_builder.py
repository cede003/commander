"""
Graph Builder - Creates executable workflows from workflow definitions
Updated to work with modular WorkflowState structure.
"""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from engine.execution.node_factory import create_node_from_tool
from engine.execution.workflow_state import WorkflowState, set_error, set_success
from engine.utils.logging.logger import logger


def create_executable_workflow(workflow_json: Dict[str, Any], initial_workflow_state: WorkflowState = None) -> StateGraph:
    """Create an executable workflow using LangGraph's executor with modular WorkflowState structure"""
    
    # Create the state graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes to the graph
    nodes = workflow_json.get("nodes", {})
    for node_id, node_data in nodes.items():
        try:
            node_function = create_node_from_tool(node_id, node_data)
            workflow.add_node(node_id, node_function)
        except Exception as e:
            # If tool creation fails, create a placeholder node that logs the error
            error_message = f"Tool creation failed for {node_id}: {e}"
            async def placeholder_node(state: WorkflowState) -> WorkflowState:
                set_error(state, error_message)
                set_success(state, False)
                return state
            
            workflow.add_node(node_id, placeholder_node)
    
    # Add edges to the graph
    edges = workflow_json.get("edges", [])
    logger.info(f"Processing {len(edges)} edges")
    
    for edge in edges:
        # Support multiple edge formats for backward compatibility
        source = edge.get("source") or edge.get("from")
        target = edge.get("target") or edge.get("to")
        
        if source and target:
            logger.info(f"Adding edge {source} -> {target}")
            workflow.add_edge(source, target)
        else:
            logger.warning(f"Skipping invalid edge: {edge}")
    
    # Set entry point
    if nodes:
        first_node = list(nodes.keys())[0]
        workflow.set_entry_point(first_node)
        logger.info(f"Entry point set to {first_node}")
    
    # Find nodes that should connect to END
    # A node should connect to END if it has no outgoing edges (is a leaf node)
    # OR if it's the last node in the execution order
    nodes_to_end = set()
    
    # First, identify all nodes that have outgoing edges
    nodes_with_outgoing = set()
    for edge in edges:
        source = edge.get("source") or edge.get("from")
        if source:
            nodes_with_outgoing.add(source)
    
    # Find leaf nodes (nodes with no outgoing edges)
    for node_id in nodes.keys():
        if node_id not in nodes_with_outgoing:
            nodes_to_end.add(node_id)
            logger.info(f"Leaf node {node_id} will connect to END")
    
    # If no leaf nodes found, connect the last node in the edge sequence to END
    if not nodes_to_end and edges:
        # Find the last node in the execution sequence
        last_node = None
        for edge in edges:
            target = edge.get("target") or edge.get("to")
            if target:
                last_node = target
        
        if last_node:
            nodes_to_end.add(last_node)
            logger.info(f"Last execution node {last_node} will connect to END")
    
    # If still no nodes to END, connect the first node to END (single node workflow)
    if not nodes_to_end and nodes:
        first_node = list(nodes.keys())[0]
        nodes_to_end.add(first_node)
        logger.info(f"Single node workflow, connecting {first_node} to END")
    
    # Connect identified nodes to END
    for node_id in nodes_to_end:
        logger.info(f"Connecting {node_id} to END")
        workflow.add_edge(node_id, END)
    
    # If no edges were defined at all, connect the first node to END
    if not edges and nodes:
        first_node = list(nodes.keys())[0]
        logger.info(f"No edges defined, connecting {first_node} to END")
        workflow.add_edge(first_node, END)
    
    return workflow

