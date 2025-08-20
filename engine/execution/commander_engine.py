"""
Commander Engine - Unified workflow execution with TypedDict state management
Replaces WorkflowState system with native Python dictionary operations for LangGraph compatibility.
"""

from typing import Dict, Any, Optional
from langgraph.graph import StateGraph

from engine.execution.workflow_state import WorkflowState, create_initial_state

from engine.execution.graph_builder import create_executable_workflow
from engine.utils.logging.logger import logger as log
from engine.utils.evaluation.workflow_validation import validate_workflow



class CommanderEngine:
    """
    Main workflow execution engine using unified WorkflowState state management.
    
    This engine supports both deterministic and AI-driven execution transparently
    by using a single WorkflowState object that contains both data and conversation history.
    """
    
    def __init__(self):
        self.graph: Optional[StateGraph] = None
        self.compiled_graph = None
        self.workflow_data: Optional[Dict[str, Any]] = None
        
        # Initialize all tools when engine is created
        try:
            from ..registry import register_all_tools
            register_all_tools()
            log.info("All tools registered successfully")
        except Exception as e:
            log.warning(f"Failed to register tools: {e}")
            # Don't fail engine creation, but tools won't be available
    
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
    
    async def create_initial_workflow_state(self, initial_data: Optional[Dict[str, Any]] = None, 
                                           initial_messages: Optional[list] = None) -> WorkflowState:
        """Create an initial workflow state for workflow execution."""
        state = await create_initial_state(
            workflow_data=self.workflow_data,
            initial_data=initial_data,
            messages=initial_messages
        )
        return state
    
    async def execute_workflow(self, initial_workflow_state: Optional[WorkflowState] = None) -> WorkflowState:
        """
        Execute the loaded workflow with the given workflow state.
        
        Args:
            initial_workflow_state: Initial workflow state for execution (creates new one if None)
            
        Returns:
            WorkflowState: Final workflow state after workflow execution
        """
        if not self.compiled_graph:
            raise RuntimeError("No workflow loaded. Call load_workflow() first.")
        
        # Create initial workflow state if not provided
        if initial_workflow_state is None:
            initial_workflow_state = await self.create_initial_workflow_state()
        
        # Execute workflow
        log.info("Starting workflow execution")
        try:
            # Set initial success state
            initial_workflow_state["success"] = False
            initial_workflow_state["current_node"] = None
            
            result = await self.compiled_graph.ainvoke(initial_workflow_state)
            
            # Ensure the result has the expected structure
            if isinstance(result, dict):
                # Set success flag if no errors occurred
                if not result.get("error"):
                    result["success"] = True
                    log.info("Workflow execution completed successfully")
                else:
                    result["success"] = False
                    log.error(f"Workflow execution failed with error: {result.get('error')}")
            else:
                # If result is not a dict, create a proper state
                log.warning(f"Unexpected result type: {type(result)}")
                result = {
                    "success": True,
                    "outputs": result if hasattr(result, 'get') else {},
                    "current_node": "completed"
                }
            
            return result
            
        except Exception as e:
            log.error(f"Workflow execution failed: {e}")
            initial_workflow_state["error"] = str(e)
            initial_workflow_state["success"] = False
            initial_workflow_state["current_node"] = "error"
            return initial_workflow_state
    

    
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
