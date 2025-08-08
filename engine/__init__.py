"""
Engine Package - Main workflow execution engine
"""

from .runner import ScalableWorkflowRunner
from .registry.function_registry import registry, execute_node, register
from .browser.playwright_helpers import PlaywrightHelpers
from .utils.template_engine import TemplateEngine

# Import browser helpers only once to prevent duplicate registrations
if not hasattr(__import__(__name__), '_browser_helpers_imported'):
    from .browser.helpers import register_all_browser_functions, get_registered_browser_functions, register_browser_function
    setattr(__import__(__name__), '_browser_helpers_imported', True)
else:
    # Create dummy functions to avoid re-importing
    def register_all_browser_functions(*args, **kwargs): pass
    def get_registered_browser_functions(*args, **kwargs): pass
    def register_browser_function(*args, **kwargs): pass

__all__ = [
    'ScalableWorkflowRunner',
    'registry',
    'execute_node', 
    'register',
    'register_all_browser_functions',
    'get_registered_browser_functions',
    'register_browser_function',
    'PlaywrightHelpers',
    'TemplateEngine',
]

# Registry is ready for use 