"""
Template Engine - Process template variables in workflow inputs
"""

import re
from typing import Dict, Any


class TemplateEngine:
    """Process template variables like {{inputs.xyz}} in workflow inputs"""
    
    # Regex pattern for template variables
    TEMPLATE_PATTERN = r'\{\{([^}]+)\}\}'
    
    @staticmethod
    def process_template_variables(inputs: Dict, context: Dict) -> Dict:
        """Process template variables in inputs using context data"""
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
        """Process template variables in a string"""
        if '{{' not in value:
            return value
        
        def replace_template(match):
            template_expr = match.group(1).strip()
            return TemplateEngine._evaluate_template(template_expr, context)
        
        return re.sub(TemplateEngine.TEMPLATE_PATTERN, replace_template, value)
    
    @staticmethod
    def _evaluate_template(expr: str, context: Dict) -> str:
        """Evaluate a template expression"""
        try:
            # Handle different template variable types
            if expr.startswith('inputs.'):
                # {{inputs.field_name}}
                field_name = expr[7:]  # Remove 'inputs.'
                inputs = context.get('inputs', {})
                if field_name in inputs:
                    return str(inputs[field_name])
                else:
                    print(f"⚠️  Template variable not found: {expr}")
                    return f"{{{{{expr}}}}}"
            
            elif expr.startswith('results.'):
                # {{results.field_name}}
                field_name = expr[8:]  # Remove 'results.'
                results = context.get('results', {})
                if field_name in results:
                    return str(results[field_name])
                else:
                    print(f"⚠️  Template variable not found: {expr}")
                    return f"{{{{{expr}}}}}"
            
            elif expr.startswith('properties.'):
                # {{properties.field_name}}
                field_name = expr[11:]  # Remove 'properties.'
                properties = context.get('properties', {})
                if field_name in properties:
                    return str(properties[field_name])
                else:
                    print(f"⚠️  Template variable not found: {expr}")
                    return f"{{{{{expr}}}}}"
            
            elif expr.startswith('session.'):
                # {{session.field_name}}
                field_name = expr[8:]  # Remove 'session.'
                session = context.get('session')
                if session and hasattr(session, field_name):
                    value = getattr(session, field_name)
                    return str(value)
                else:
                    print(f"⚠️  Session property not found: {expr}")
                    return f"{{{{{expr}}}}}"
            
            else:
                # Try to access nested properties with dot notation
                parts = expr.split('.')
                current = context
                
                for part in parts:
                    if isinstance(current, dict) and part in current:
                        current = current[part]
                    else:
                        print(f"⚠️  Template variable not found: {expr}")
                        return f"{{{{{expr}}}}}"
                
                return str(current)
                
        except Exception as e:
            print(f"❌ Error evaluating template {expr}: {e}")
            return f"{{{{{expr}}}}}"
    
    @staticmethod
    def extract_template_variables(text: str) -> list:
        """Extract all template variables from a string"""
        matches = re.findall(TemplateEngine.TEMPLATE_PATTERN, text)
        return [match.strip() for match in matches]
    
    @staticmethod
    def has_template_variables(data: Any) -> bool:
        """Check if data contains any template variables"""
        if isinstance(data, str):
            return '{{' in data
        elif isinstance(data, dict):
            return any(TemplateEngine.has_template_variables(value) for value in data.values())
        elif isinstance(data, list):
            return any(TemplateEngine.has_template_variables(item) for item in data)
        else:
            return False
    
    @staticmethod
    def validate_template_variables(inputs: Dict, context: Dict) -> list:
        """Validate that all template variables can be resolved"""
        missing_vars = []
        
        def check_value(value):
            if isinstance(value, str):
                variables = TemplateEngine.extract_template_variables(value)
                for var in variables:
                    if not TemplateEngine._can_resolve_variable(var, context):
                        missing_vars.append(var)
            elif isinstance(value, dict):
                for v in value.values():
                    check_value(v)
            elif isinstance(value, list):
                for item in value:
                    check_value(item)
        
        check_value(inputs)
        return missing_vars
    
    @staticmethod
    def _can_resolve_variable(expr: str, context: Dict) -> bool:
        """Check if a template variable can be resolved"""
        try:
            if expr.startswith('inputs.'):
                field_name = expr[7:]
                return field_name in context.get('inputs', {})
            elif expr.startswith('results.'):
                field_name = expr[8:]
                return field_name in context.get('results', {})
            elif expr.startswith('properties.'):
                field_name = expr[11:]
                return field_name in context.get('properties', {})
            elif expr.startswith('session.'):
                field_name = expr[8:]
                session = context.get('session')
                return session and hasattr(session, field_name)
            else:
                # Try nested access
                parts = expr.split('.')
                current = context
                for part in parts:
                    if isinstance(current, dict) and part in current:
                        current = current[part]
                    else:
                        return False
                return True
        except:
            return False 