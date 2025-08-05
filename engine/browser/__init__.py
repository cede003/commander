"""
Browser package - Core browser automation components
"""

from .session import BrowserSession
from . import actions  # Import to ensure registration happens
from . import observations  # Import to ensure registration happens
from . import events  # Import to ensure registration happens
from . import notification  # Import to ensure registration happens

__all__ = ['BrowserSession'] 