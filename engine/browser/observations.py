"""
Browser Observations - Dynamic registration of Playwright observations
"""

from typing import Dict, Any
import sys
import os

# Add engine directory to path for absolute imports
engine_path = os.path.join(os.path.dirname(__file__), '..')
if engine_path not in sys.path:
    sys.path.insert(0, engine_path)

# Module-level logger setup
try:
    from utils.logger import shared_logger as logger
except ImportError:
    import logging
    logger = logging.getLogger('commander.browser.observations')

from registry import register
from registry.central_spec import FUNCTION_SPECS, get_required_inputs
from .helpers import auto_observation


def register_playwright_observations():
    """Dynamically register all Playwright observations from central spec"""
    browser_observations = FUNCTION_SPECS.get("browser", {}).get("observation", {})
    
    # Check if already registered to prevent duplicates
    if getattr(register_playwright_observations, "_registered", False):
        return
    
    registered_count = 0
    for method, spec in browser_observations.items():
        # Get Playwright method from spec
        playwright_method = spec.get("playwright_method", method)
        
        # Create the observation function dynamically with proper closure
        def create_observation(method_name):
            async def observation(inputs: Dict, context: Dict, method=method_name) -> Dict[str, Any]:
                return await auto_observation(inputs, context, method)
            return observation
        
        # Register the observation
        register("browser", "observation", method)(create_observation(playwright_method))
        
        # Only log individual registrations in debug mode
        logger.debug(f"Registered Playwright observation: {method} -> {playwright_method}")
        registered_count += 1
    

    # Log summary at info level (only if we actually registered something)
    if registered_count > 0:
        logger.info(f"Registered {registered_count} Playwright observations")
    
    # Mark as registered to prevent duplicates
    register_playwright_observations._registered = True


# Register all Playwright observations on module import
register_playwright_observations()


# Custom observations with additional logic (these are manually defined)
@register("browser", "observation", "get_page_info")
async def get_page_info(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Get basic page information"""
    from .helpers import get_page
    from utils.playwright_helpers import PlaywrightHelpers
    
    page = get_page(context)
    
    try:
        title_result = await PlaywrightHelpers.call_playwright_method(page, "title", {}, context)
        url_result = await PlaywrightHelpers.call_playwright_method(page, "url", {}, context)
        
        title = title_result.get('result', '')
        url = url_result.get('result', '')
        
        print(f"Page title: {title}")
        print(f"Page URL: {url}")
        
        return {
            'title': title,
            'url': url,
            'success': True,
            'method_type': 'playwright'
        }
        
    except Exception as e:
        print(f"Error getting page info: {e}")
        raise


@register("browser", "observation", "get_visible_elements")
async def get_visible_elements(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Get only visible elements matching a selector"""
    from .helpers import get_page, validate_inputs
    from utils.playwright_helpers import PlaywrightHelpers
    
    validate_inputs(inputs, ["selector"])
    page = get_page(context)
    
    selector = inputs["selector"]
    
    # Custom logic: get only visible elements
    elements_result = await PlaywrightHelpers.call_playwright_method(page, "query_selector_all", {"selector": selector}, context)
    elements = elements_result.get('result', [])
    
    visible_elements = []
    for element in elements:
        is_visible_result = await PlaywrightHelpers.call_playwright_method(element, "is_visible", {}, context)
        if is_visible_result.get('result', False):
            visible_elements.append(element)
    
    return {
        'selector': selector,
        'count': len(visible_elements),
        'success': True,
        'method_type': 'custom_observation'
    }


@register("browser", "observation", "get_form_data")
async def get_form_data(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Extract all form data from the page"""
    from .helpers import get_page, validate_inputs
    from utils.playwright_helpers import PlaywrightHelpers
    
    validate_inputs(inputs, ["form_selector"])
    page = get_page(context)
    
    form_selector = inputs["form_selector"]
    
    # Get all form inputs
    inputs_data_result = await PlaywrightHelpers.call_playwright_method(page, "eval_on_selector_all", {
        "selector": form_selector,
        "expression": """
            (form) => {
                const data = {};
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    if (input.name) {
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            data[input.name] = input.checked ? input.value : '';
                        } else {
                            data[input.name] = input.value;
                        }
                    }
                });
                return data;
            }
        """
    }, context)
    
    inputs_data = inputs_data_result.get('result', {})
    
    return {
        'form_selector': form_selector,
        'form_data': inputs_data,
        'success': True,
        'method_type': 'custom_observation'
    } 