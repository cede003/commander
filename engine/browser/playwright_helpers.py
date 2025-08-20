"""
Playwright Helpers - Minimal utilities for calling Playwright methods
"""

from typing import Dict, Any, List
import inspect
from playwright.async_api import Page
from engine.utils import log


class PlaywrightHelpers:
    """Minimal helpers for Playwright method calls"""
    
    @staticmethod
    async def call_playwright_method(page: Page, method_name: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
        """Call any Playwright method or read attribute with basic error handling.

        Supports both async methods (e.g. title()) and simple attributes (e.g. url).
        """

        # Try to resolve attribute on Page first; if missing and a selector is provided,
        # try resolving on a Locator from the selector (for element-only methods like scroll_into_view_if_needed)
        target_obj = page
        if not hasattr(page, method_name):
            if 'selector' in (inputs or {}):
                locator = page.locator(inputs['selector'])
                if hasattr(locator, method_name):
                    target_obj = locator
                else:
                    raise Exception(f"Method {method_name} not found on page or locator")
            else:
                raise Exception(f"Method {method_name} not found on page")

        attr = getattr(target_obj, method_name)

        # Normalize inputs copy for safe mutation
        call_kwargs = dict(inputs or {})

        # Convert timeout string to int if needed
        if 'timeout' in call_kwargs and isinstance(call_kwargs['timeout'], str):
            call_kwargs['timeout'] = int(call_kwargs['timeout'])

        try:
            # If attribute is callable, call it (and await if needed). Otherwise, treat as property.
            if callable(attr):
                # Special-case argument mapping for certain Playwright methods
                if method_name == 'wait_for_function' and 'function' in call_kwargs:
                    expression = call_kwargs.pop('function')
                    maybe_result = attr(expression, **call_kwargs)
                else:
                    # If we are calling on a Locator, drop selector from kwargs
                    if target_obj is not page and 'selector' in call_kwargs:
                        call_kwargs.pop('selector', None)
                    # Prefer calling with kwargs when provided; otherwise no-arg call
                    maybe_result = attr(**call_kwargs) if call_kwargs else attr()
                result_value = await maybe_result if inspect.isawaitable(maybe_result) else maybe_result
            else:
                # Property access (e.g., page.url)
                result_value = attr

            return {
                'method': method_name,
                'success': True,
                'result': str(result_value),
                'method_type': 'playwright'
            }
        except Exception as e:
            log.error(f"Error executing {method_name}: {e}")
            raise
    
    @staticmethod
    def get_session_page(context: Dict) -> Page:
        """Get the page from session context"""
        session = context.get('session')
        if not session:
            raise Exception("Browser session not available")
        
        page = session.get_page()
        if not page:
            raise Exception("No page available in session")
        
        return page
    
    @staticmethod
    def validate_required_inputs(inputs: Dict, required_fields: List[str]) -> None:
        """Validate that required input fields are present"""
        missing_fields = [field for field in required_fields if field not in inputs or inputs[field] is None]
        
        if missing_fields:
            raise ValueError(f"Missing required parameters: {', '.join(missing_fields)}") 