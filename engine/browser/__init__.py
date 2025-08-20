"""
Browser package - Core browser automation components
"""

from .session import BrowserSession
from .session_manager import BrowserSessionManager, session_manager
from .config import BrowserConfig
from .browser_tool import BrowserTool

# Import to trigger Playwright function registration
from . import browser_tool

from engine.utils.logging.logger import logger
logger.debug("🎯 Browser package initialization complete")

__all__ = [
    'BrowserSession',
    'BrowserSessionManager', 
    'session_manager',
    'BrowserConfig',
    'BrowserTool'
] 