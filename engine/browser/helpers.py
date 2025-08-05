"""
Browser Helpers - Auto-wrapper and utility functions
"""

from typing import Dict, Any, List
import sys
import os

# Add engine directory to path for absolute imports
engine_path = os.path.join(os.path.dirname(__file__), '..')
if engine_path not in sys.path:
    sys.path.insert(0, engine_path)

try:
    from utils.playwright_helpers import PlaywrightHelpers
    from registry.central_spec import get_required_inputs
except ImportError:
    # Fallback for when run from engine directory
    from ..utils.playwright_helpers import PlaywrightHelpers
    from ..registry.central_spec import get_required_inputs


async def auto_action(inputs: Dict, context: Dict, method: str) -> Dict[str, Any]:
    """Auto wrapper for browser actions"""
    # Get required inputs from central spec
    required_inputs = get_required_inputs("browser", "action", method)
    if required_inputs:
        PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
    
    page = PlaywrightHelpers.get_session_page(context)
    return await PlaywrightHelpers.call_playwright_method(page, method, inputs, context)


async def auto_observation(inputs: Dict, context: Dict, method: str) -> Dict[str, Any]:
    """Auto wrapper for browser observations"""
    # Get required inputs from central spec
    required_inputs = get_required_inputs("browser", "observation", method)
    if required_inputs:
        PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
    
    page = PlaywrightHelpers.get_session_page(context)
    return await PlaywrightHelpers.call_playwright_method(page, method, inputs, context)


async def auto_event(inputs: Dict, context: Dict, method: str) -> Dict[str, Any]:
    """Auto wrapper for browser events"""
    # Get required inputs from central spec
    required_inputs = get_required_inputs("browser", "event", method)
    if required_inputs:
        PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
    
    page = PlaywrightHelpers.get_session_page(context)
    return await PlaywrightHelpers.call_playwright_method(page, method, inputs, context)


async def auto_notification(inputs: Dict, context: Dict, method: str) -> Dict[str, Any]:
    """Auto wrapper for browser notifications"""
    # Get required inputs from central spec
    required_inputs = get_required_inputs("browser", "notification", method)
    if required_inputs:
        PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
    
    # Handle different notification types
    if method == "console_log":
        message = inputs.get('message', '')
        level = inputs.get('level', 'info')
        
        # Log with appropriate level
        if level == 'error':
            print(f"❌ {message}")
        elif level == 'warning':
            print(f"⚠️  {message}")
        elif level == 'success':
            print(f"✅ {message}")
        else:
            print(f"ℹ️  {message}")
        
        return {
            'message': message,
            'level': level,
            'success': True,
            'method_type': 'console'
        }
    
    elif method == "print_result":
        result_key = inputs.get('result_key', '')
        message = inputs.get('message', 'Result')
        
        # Get results from context
        results = context.get('results', {})
        
        if result_key and result_key in results:
            value = results[result_key]
            print(f"📊 {message}: {value}")
        else:
            print(f"📊 {message}: {results}")
        
        return {
            'message': message,
            'result_key': result_key,
            'success': True,
            'method_type': 'console'
        }
    
    else:
        raise ValueError(f"Unknown notification method: {method}")


def get_page(context: Dict):
    """Get page from context with error handling"""
    return PlaywrightHelpers.get_session_page(context)


def validate_inputs(inputs: Dict, required_fields: List[str]):
    """Validate required input fields"""
    PlaywrightHelpers.validate_required_inputs(inputs, required_fields) 