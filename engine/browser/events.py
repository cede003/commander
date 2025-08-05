"""
Browser Events - Waits for navigation, DOM changes, and other events
"""

import asyncio
from typing import Optional, Callable, Any
from playwright.async_api import Page


class BrowserEvents:
    """Waits for browser events like navigation, DOM changes, etc."""
    
    def __init__(self, page: Page):
        self.page = page
    
    async def wait_for_navigation(self, timeout: int = 30000) -> bool:
        """Wait for page navigation to complete"""
        try:
            print("⏳ Waiting for navigation...")
            await self.page.wait_for_load_state("networkidle", timeout=timeout)
            print("✅ Navigation completed")
            return True
        except Exception as e:
            print(f"❌ Error waiting for navigation: {e}")
            return False
    
    async def wait_for_selector(self, selector: str, timeout: int = 5000) -> bool:
        """Wait for an element to appear"""
        try:
            print(f"⏳ Waiting for selector: {selector}")
            await self.page.wait_for_selector(selector, timeout=timeout)
            print(f"✅ Selector {selector} appeared")
            return True
        except Exception as e:
            print(f"❌ Selector {selector} did not appear: {e}")
            return False
    
    async def wait_for_text(self, text: str, timeout: int = 5000) -> bool:
        """Wait for text to appear on the page"""
        try:
            print(f"⏳ Waiting for text: '{text}'")
            await self.page.wait_for_selector(f"text={text}", timeout=timeout)
            print(f"✅ Text '{text}' appeared")
            return True
        except Exception as e:
            print(f"❌ Text '{text}' did not appear: {e}")
            return False
    
    async def wait_for_url_change(self, current_url: str, timeout: int = 10000) -> bool:
        """Wait for URL to change from current URL"""
        try:
            print(f"⏳ Waiting for URL to change from: {current_url}")
            
            async def url_changed():
                while True:
                    if self.page.url != current_url:
                        return True
                    await asyncio.sleep(0.1)
            
            await asyncio.wait_for(url_changed(), timeout=timeout)
            print(f"✅ URL changed to: {self.page.url}")
            return True
        except asyncio.TimeoutError:
            print(f"❌ URL did not change within {timeout}ms")
            return False
        except Exception as e:
            print(f"❌ Error waiting for URL change: {e}")
            return False
    
    async def wait_for_dom_change(self, timeout: int = 5000) -> bool:
        """Wait for DOM changes"""
        try:
            print("⏳ Waiting for DOM changes...")
            
            # Get initial DOM content length
            initial_content = await self.page.content()
            initial_length = len(initial_content)
            
            async def dom_changed():
                while True:
                    current_content = await self.page.content()
                    if len(current_content) != initial_length:
                        return True
                    await asyncio.sleep(0.1)
            
            await asyncio.wait_for(dom_changed(), timeout=timeout)
            print("✅ DOM changes detected")
            return True
        except asyncio.TimeoutError:
            print(f"❌ No DOM changes detected within {timeout}ms")
            return False
        except Exception as e:
            print(f"❌ Error waiting for DOM changes: {e}")
            return False
    
    async def wait_for_network_idle(self, timeout: int = 10000) -> bool:
        """Wait for network to be idle"""
        try:
            print("⏳ Waiting for network to be idle...")
            await self.page.wait_for_load_state("networkidle", timeout=timeout)
            print("✅ Network is idle")
            return True
        except Exception as e:
            print(f"❌ Error waiting for network idle: {e}")
            return False
    
    async def wait_for_function(self, function: str, timeout: int = 5000) -> bool:
        """Wait for a JavaScript function to return true"""
        try:
            print(f"⏳ Waiting for function: {function}")
            await self.page.wait_for_function(function, timeout=timeout)
            print("✅ Function condition met")
            return True
        except Exception as e:
            print(f"❌ Function condition not met: {e}")
            return False
    
    async def wait_for_timeout(self, milliseconds: int) -> None:
        """Wait for a specified amount of time"""
        print(f"⏳ Waiting for {milliseconds}ms...")
        await asyncio.sleep(milliseconds / 1000)
        print(f"✅ Waited {milliseconds}ms") 