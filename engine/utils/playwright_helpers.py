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
            
            # Serialize result to ensure it's JSON-compatible
            serialized_result = PlaywrightHelpers._serialize_result(result)
            
            return {
                'method': method_name,
                'success': True,
                'result': serialized_result,
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
    def _serialize_result(result: Any) -> Any:
        """Serialize result to ensure it's JSON-compatible"""
        if result is None:
            return None
        
        # Handle Playwright ElementHandle objects
        if hasattr(result, 'bounding_box') and hasattr(result, 'inner_text'):
            # This is likely an ElementHandle
            try:
                return {
                    'type': 'element_handle',
                    'tag_name': result.tag_name if hasattr(result, 'tag_name') else None,
                    'inner_text': result.inner_text() if hasattr(result, 'inner_text') else None,
                    'text_content': result.text_content() if hasattr(result, 'text_content') else None,
                    'get_attribute': {attr: result.get_attribute(attr) for attr in ['id', 'class', 'name', 'type'] if result.get_attribute(attr)} if hasattr(result, 'get_attribute') else {},
                    'bounding_box': result.bounding_box() if hasattr(result, 'bounding_box') else None
                }
            except Exception as e:
                return {
                    'type': 'element_handle',
                    'error': f"Failed to serialize element: {str(e)}"
                }
        
        # Handle Playwright Locator objects
        if hasattr(result, 'count') and hasattr(result, 'first'):
            try:
                return {
                    'type': 'locator',
                    'count': result.count() if hasattr(result, 'count') else None,
                    'description': str(result)
                }
            except Exception as e:
                return {
                    'type': 'locator',
                    'error': f"Failed to serialize locator: {str(e)}"
                }
        
        # Handle Response objects from Playwright
        if hasattr(result, 'url') and hasattr(result, 'status'):
            # This is likely a Response object
            return {
                'type': 'response',
                'url': str(result.url) if hasattr(result, 'url') else None,
                'status': result.status if hasattr(result, 'status') else None,
                'status_text': result.status_text if hasattr(result, 'status_text') else None,
                'headers': dict(result.headers) if hasattr(result, 'headers') else None
            }
        
        # Handle Page objects
        if hasattr(result, 'url') and hasattr(result, 'title'):
            return {
                'type': 'page',
                'url': result.url if hasattr(result, 'url') else None,
                'title': result.title() if hasattr(result, 'title') else None
            }
        
        # Handle lists that might contain ElementHandles
        if isinstance(result, list):
            return [PlaywrightHelpers._serialize_result(item) for item in result]
        
        # Handle dictionaries that might contain ElementHandles
        if isinstance(result, dict):
            return {key: PlaywrightHelpers._serialize_result(value) for key, value in result.items()}
        
        # Handle other non-serializable objects
        if hasattr(result, '__dict__'):
            try:
                return str(result)
            except:
                return f"<{type(result).__name__} object>"
        
        # Handle basic types
        if isinstance(result, (str, int, float, bool)):
            return result
        
        # Fallback to string representation
        return str(result)
    
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
        """Validate that required input fields are present with helpful error messages"""
        missing_fields = []
        for field in required_fields:
            if field not in inputs or inputs[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            # Create a more helpful error message
            if len(missing_fields) == 1:
                field = missing_fields[0]
                error_msg = f"Missing required parameter '{field}'"
                
                # Add helpful suggestions for common parameters
                if field == 'key':
                    error_msg += ". For press() action, specify a key like 'Enter', 'Tab', 'Escape', etc."
                elif field == 'selector':
                    error_msg += ". For browser actions, specify a CSS selector like '#button', '.class', etc."
                elif field == 'url':
                    error_msg += ". For navigation actions, specify a URL like 'https://example.com'"
                elif field == 'text':
                    error_msg += ". For text input actions, specify the text to type"
                elif field == 'value':
                    error_msg += ". For form actions, specify the value to set"
            else:
                error_msg = f"Missing required parameters: {', '.join(missing_fields)}"
            
            raise ValueError(error_msg) 