"""
Custom Actions - Complex actions with business logic and domain-specific automation
"""

from typing import Dict, Any
from registry import register
from utils.logger import log
from browser.playwright_helpers import PlaywrightHelpers
from browser.config import BrowserConfig

logger = log


@register("browser", "action", "linkedin_easy_apply")
async def linkedin_easy_apply(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """LinkedIn Easy Apply automation"""
    page = PlaywrightHelpers.get_session_page(context)
    
    # Look for Easy Apply button
    easy_apply_selectors = [
        "button[aria-label*='Easy Apply']",
        "button:has-text('Easy Apply')",
        "[data-control-name='jobdetails_topcard_inapply']",
        ".jobs-apply-button"
    ]
    
    clicked = False
    for selector in easy_apply_selectors:
        try:
            # Wait for element to be visible
            await page.wait_for_selector(selector, timeout=BrowserConfig.get_timeout('short'))
            
            # Click the Easy Apply button
            await page.click(selector)
            clicked = True
            break
        except Exception:
            continue
    
    if not clicked:
        return {
            'success': False,
            'error': 'Easy Apply button not found'
        }
    
    # Wait for application form to appear
    try:
        await page.wait_for_selector("form[action*='apply']", timeout=BrowserConfig.get_timeout('default'))
        form_visible = True
    except Exception:
        form_visible = False
    
    return {
        'success': form_visible,
        'easy_apply_clicked': True,
        'form_visible': form_visible
    }