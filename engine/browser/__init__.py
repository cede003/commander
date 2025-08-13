"""
Browser package - Core browser automation components
"""

from .session import BrowserSession
from .playwright_helpers import PlaywrightHelpers
from .helpers import register_all_browser_functions, get_registered_browser_functions, register_browser_function
from .config import BrowserConfig

# Import logger from utils
from engine.utils import log as logger

# Import modules only once to prevent duplicate registrations
if not hasattr(globals(), '_modules_registered'):
    try:
        from . import custom_functions  # Import to ensure registration happens
        logger.debug("✅ Custom functions module registered")
    except ImportError as e:
        logger.error(f"⚠️  Custom functions module not available: {e}")
    
    # Mark as registered to prevent duplicates
    globals()['_modules_registered'] = True
    logger.debug("🎯 Browser package initialization complete")

__all__ = [
    'BrowserSession',
    'PlaywrightHelpers',
    'register_all_browser_functions',
    'get_registered_browser_functions',
    'register_browser_function',
    'BrowserConfig'
] 