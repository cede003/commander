"""
Custom Actions - Complex actions with business logic and domain-specific automation
Updated to work with the new tool registration system.
"""

from typing import Dict, Any
from engine.utils.logging.logger import log


def console_log(message: str = "No message provided", level: str = "info") -> str:
    """Log a message to console via unified logger"""
    if level == "debug":
        log.debug(message)
    elif level in ("warn", "warning"):
        log.warning(message)
    elif level == "error":
        log.error(message)
    else:
        log.info(message)

    return f"Logged: {message}"
