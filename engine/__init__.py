"""
Engine Package - Main workflow execution engine
"""

from .runner import ScalableWorkflowRunner
from .registry.function_registry import registry, execute_node, register
from .browser.helpers import auto_action, auto_observation, auto_event, auto_notification
from .utils.playwright_helpers import PlaywrightHelpers
from .utils.template_engine import TemplateEngine

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