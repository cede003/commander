"""
Utility functions for placeholder interpolation
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
            current = workflow_state
            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return ""
            return str(current) if current is not None else ""
        else:
            # Handle regular inputs
            return str(workflow_state.get("inputs", {}).get(var_path, ""))
    
    # Simplified regex to avoid nested capturing group issues
    return re.sub(r"\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)", replace_var, s) 