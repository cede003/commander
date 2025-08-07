"""
Browser Actions - Dynamic registration of Playwright actions
"""

from typing import Dict, Any
import sys
import os

# Add engine directory to path for absolute imports
engine_path = os.path.join(os.path.dirname(__file__), '..')
if engine_path not in sys.path:
    sys.path.insert(0, engine_path)

from registry import register
from registry.central_spec import FUNCTION_SPECS, get_required_inputs
from .helpers import auto_action

# Import shared logger
try:
    from utils.logger import shared_logger
    logger = shared_logger
except ImportError:
    # Fallback if shared logger not available
    import logging
    logger = logging.getLogger('commander.browser.actions')


def register_playwright_actions():
    """Dynamically register all Playwright actions from central spec"""
    browser_actions = FUNCTION_SPECS.get("browser", {}).get("action", {})
    
    # Check if already registered to prevent duplicates
    if hasattr(register_playwright_actions, '_registered'):
        return
    
    registered_count = 0
    for method, spec in browser_actions.items():
        # Get Playwright method from spec
        playwright_method = spec.get("playwright_method", method)
        
        # Create the action function dynamically with proper closure
        def create_action(playwright_method):
            async def action(inputs: Dict, context: Dict) -> Dict[str, Any]:
                return await auto_action(inputs, context, playwright_method)
            return action
        
        # Register the action
        register("browser", "action", method)(create_action(playwright_method))
        
        # Only log individual registrations in debug mode
        logger.debug(f"Registered Playwright action: {method} -> {playwright_method}")
        registered_count += 1
    
    # Log summary at info level (only if we actually registered something)
    if registered_count > 0:
        logger.info(f"Registered {registered_count} Playwright actions")
    
    # Mark as registered to prevent duplicates
    register_playwright_actions._registered = True


# Register all Playwright actions on module import
register_playwright_actions()


# Custom actions with additional logic (these are manually defined)
@register("browser", "action", "smart_click")
async def smart_click(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Smart click with wait and retry logic"""
    from .helpers import get_page, validate_inputs
    from utils.playwright_helpers import PlaywrightHelpers
    
    validate_inputs(inputs, ["selector"])
    page = get_page(context)
    
    # Custom logic: wait for element to be visible
    selector = inputs["selector"]
    wait_result = await PlaywrightHelpers.call_playwright_method(page, "wait_for_selector", {"selector": selector, "state": "visible"}, context)
    
    # Perform the click
    click_result = await PlaywrightHelpers.call_playwright_method(page, "click", {"selector": selector}, context)
    
    return {
        'selector': selector,
        'wait_result': wait_result,
        'click_result': click_result,
        'success': True,
        'method_type': 'smart_click'
    }


@register("browser", "action", "multi_click")
async def multi_click(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Click multiple elements"""
    from .helpers import get_page, validate_inputs
    from utils.playwright_helpers import PlaywrightHelpers
    
    validate_inputs(inputs, ["selectors"])
    page = get_page(context)
    
    selectors = inputs["selectors"]
    results = []
    
    for selector in selectors:
        try:
            click_result = await PlaywrightHelpers.call_playwright_method(page, "click", {"selector": selector}, context)
            results.append({"selector": selector, "success": True, "result": click_result})
        except Exception as e:
            results.append({"selector": selector, "success": False, "error": str(e)})
    
    return {
        'results': results,
        'total_clicked': len([r for r in results if r['success']]),
        'method_type': 'multi_click'
    } 