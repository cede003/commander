"""
Browser Session Management - Manages Playwright browser & page connections
"""

import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Browser, Page


class BrowserSession:
    """Manages Playwright browser and page connections using best practices"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
    
    async def init(self):
        """Initialize the browser session using best practices"""
        self.playwright = await async_playwright().start()
        
        # Try to connect to existing browser with shorter timeouts and better error handling
        max_retries = 2
        for attempt in range(max_retries):
            try:
                print(f"🔗 Attempting to connect to existing browser instance via CDP... (attempt {attempt + 1}/{max_retries})")
                
                # Use a shorter timeout for the connection attempt
                self.browser = await asyncio.wait_for(
                    self.playwright.chromium.connect_over_cdp("http://127.0.0.1:9222"),
                    timeout=3.0
                )
                print("Connected to Electron browser instance")
                break
            except asyncio.TimeoutError:
                print(f"⚠️  Connection attempt {attempt + 1} timed out after 3 seconds")
                if attempt + 1 >= max_retries:
                    print("🆕 All connection attempts failed, launching new browser instance")
                    self.browser = await self.playwright.chromium.launch(headless=False)
                    self.page = await self.browser.new_page()
                    await self._tag_page_as_main_app()
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
                    await self._tag_page_as_main_app()
                    print("📄 Created new page")
                    return
                else:
                    print(f"Retrying in 0.5 seconds...")
                    await asyncio.sleep(0.5)
        
        # Find the tagged main app page using Playwright
        await self._find_tagged_main_page()
    
    async def _tag_page_as_main_app(self):
        """Tag the current page as the main app page"""
        try:
            # Inject a script to tag this page
            await self.page.evaluate("""
                window._isMainAppPage = true;
                window._appTaggedAt = new Date().toISOString();
                console.log('🔖 Page tagged as main app page');
            """)
            print("🔖 Tagged page as main app page")
        except Exception as e:
            print(f"⚠️  Could not tag page: {e}")
    
    async def _find_tagged_main_page(self):
        """Find the page tagged as the main app page using Playwright"""
        print("🔍 Searching for tagged main app page...")
        
        page_found = False
        for context in self.browser.contexts:
            for page in context.pages:
                try:
                    # Check if this page is tagged as the main app page
                    is_main_app = await asyncio.wait_for(
                        page.evaluate("window._isMainAppPage === true"),
                        timeout=1.0
                    )
                    
                    if is_main_app:
                        self.page = page
                        page_title = await asyncio.wait_for(page.title(), timeout=1.0)
                        page_url = page.url
                        print(f"✅ Found tagged main app page: '{page_title}' - {page_url}")
                        page_found = True
                        break
                    else:
                        # Log other pages for debugging
                        try:
                            page_title = await asyncio.wait_for(page.title(), timeout=1.0)
                            page_url = page.url
                            print(f"[CDP] Found page (not main): '{page_title}' - {page_url}")
                        except Exception:
                            pass
                            
                except asyncio.TimeoutError:
                    print(f"⚠️  Timeout checking page for tag")
                    continue
                except Exception as e:
                    print(f"⚠️  Error checking page for tag: {e}")
                    continue
            
            if page_found:
                break
        
        if not page_found:
            print("❌ No tagged main app page found")
            print("📋 Available pages:")
            for context in self.browser.contexts:
                for page in context.pages:
                    try:
                        page_title = await asyncio.wait_for(page.title(), timeout=1.0)
                        page_url = page.url
                        is_tagged = await asyncio.wait_for(
                            page.evaluate("window._isMainAppPage === true"),
                            timeout=0.5
                        )
                        tag_status = "🔖 TAGGED" if is_tagged else "❌ NOT TAGGED"
                        print(f"  - {tag_status} '{page_title}' - {page_url}")
                    except Exception as e:
                        print(f"  - Error getting page info: {e}")
            
            # Fallback: try to find a suitable page and tag it
            await self._fallback_find_and_tag_page()
    
    async def _fallback_find_and_tag_page(self):
        """Fallback method to find a suitable page and tag it"""
        print("🔄 Fallback: Looking for suitable page to tag...")
        
        for context in self.browser.contexts:
            for page in context.pages:
                try:
                    page_url = page.url
                    page_title = await asyncio.wait_for(page.title(), timeout=1.0)
                    
                    # Look for a suitable page (not DevTools, not the React dev server)
                    if (page_url and 
                        not page_url.startswith('chrome-devtools://') and
                        not page_url.startswith('chrome://') and
                        not page_url.startswith('devtools://') and
                        not page_url.startswith('http://localhost:5174') and  # React dev server
                        not page_url.startswith('file://') and  # App window
                        page_url != 'about:blank'):
                        
                        print(f"🎯 Found suitable page to tag: '{page_title}' - {page_url}")
                        self.page = page
                        await self._tag_page_as_main_app()
                        return
                        
                except Exception as e:
                    print(f"⚠️  Error checking page in fallback: {e}")
                    continue
        
        # If no suitable page found, create a new one
        print("🆕 No suitable page found, creating new page")
        self.page = await self.browser.new_page()
        await self._tag_page_as_main_app()
        print("📄 Created and tagged new page")
    
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