"""
Workflow validation utilities - extracted from commander_engine.py
"""

from typing import Dict, Any


def validate_workflow(workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate workflow data structure."""
    if not workflow_data:
        return {"valid": False, "error": "No workflow data"}
    
    try:
        # Check required fields
        required_fields = ["nodes", "edges"]
        for field in required_fields:
            if field not in workflow_data:
                return {"valid": False, "error": f"Missing required field: {field}"}
        
        # Validate edges reference existing nodes
        nodes = workflow_data.get("nodes", {})
        edges = workflow_data.get("edges", [])
        node_ids = set(nodes.keys())
        
        for edge in edges:
            from_node = edge.get("from")
            to_node = edge.get("to")
            
            if from_node and from_node not in node_ids:
                return {"valid": False, "error": f"Edge references non-existent node: {from_node}"}
            if to_node and to_node not in node_ids:
                return {"valid": False, "error": f"Edge references non-existent node: {to_node}"}
        
        return {"valid": True, "message": "Workflow is valid"}
        
    except Exception as e:
        return {"valid": False, "error": f"Validation failed: {e}"}
