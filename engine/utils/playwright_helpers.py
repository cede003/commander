"""
Playwright Helpers - Essential utilities for calling Playwright methods
"""

import inspect
from typing import Dict, Any, List
from playwright.async_api import Page

# Import logger
try:
    from utils.logger import setup_logger
    logger = setup_logger('commander.playwright')
except ImportError:
    # Fallback if logger not available
    import logging
    logger = logging.getLogger('commander.playwright')


class PlaywrightHelpers:
    """Essential helpers for Playwright method calls with standardized error handling"""
    
    @staticmethod
    async def call_playwright_method(page: Page, method_name: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
        """Generic method to call any Playwright method with standardized error handling"""
        
        if not hasattr(page, method_name):
            raise Exception(f"Method {method_name} not found on page")
        
        method = getattr(page, method_name)
        
        # Prepare arguments for the method
        args = []
        kwargs = {}
        
        # Map inputs to method parameters
        sig = inspect.signature(method)
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
            
            # Check if parameter is in inputs
            if param_name in inputs:
                value = inputs[param_name]
                
                # Handle special cases
                if param_name == 'timeout' and isinstance(value, str):
                    value = int(value)
                
                if param.default == param.empty:
                    args.append(value)
                else:
                    kwargs[param_name] = value
            
            # Use default value if not provided
            elif param.default != param.empty:
                kwargs[param_name] = param.default
        
        # Execute the method
        try:
            logger.debug(f"Executing Playwright method: {method_name}")
            logger.debug(f"Method args: {args}")
            logger.debug(f"Method kwargs: {kwargs}")
            
            # Add extra debugging for title method
            if method_name == 'title':
                logger.debug(f"Page URL before title call: {page.url}")
                logger.debug(f"Page is closed: {page.is_closed()}")
                
                # Try to get basic page info first
                try:
                    current_url = page.url
                    logger.debug(f"Current URL: {current_url}")
                except Exception as url_error:
                    logger.debug(f"Error getting URL: {url_error}")
            
            result = await method(*args, **kwargs)
            logger.debug(f"Successfully executed {method_name}")
            
            return {
                'method': method_name,
                'success': True,
                'result': result,
                'method_type': 'playwright'
            }
            
        except Exception as e:
            logger.debug(f"Error executing {method_name}: {e}")
            logger.debug(f"Error type: {type(e).__name__}")
            logger.debug(f"Error args: {e.args}")
            
            # Add extra debugging for title method errors
            if method_name == 'title':
                logger.debug(f"Page state during title error:")
                try:
                    logger.debug(f"Page URL: {page.url}")
                    logger.debug(f"Page is closed: {page.is_closed()}")
                except Exception as debug_error:
                    logger.debug(f"Error getting page debug info: {debug_error}")
            
            raise
    
    @staticmethod
    def get_session_page(context: Dict) -> Page:
        """Get the page from session context with error handling"""
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
        missing_fields = []
        for field in required_fields:
            if field not in inputs or inputs[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Required fields missing: {', '.join(missing_fields)}") 