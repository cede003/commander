"""
Browser package - Core browser automation components
"""

from engine.browser.session import BrowserSession
from engine.browser.session_manager import BrowserSessionManager, session_manager
from engine.browser.config import BrowserConfig
from engine.browser.browser_tool import BrowserTool

# Import to trigger Playwright function registration
from engine.browser import browser_tool

from engine.utils.logging.logger import logger
logger.debug("Browser package initialization complete")

__all__ = [
    'BrowserSession',
    'BrowserSessionManager', 
    'session_manager',
    'BrowserConfig',
    'BrowserTool'
] 