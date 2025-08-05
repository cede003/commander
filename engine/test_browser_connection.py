#!/usr/bin/env python3
"""
Test Browser Connection - Verify connection to Electron BrowserView
"""

import asyncio
import sys
import os

# Add the engine directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from browser.session import BrowserSession

async def test_browser_connection():
    """Test connection to Electron BrowserView"""
    
    session = BrowserSession()
    
    try:
        print("🔗 Initializing browser session...")
        await session.init()
        
        page = session.get_page()
        if page:
            title = await page.title()
            url = page.url
            print(f"✅ Connected to page: '{title}' - {url}")
            
            # Test basic page interaction
            print("🧪 Testing page interaction...")
            await page.click('body')
            print("✅ Successfully clicked body element")
            
            # Test navigation
            print("🧪 Testing navigation...")
            await page.goto('https://www.example.com')
            title = await page.title()
            url = page.url
            print(f"✅ Navigated to: '{title}' - {url}")
            
            # Test clicking on the new page
            await page.click('body')
            print("✅ Successfully clicked body element on new page")
            
        else:
            print("❌ No page available")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(test_browser_connection()) 