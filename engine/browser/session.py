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
        
        # Try to connect to existing browser with shorter timeouts and better error handling
        max_retries = 2  # Reduced from 3 to 2 for faster fallback
        for attempt in range(max_retries):
            try:
                print(f"🔗 Attempting to connect to existing browser instance via CDP... (attempt {attempt + 1}/{max_retries})")
                
                # Use a shorter timeout for the connection attempt
                self.browser = await asyncio.wait_for(
                    self.playwright.chromium.connect_over_cdp("http://127.0.0.1:9222"),
                    timeout=3.0  # Reduced from 5.0 to 3.0 seconds
                )
                print("Connected to Electron browser instance")
                break
            except asyncio.TimeoutError:
                print(f"⚠️  Connection attempt {attempt + 1} timed out after 3 seconds")
                if attempt + 1 >= max_retries:
                    print("🆕 All connection attempts failed, launching new browser instance")
                    self.browser = await self.playwright.chromium.launch(headless=False)
                    self.page = await self.browser.new_page()
                    print("📄 Created new page")
                    return
                else:
                    print(f"Retrying in 0.5 seconds...")
                    await asyncio.sleep(0.5)
            except Exception as e:
                print(f"⚠️  Connection attempt {attempt + 1} failed: {e}")
                if attempt + 1 >= max_retries:
                    print("🆕 All connection attempts failed, launching new browser instance")
                    self.browser = await self.playwright.chromium.launch(headless=False)
                    self.page = await self.browser.new_page()
                    print("📄 Created new page")
                    return
                else:
                    print(f"Retrying in 0.5 seconds...")
                    await asyncio.sleep(0.5)
        
        try:
            print("Searching for available pages...")
            page_found = False
            for context in self.browser.contexts:
                for page in context.pages:
                    try:
                        # Use a shorter timeout for page operations
                        page_title = await asyncio.wait_for(page.title(), timeout=1.0)  # Reduced from 2.0 to 1.0
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
                            
                            # Use webContents.id for more reliable identification
                            # The BrowserView page should have a specific webContents.id
                            # We'll use the first non-DevTools page as the target
                            self.page = page
                            page_title = await asyncio.wait_for(self.page.title(), timeout=1.0)
                            print(f"Selected page (BrowserView content): '{page_title}' - {self.page.url}")
                            print("This is the main browser (BrowserView content)")
                            page_found = True
                            break
                    except asyncio.TimeoutError:
                        print(f"⚠️  Timeout checking page (navigation in progress?): {page.url}")
                        # Continue checking other pages even if one fails
                        continue
                    except Exception as e:
                        print(f"⚠️  Error checking page (navigation in progress?): {e}")
                        # Continue checking other pages even if one fails
                        continue
                
                if page_found:
                    break
            
            if not page_found:
                print("No suitable page found in Electron browser.")
                print("📋 Available pages:")
                for context in self.browser.contexts:
                    for page in context.pages:
                        try:
                            page_title = await asyncio.wait_for(page.title(), timeout=1.0)
                            page_url = page.url
                            print(f"  - '{page_title}' - {page_url}")
                        except Exception as e:
                            print(f"  - Error getting page info: {e}")
                
                # If no suitable page found, create a new one
                print("🆕 Creating new page in existing browser")
                self.page = await self.browser.new_page()
                print("📄 Created new page")
            
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