"""
Custom Definitions - Manually registered custom actions with business logic
"""

CUSTOM_SPECS = {
    "browser": {
        "console_log": {
            "type": "custom",
            "required_arguments": ["message"],
            "description": "Logs a message to console"
        }
    }
} 