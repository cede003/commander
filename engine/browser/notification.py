"""
Browser Notification Functions - Console logging and notifications
"""

from typing import Dict, Any
import sys
import os

# Add engine directory to path for absolute imports
engine_path = os.path.join(os.path.dirname(__file__), '..')
if engine_path not in sys.path:
    sys.path.insert(0, engine_path)

from registry import register
from registry.central_spec import FUNCTION_SPECS
from .helpers import auto_notification


def register_playwright_notifications():
    """Dynamically register all notification functions from central spec"""
    
    browser_notifications = FUNCTION_SPECS.get("browser", {}).get("notification", {})
    
    for method, spec in browser_notifications.items():
        # Create the notification function dynamically with proper closure
        def create_notification(method):
            async def notification(inputs: Dict, context: Dict) -> Dict[str, Any]:
                return await auto_notification(inputs, context, method)
            return notification
        
        register("browser", "notification", method)(create_notification(method))
        
        print(f"🔔 Registered notification: {method}")


# Register all notification functions
register_playwright_notifications() 