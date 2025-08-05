"""
Browser Notification Functions - Simple async functions for notifications
"""

from typing import Dict, Any


async def console_log(inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Log a message to console"""
    title = inputs.get('title', 'Notification')
    message = inputs.get('message', '')
    
    print(f"📢 {title}: {message}")
    
    return {
        'title': title,
        'message': message,
        'success': True
    } 