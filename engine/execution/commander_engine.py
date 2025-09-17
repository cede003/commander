"""
Commander Engine - Main workflow execution engine
Updated to work with modular WorkflowState structure.
"""

import asyncio
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, END
from engine.execution.workflow_state import (
    WorkflowState, 
    create_initial_state,
    set_status,
    set_success,
    set_current_node,
    set_error,
    add_log_entry
)
from engine.execution.graph_builder import create_executable_workflow
from engine.utils.evaluation.workflow_validation import validate_workflow
from engine.utils.logging.logger import WorkflowLogger, logger as log
from engine.registry import register_all_tools



class CommanderEngine:
    """
    Main workflow execution engine that manages workflow loading and execution.
    """
    
    def __init__(self):
        """Initialize the Commander Engine."""
        # Initialize tools first
        log.info("Initializing tool registry...")
        register_all_tools()
        
        self.workflow_data: Optional[Dict[str, Any]] = None
        self.graph: Optional[StateGraph] = None
        self.compiled_graph: Optional[Any] = None
    
    def load_workflow(self, workflow_json: Dict[str, Any]) -> None:
        """
        Load a workflow definition into the engine.
        
        Args:
            workflow_json: Workflow definition as a dictionary
        """
        self.workflow_data = workflow_json
        validation = validate_workflow(workflow_json)
        if not validation["valid"]:
            raise ValueError(validation["error"])
        self.graph = create_executable_workflow(workflow_json)
        self.compiled_graph = self.graph.compile()
        log.info(f"Loaded workflow: {workflow_json.get('metadata', {}).get('name', 'Unknown')}")
    
    def create_initial_workflow_state(self, messages: Optional[list] = None) -> WorkflowState:
        """
        Create an initial workflow state from the loaded workflow data.
        
        Args:
            messages: Optional initial messages for the AI memory
            
        Returns:
            WorkflowState: Initial workflow state initialized from workflow data
            
        Raises:
            RuntimeError: If no workflow is loaded
        """
        if not self.workflow_data:
            raise RuntimeError("No workflow loaded. Call load_workflow() first.")
            
        state = create_initial_state(
            workflow_data=self.workflow_data,
            messages=messages
        )
        return state
    
    async def execute_workflow(self, workflow_state: WorkflowState) -> WorkflowState:
        """
        Execute the loaded workflow with the given workflow state.
        
        Args:
            workflow_state: Workflow state to execute (must be initialized from workflow data)
            
        Returns:
            WorkflowState: Final workflow state after workflow execution
            
        Raises:
            RuntimeError: If no workflow is loaded
            ValueError: If workflow_state is not properly initialized
        """
        if not self.compiled_graph:
            raise RuntimeError("No workflow loaded. Call load_workflow() first.")
        
        # Validate that the workflow state has the expected structure
        if not isinstance(workflow_state, dict) or "execution" not in workflow_state:
            raise ValueError("workflow_state must be a properly initialized WorkflowState")
        
        # Execute workflow
        log.info("Starting workflow execution")
        try:
            # Set initial execution state
            set_success(workflow_state, False)
            set_current_node(workflow_state, None)
            add_log_entry(workflow_state, "Workflow execution started")
            set_status(workflow_state, "running")
            log.info(f"Workflow state: {workflow_state}")
            result = await self.compiled_graph.ainvoke(workflow_state)
            
            # Ensure the result has the expected structure
            if isinstance(result, dict):
                # Set success flag if no errors occurred
                if not result.get("execution", {}).get("error"):
                    set_success(result, True)
                    add_log_entry(result, "Workflow execution completed successfully")
                    log.info("Workflow execution completed successfully")
                else:
                    set_success(result, False)
                    error_msg = result.get("execution", {}).get("error", "Unknown error")
                    add_log_entry(result, f"Workflow execution failed: {error_msg}")
                    log.error(f"Workflow execution failed with error: {error_msg}")
            else:
                raise ValueError(f"Unexpected result type: {type(result)}")
            
            return result
            
        except Exception as e:
            log.error(f"Workflow execution failed: {e}")
            set_error(workflow_state, str(e))
            set_current_node(workflow_state, "error")
            add_log_entry(workflow_state, f"Workflow execution failed with exception: {e}")
            return workflow_state
    

    
    def get_workflow_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded workflow.
        
        Returns:
            Dict containing workflow metadata and structure
        """
        if not self.workflow_data:
            return {"error": "No workflow loaded"}
        
        nodes = self.workflow_data.get("nodes", {})
        edges = self.workflow_data.get("edges", [])
        
        return {
            "metadata": self.workflow_data.get("metadata", {}),
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": list(nodes.keys()),
            "inputs": self.workflow_data.get("inputs", {})
        }
