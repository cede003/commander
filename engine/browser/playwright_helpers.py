"""
Playwright Helpers - Minimal utilities for calling Playwright methods
"""

from typing import Dict, Any, List
from playwright.async_api import Page
from utils.logger import log


class PlaywrightHelpers:
    """Minimal helpers for Playwright method calls"""
    
    @staticmethod
    async def call_playwright_method(page: Page, method_name: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
        """Call any Playwright method with basic error handling"""
        
        if not hasattr(page, method_name):
            raise Exception(f"Method {method_name} not found on page")
        
        method = getattr(page, method_name)
        
        # Convert timeout string to int if needed
        if 'timeout' in inputs and isinstance(inputs['timeout'], str):
            inputs['timeout'] = int(inputs['timeout'])
        
        try:
            result = await method(**inputs)
            return {
                'method': method_name,
                'success': True,
                'result': str(result),
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