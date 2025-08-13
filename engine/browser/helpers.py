"""
Browser Helpers - Wrapper functions for registering all browser functions from FUNCTION_SPECS
"""

from typing import Dict, Any, Callable
from registry.central_spec import FUNCTION_SPECS, list_all_functions
from registry.function_registry import registry, register
from engine.utils import log, get_shared_logger
from browser.playwright_helpers import PlaywrightHelpers


def get_browser_logger(name: str = 'browser') -> 'log.Logger':
    """Get a browser-specific logger instance"""
    return get_shared_logger(f'commander.browser.{name}')


def register_all_browser_functions():
    """
    Register all functions from FUNCTION_SPECS into the function registry.
    This creates wrapper functions that can be called through the registry.
    """
    
    def create_browser_wrapper(domain: str, type_name: str, subtype: str, spec: Dict) -> Callable:
        """Create a wrapper function for a browser operation"""
        
        async def browser_wrapper(inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
            """Wrapper function that executes browser operations"""
            try:
                # Validate required inputs first
                required_inputs = spec.get("required_inputs", [])
                PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
                
                # Get the Playwright method name
                playwright_method = spec.get("playwright_method", subtype)
                
                # Handle cases where playwright_method is None or not a string
                if playwright_method is None:
                    # For notifications and other non-playwright operations
                    if spec.get("custom_implementation", False):
                        # Handle custom implementations
                        if subtype == "console_log":
                            message = inputs.get("message", "No message provided")
                            log.info(f"[CONSOLE] {message}")
                            result = {
                                "method": subtype,
                                "success": True,
                                "result": f"Logged: {message}",
                                "method_type": "notification"
                            }
                        else:
                            result = {
                                "method": subtype,
                                "success": True,
                                "result": "Operation completed",
                                "method_type": "notification"
                            }
                    else:
                        result = {
                            "method": subtype,
                            "success": True,
                            "result": "Operation completed",
                            "method_type": "notification"
                        }
                elif not isinstance(playwright_method, str):
                    raise ValueError(f"Invalid playwright_method type: {type(playwright_method)}. Expected string, got {playwright_method}")
                else:
                    # Only get the page for actual Playwright methods
                    page = PlaywrightHelpers.get_session_page(context)
                    
                    # Execute the Playwright method
                    result = await PlaywrightHelpers.call_playwright_method(
                        page, playwright_method, inputs, context
                    )
                
                # Add metadata from spec
                result.update({
                    "domain": domain,
                    "type": type_name,
                    "subtype": subtype,
                    "description": spec.get("description", f"{domain}.{type_name}.{subtype}")
                })
                
                return result
                
            except Exception as e:
                log.error(f"Error in browser wrapper {domain}.{type_name}.{subtype}: {e}")
                return {
                    "domain": domain,
                    "type": type_name,
                    "subtype": subtype,
                    "success": False,
                    "error": str(e),
                    "method_type": "browser"
                }
        
        return browser_wrapper
    
    # Register all functions from FUNCTION_SPECS
    browser_specs = FUNCTION_SPECS.get("browser", {})
    
    for type_name, subtypes in browser_specs.items():
        for subtype, spec in subtypes.items():
            # Create the wrapper function
            wrapper_func = create_browser_wrapper("browser", type_name, subtype, spec)
            
            # Register it in the registry
            registry.register_function("browser", type_name, subtype, wrapper_func)
            
            log.debug(f"Registered browser function: browser.{type_name}.{subtype}")
    
    log.debug(f"Registered {sum(len(subtypes) for subtypes in browser_specs.values())} browser functions")


def get_registered_browser_functions() -> Dict[str, Dict[str, list]]:
    """Get all registered browser functions - reuses registry.list_functions()"""
    return registry.list_functions().get("browser", {})


def register_browser_function(domain: str, type_name: str, subtype: str, spec: Dict):
    """
    Register a single browser function with custom spec.
    Uses the existing register decorator from function_registry.
    """
    return register(domain, type_name, subtype)


# Auto-register all functions when module is imported
register_all_browser_functions() 