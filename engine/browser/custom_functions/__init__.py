"""
Custom Functions Package - Contains custom browser automation functions
"""

# Import all custom function modules to ensure they're registered
from . import custom_actions
from . import custom_observations
from . import custom_events
from . import custom_notifications

__all__ = [
    'custom_actions',
    'custom_observations', 
    'custom_events',
    'custom_notifications'
] 