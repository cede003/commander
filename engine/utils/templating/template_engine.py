"""
Template Engine - Process template variables in workflow inputs using Jinja2
"""

import copy
import sys
from typing import Dict, Any
from jinja2 import Template
from engine.utils.logging.logger import logger


class TemplateEngine:
    """Process template variables like {{inputs.xyz}} in workflow inputs using Jinja2"""
    
    @staticmethod
    def apply_templating(workflow_json: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Apply Jinja2 templating to workflow nodes using the provided inputs.
        
        This replaces placeholders like {{inputs.foo}} in the workflow with actual values.
        """
        if inputs is None:
            inputs = {}
            
        templated = copy.deepcopy(workflow_json)
        
        # Create template context with both external inputs and workflow's own inputs
        template_context = {
            "inputs": inputs,  # External inputs (user-provided)
            "workflow_inputs": workflow_json.get("inputs", {}),  # Workflow's default inputs
            "workflow_data": workflow_json  # Full workflow data for fallback
        }
        
        for node_id, node_data in templated.get("nodes", {}).items():
            if "inputs" in node_data:
                # Apply Jinja2 templating to all input strings
                for key, val in node_data["inputs"].items():
                    if isinstance(val, str):
                        try:
                            template = Template(val)
                            node_data["inputs"][key] = template.render(**template_context)
                        except Exception as e:
                            # If templating fails, keep the original value
                            logger.warning(f"Template rendering failed for {key}: {e}")
                            node_data["inputs"][key] = val
                            print(f"DEBUG: Template rendering failed for {key}: {e}")
        
        return templated
    
    @staticmethod
    def process_template_variables(inputs: Dict, context: Dict) -> Dict:
        """Process template variables in inputs using context data (legacy method)"""
        processed = {}
        
        for key, value in inputs.items():
            if isinstance(value, str):
                processed[key] = TemplateEngine._process_string(value, context)
            elif isinstance(value, dict):
                processed[key] = TemplateEngine._process_template_variables(value, context)
            elif isinstance(value, list):
                processed[key] = [
                    TemplateEngine._process_template_variables(item, context) if isinstance(item, dict)
                    else TemplateEngine._process_string(item, context) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                processed[key] = value
        
        return processed
    
    @staticmethod
    def _process_string(value: str, context: Dict) -> str:
        """Process template variables in a string using Jinja2"""
        if '{{' not in value:
            return value
        
        try:
            template = Template(value)
            return template.render(**context)
        except Exception as e:
            logger.warning(f"Template rendering failed for '{value}': {e}")
            return value 