from typing import Callable
from playwright.async_api import Page
from engine.browser.session_manager import get_browser_session
from engine.utils.logging.logger import logger
from engine.registry.definitions.playwright_definitions import PLAYWRIGHT_SPECS



class FunctionResolver:
    """Resolves Playwright functions dynamically."""

    @staticmethod
    def resolve_playwright_function(domain: str, method_name: str) -> Callable:
        async def playwright_func(**inputs):
            session = get_browser_session()
            if not session:
                raise RuntimeError("No browser session available.")
            
            try:
                page: Page = session.get_page()
            except Exception:
                raise RuntimeError("No active page.")
            
            # Health checks before using page or browser
            browser = session.get_browser()
            if not browser or not browser.is_connected():
                raise RuntimeError("Browser is not connected")
            
            if not page or page.is_closed():
                raise RuntimeError("Page is closed or unavailable")
            
            # Get the target type from the tool spec
            target_type = PLAYWRIGHT_SPECS.get(domain, {}).get(method_name, {}).get("target", "locator")
            
            # Determine whether to use page or locator based on spec
            if target_type == "page":
                target = page
            else:
                # For locator methods, we need a selector
                if "selector" not in inputs:
                    raise ValueError(f"Method {method_name} requires a 'selector' parameter")
                target = page.locator(inputs.pop("selector"))
            
            method = getattr(target, method_name, None)
            if method is None:
                logger.error(f"Method {method_name} not found on target {type(target).__name__}")
                logger.error(f"Available methods: {[m for m in dir(target) if not m.startswith('_')][:10]}...")
                raise AttributeError(f"{method_name} not found on {type(target).__name__}.")
            
            import asyncio
            logger.info(f"Executing {method_name} with inputs: {inputs}") if inputs else logger.info(f"Executing {method_name}")
            
            # Handle properties vs methods
            if callable(method):
                result = method(**inputs)
            else:
                # It's a property, just return its value
                result = method
            if hasattr(result, "__await__"):
                # Add timeout to prevent hanging operations
                try:
                    return await asyncio.wait_for(result, timeout=10.0)
                except asyncio.TimeoutError:
                    logger.error(f"{method_name} timed out after 10 seconds - operation hung indefinitely")
                    raise RuntimeError(f"Browser operation {method_name} timed out - operation hung indefinitely")
            return result
        return playwright_func



