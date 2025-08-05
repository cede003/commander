"""
Browser Events - Dynamic registration of Playwright events
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
from .helpers import auto_event


def register_playwright_events():
    """Dynamically register all Playwright events from central spec"""
    browser_events = FUNCTION_SPECS.get("browser", {}).get("event", {})
    
    for method, spec in browser_events.items():
        # Get Playwright method from spec
        playwright_method = spec.get("playwright_method", method)
        
        # Create the event function dynamically with proper closure
        def create_event(playwright_method):
            async def event(inputs: Dict, context: Dict) -> Dict[str, Any]:
                return await auto_event(inputs, context, playwright_method)
            return event
        
        # Register the event
        register("browser", "event", method)(create_event(playwright_method))
        
        print(f"⏳ Registered Playwright event: {method} -> {playwright_method}")


# Register all Playwright events on module import
register_playwright_events()


# Custom events with additional logic (these are manually defined)
@register("browser", "event", "wait_for_text")
async def wait_for_text(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Wait for text to appear on the page"""
    from .helpers import get_page, validate_inputs
    
    validate_inputs(inputs, ["text"])
    page = get_page(context)
    
    try:
        text = inputs['text']
        timeout = inputs.get('timeout', 30000)
        
        print(f"⏳ Waiting for text: {text}")
        await page.wait_for_function(f'document.body.innerText.includes("{text}")', timeout=timeout)
        print(f"✅ Text appeared: {text}")
        
        return {
            'text': text,
            'timeout': timeout,
            'success': True,
            'method_type': 'playwright'
        }
        
    except Exception as e:
        print(f"❌ Error waiting for text: {e}")
        raise


@register("browser", "event", "wait_for_time")
async def wait_for_time(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Wait for a specified amount of time"""
    import asyncio
    
    seconds = inputs.get('seconds', 1)
    
    if not seconds or seconds < 0:
        raise ValueError("Positive seconds value is required for wait_for_time node")
    
    try:
        print(f"⏳ Waiting for {seconds} second(s)...")
        await asyncio.sleep(seconds)
        print(f"✅ Waited for {seconds} second(s)")
        
        return {
            'seconds': seconds,
            'success': True,
            'method_type': 'asyncio'
        }
        
    except Exception as e:
        print(f"❌ Error waiting for time: {e}")
        raise


@register("browser", "event", "wait_for_element_visible")
async def wait_for_element_visible(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Wait for element to be visible with custom logic"""
    from .helpers import get_page, validate_inputs
    
    validate_inputs(inputs, ["selector"])
    page = get_page(context)
    
    selector = inputs["selector"]
    timeout = inputs.get('timeout', 30000)
    
    # Custom logic: wait for element to be visible
    await page.wait_for_selector(selector, state="visible", timeout=timeout)
    
    return {
        'selector': selector,
        'timeout': timeout,
        'success': True,
        'method_type': 'custom_event'
    }


@register("browser", "event", "wait_for_network_idle")
async def wait_for_network_idle(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Wait for network to be idle"""
    from .helpers import get_page
    
    page = get_page(context)
    timeout = inputs.get('timeout', 30000)
    
    try:
        print(f"⏳ Waiting for network to be idle...")
        await page.wait_for_load_state("networkidle", timeout=timeout)
        print(f"✅ Network is idle")
        
        return {
            'timeout': timeout,
            'success': True,
            'method_type': 'playwright'
        }
        
    except Exception as e:
        print(f"❌ Error waiting for network idle: {e}")
        raise 