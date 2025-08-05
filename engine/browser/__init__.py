"""
Browser package - Core browser automation components
"""

from .session import BrowserSession
from .observations import BrowserObservations
from .events import BrowserEvents

__all__ = ['BrowserSession', 'BrowserObservations', 'BrowserEvents'] 