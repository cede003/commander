"""
Browser Action Functions - Simple async functions for browser actions
"""

from typing import Dict, Any
from .session import BrowserSession


async def goto_url(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Navigate to a URL"""
    url = inputs.get('url')
    
    if not url:
        raise ValueError("URL is required for goto_url node")
    
    # Get browser session from context
    session: BrowserSession = context.get('session')
    
    if not session:
        raise Exception("Browser session not available")
    
    try:
        # Get page from session
        page = session.get_page()
        if not page:
            raise Exception("No page available in session")
        
        # Navigate to the URL
        print(f"🌐 Navigating to: {url}")
        await page.goto(url)
        print(f"✅ Successfully navigated to {url}")
        
        # Wait for navigation to complete
        await page.wait_for_load_state("networkidle")
        
        return {
            'url': url,
            'success': True,
            'method': 'playwright'
        }
        
    except Exception as e:
        print(f"❌ Error in browser navigation: {e}")
        raise


async def click(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Click an element"""
    # Get method from properties
    properties = context.get('properties', {})
    method = properties.get('method', 'by_selector')
    
    if method == 'by_selector':
        selector = inputs.get('selector')
        if not selector:
            raise ValueError("Selector is required for click node")
        
        # Get browser session from context
        session: BrowserSession = context.get('session')
        
        if not session:
            raise Exception("Browser session not available")
        
        try:
            # Get page from session
            page = session.get_page()
            if not page:
                raise Exception("No page available in session")
            
            # Wait for the element to appear if specified
            wait_for = inputs.get('wait_for', None)
            if wait_for:
                await page.wait_for_selector(selector)
            
            # Click the element
            print(f"🖱️  Clicking: {selector}")
            await page.click(selector)
            print(f"✅ Successfully clicked {selector}")
            
            # Wait for any resulting navigation or DOM changes
            await page.wait_for_load_state("networkidle")
            
            return {
                'selector': selector,
                'method': method,
                'success': True,
                'method_type': 'playwright'
            }
            
        except Exception as e:
            print(f"❌ Error in browser click: {e}")
            raise
    else:
        raise ValueError(f"Unsupported click method: {method}") 