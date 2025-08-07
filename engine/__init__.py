"""
Engine Package - Main workflow execution engine
"""

from .runner import ScalableWorkflowRunner
from .registry.function_registry import registry, execute_node, register
from .utils.playwright_helpers import PlaywrightHelpers
from .utils.template_engine import TemplateEngine

# Import browser helpers only once to prevent duplicate registrations
if not hasattr(__import__(__name__), '_browser_helpers_imported'):
    from .browser.helpers import auto_action, auto_observation, auto_event, auto_notification
    setattr(__import__(__name__), '_browser_helpers_imported', True)
else:
    # Create dummy functions to avoid re-importing
    def auto_action(*args, **kwargs): pass
    def auto_observation(*args, **kwargs): pass
    def auto_event(*args, **kwargs): pass
    def auto_notification(*args, **kwargs): pass

__all__ = [
    'ScalableWorkflowRunner',
    'registry',
    'execute_node', 
    'register',
    'auto_action',
    'auto_observation',
    'auto_event',
    'auto_notification',
    'PlaywrightHelpers',
    'TemplateEngine',
]

# Enable auto-dispatch by default
registry.enable_auto_dispatch(True) 