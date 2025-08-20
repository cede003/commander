"""
Logger Factory

This module provides a centralized logger factory to avoid duplicate
logger setup across different modules and ensure consistent logging configuration.
"""

from __future__ import annotations

from typing import Dict, Optional, Any
from functools import lru_cache

from .logger import setup_logger

# Cache for logger instances to avoid recreating them
_logger_cache: Dict[str, Any] = {}


class LoggerFactory:
    """Factory for creating and caching logger instances."""
    
    @staticmethod
    def get_logger(name: str) -> Any:
        """Get a logger instance by name, creating it if it doesn't exist.
        
        Args:
            name: The logger name (e.g., "commander.workflow_composer")
            
        Returns:
            A configured logger instance
        """
        if name not in _logger_cache:
            _logger_cache[name] = setup_logger(name)
        
        return _logger_cache[name]
    
    @staticmethod
    def clear_cache() -> None:
        """Clear the logger cache."""
        _logger_cache.clear()
    
    @staticmethod
    def get_cached_loggers() -> Dict[str, Any]:
        """Get all cached logger instances."""
        return _logger_cache.copy()
    
    @staticmethod
    def get_logger_count() -> int:
        """Get the number of cached loggers."""
        return len(_logger_cache)


# Convenience function for backward compatibility
def get_logger(name: str) -> Any:
    """Get a logger instance using the factory."""
    return LoggerFactory.get_logger(name) 