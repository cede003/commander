"""
Utility functions for placeholder interpolation
Updated to work with modular WorkflowState structure.
"""

import re
from typing import Dict, Any


def interpolate_placeholders(s: str, workflow_state: Dict[str, Any]) -> str:
    """Interpolate $variable_name and $outputs.node_id.output_name placeholders."""
    def replace_var(match):
        var_path = match.group(1)
        if var_path.startswith('outputs.'):
            # Handle outputs.path.to.value
            parts = var_path.split('.')
            current = workflow_state["data"]["outputs"]
            for part in parts[1:]:  # Skip 'outputs' part
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return ""
            return str(current) if current is not None else ""
        else:
            # Handle regular inputs
            inputs = workflow_state["data"]["inputs"]
            return str(inputs.get(var_path, ""))
    
    # Simplified regex to avoid nested capturing group issues
    return re.sub(r"\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)", replace_var, s) 