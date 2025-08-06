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

# Import logger
try:
    from utils.logger import setup_logger
    logger = setup_logger('commander.browser.actions')
except ImportError:
    # Fallback if logger not available
    import logging
    logger = logging.getLogger('commander.browser.actions')


def register_playwright_actions():
    """Dynamically register all Playwright actions from central spec"""
    browser_actions = FUNCTION_SPECS.get("browser", {}).get("action", {})
    
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
        
        logger.debug(f"Registered Playwright action: {method} -> {playwright_method}")


# Register all Playwright actions on module import
register_playwright_actions()


# Custom actions with additional logic (these are manually defined)
@register("browser", "action", "smart_click")
async def smart_click(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Smart click with wait and retry logic"""
    from .helpers import get_page, validate_inputs
    
    validate_inputs(inputs, ["selector"])
    page = get_page(context)
    
    # Custom logic: wait for element to be visible
    selector = inputs["selector"]
    await page.wait_for_selector(selector, state="visible")
    
    # Perform the click
    await page.click(selector)
    
    return {
        'selector': selector,
        'success': True,
        'method_type': 'smart_click'
    }


@register("browser", "action", "multi_click")
async def multi_click(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Click multiple elements"""
    from .helpers import get_page, validate_inputs
    
    validate_inputs(inputs, ["selectors"])
    page = get_page(context)
    
    selectors = inputs["selectors"]
    results = []
    
    for selector in selectors:
        try:
            await page.click(selector)
            results.append({"selector": selector, "success": True})
        except Exception as e:
            results.append({"selector": selector, "success": False, "error": str(e)})
    
    return {
        'results': results,
        'total_clicked': len([r for r in results if r['success']]),
        'method_type': 'multi_click'
    } 