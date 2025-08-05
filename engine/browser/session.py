"""
Browser Session Management - Manages Playwright browser & page connections
"""

import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Browser, Page


class BrowserSession:
    """Manages Playwright browser and page connections"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
    
    async def init(self):
        """Initialize the browser session"""
        self.playwright = await async_playwright().start()
        
        # Try to connect to existing browser with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"🔗 Attempting to connect to existing browser instance via CDP... (attempt {attempt + 1}/{max_retries})")
                self.browser = await self.playwright.chromium.connect_over_cdp("http://localhost:9222")
                print("✅ Connected to Electron browser instance")
                break
            except Exception as e:
                print(f"⚠️  Connection attempt {attempt + 1} failed: {e}")
                if attempt + 1 >= max_retries:
                    print("🆕 All connection attempts failed, launching new browser instance")
                    self.browser = await self.playwright.chromium.launch(headless=False)
                    self.page = await self.browser.new_page()
                    print("📄 Created new page")
                    return
                else:
                    print(f"🔄 Retrying in 2 seconds...")
                    await asyncio.sleep(2)
        
        try:
            print("🔍 Searching for available pages...")
            for context in self.browser.contexts:
                for page in context.pages:
                    try:
                        page_title = await page.title()
                        page_url = page.url
                        print(f"[CDP] Found page: '{page_title}' - {page_url}")
                        
                        # Look for the main content page (not DevTools or app window)
                        # Target any page that's not the DevTools or the React app window
                        if (page_url and 
                            not page_url.startswith('chrome-devtools://') and
                            not page_url.startswith('chrome://') and
                            not page_url.startswith('devtools://') and
                            not page_url.startswith('http://localhost:5174') and  # React dev server
                            not page_url.startswith('file://') and  # App window
                            page_url != 'about:blank'):
                            
                            # Check if this page has window.name = "main-browser"
                            try:
                                window_name = await page.evaluate('window.name')
                                print(f"🔍 Window name: '{window_name}'")
                                
                                if window_name == "main-browser":
                                    self.page = page
                                    page_title = await self.page.title()
                                    print(f"🎯 Selected page with window.name='main-browser': '{page_title}' - {self.page.url}")
                                    print("✅ This is the main browser (BrowserView content)")
                                    return
                                else:
                                    print(f"⚠️  Window name '{window_name}' doesn't match 'main-browser'")
                                    # This is likely a regular webpage in the BrowserView
                                    # Use it as the target page
                                    self.page = page
                                    page_title = await self.page.title()
                                    print(f"🎯 Selected page (BrowserView content): '{page_title}' - {self.page.url}")
                                    print("✅ This is the main browser (BrowserView content)")
                                    return
                            except Exception as e:
                                print(f"⚠️  Could not get window.name: {e}")
                                # Fallback: use this page if it's not the React app window
                                if not page_url.startswith('http://localhost:5174'):
                                    self.page = page
                                    page_title = await self.page.title()
                                    print(f"🎯 Selected page (fallback): '{page_title}' - {self.page.url}")
                                    print("✅ This is the main browser (BrowserView content)")
                                    return
                    except Exception as e:
                        print(f"⚠️  Error checking page (navigation in progress?): {e}")
                        # Continue checking other pages even if one fails
                        continue
            
            print("❌ No suitable page found in Electron browser.")
            print("📋 Available pages:")
            for context in self.browser.contexts:
                for page in context.pages:
                    try:
                        page_title = await page.title()
                        page_url = page.url
                        print(f"  - '{page_title}' - {page_url}")
                    except Exception as e:
                        print(f"  - Error getting page info: {e}")
            raise Exception("No suitable page found in Electron browser.")
            
        except Exception as e:
            print(f"⚠️  Could not connect to existing browser: {e}")
            print("🆕 Launching new browser instance")
            self.browser = await self.playwright.chromium.launch(headless=False)
            self.page = await self.browser.new_page()
            print("📄 Created new page")
    
    async def close(self):
        """Close the browser session"""
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None
        
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
    
    def get_page(self) -> Optional[Page]:
        """Get the current page"""
        return self.page
    
    def get_browser(self) -> Optional[Browser]:
        """Get the current browser"""
        return self.browser 