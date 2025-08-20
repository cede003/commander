from typing import Callable
from playwright.async_api import Page
from engine.browser.session_manager import get_browser_session
from engine.utils.logging.logger import logger


class FunctionResolver:
    """Resolves Playwright or custom functions."""

    @staticmethod
    def resolve_playwright_function(method_name: str) -> Callable:
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
            
            target = page.locator(inputs.pop("selector")) if "selector" in inputs else page
            method = getattr(target, method_name, None)
            if not callable(method):
                raise AttributeError(f"{method_name} not found or not callable.")
            
            import asyncio
            logger.info(f"🚀 Executing {method_name} with inputs: {inputs}")
            result = method(**inputs)
            if hasattr(result, "__await__"):
                # Add timeout to prevent hanging operations
                try:
                    return await asyncio.wait_for(result, timeout=10.0)
                except asyncio.TimeoutError:
                    logger.error(f"⏰ {method_name} timed out after 10 seconds - operation hung indefinitely")
                    raise RuntimeError(f"Browser operation {method_name} timed out - operation hung indefinitely")
            return result
        return playwright_func


    @staticmethod
    def resolve_custom_function(method_name: str) -> Callable:
        from engine.browser.custom_functions import console_log
        
        # Map method names to actual functions
        custom_functions = {
            "console_log": console_log
        }
        
        func = custom_functions.get(method_name)
        if not callable(func):
            raise AttributeError(f"Custom function {method_name} not found.")
        return func
