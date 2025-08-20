"""
Browser Configuration - Centralized configuration for browser automation
"""

from typing import Dict, Any


class BrowserConfig:
    """Centralized configuration for browser automation settings"""
    
    # Default timeout values (in milliseconds)
    TIMEOUTS = {
        'short': 5000,      # 5 seconds - for quick operations
        'default': 10000,   # 10 seconds - for standard operations
        'long': 30000,      # 30 seconds - for slow operations
        'very_long': 60000  # 60 seconds - for very slow operations
    }
    
    # Retry settings
    MAX_RETRIES = 3
    RETRY_DELAY = 1000  # milliseconds
    
    # Browser settings
    BROWSER_SETTINGS = {
        'headless': False,
        'slow_mo': 100,  # milliseconds
        'viewport': {
            'width': 1280,
            'height': 720
        }
    }
    
    # Navigation settings
    NAVIGATION_TIMEOUT = 30000  # 30 seconds
    WAIT_FOR_LOAD_STATE = "networkidle"
    
    # Element interaction settings
    CLICK_TIMEOUT = 5000
    TYPE_TIMEOUT = 3000
    HOVER_TIMEOUT = 2000
    
    # Form settings
    FORM_FILL_TIMEOUT = 10000
    FORM_SUBMISSION_TIMEOUT = 15000
    
    # Screenshot settings
    SCREENSHOT_QUALITY = 80
    SCREENSHOT_TYPE = "jpeg"
    
    @classmethod
    def get_timeout(cls, timeout_type: str = 'default') -> int:
        """Get timeout value by type"""
        return cls.TIMEOUTS.get(timeout_type, cls.TIMEOUTS['default'])
    
    @classmethod
    def get_browser_settings(cls) -> Dict[str, Any]:
        """Get browser launch settings"""
        return cls.BROWSER_SETTINGS.copy()
    
    @classmethod
    def get_navigation_settings(cls) -> Dict[str, Any]:
        """Get navigation settings"""
        return {
            'timeout': cls.NAVIGATION_TIMEOUT,
            'wait_until': cls.WAIT_FOR_LOAD_STATE
        }
    
    @classmethod
    def get_element_settings(cls) -> Dict[str, Any]:
        """Get element interaction settings"""
        return {
            'click_timeout': cls.CLICK_TIMEOUT,
            'type_timeout': cls.TYPE_TIMEOUT,
            'hover_timeout': cls.HOVER_TIMEOUT
        }
    
    @classmethod
    def get_form_settings(cls) -> Dict[str, Any]:
        """Get form interaction settings"""
        return {
            'fill_timeout': cls.FORM_FILL_TIMEOUT,
            'submission_timeout': cls.FORM_SUBMISSION_TIMEOUT
        }
    
    @classmethod
    def get_screenshot_settings(cls) -> Dict[str, Any]:
        """Get screenshot settings"""
        return {
            'quality': cls.SCREENSHOT_QUALITY,
            'type': cls.SCREENSHOT_TYPE
        }
    
    @classmethod
    def get_retry_settings(cls) -> Dict[str, Any]:
        """Get retry settings"""
        return {
            'max_retries': cls.MAX_RETRIES,
            'retry_delay': cls.RETRY_DELAY
        } 