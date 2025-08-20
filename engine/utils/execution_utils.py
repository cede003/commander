"""
Utility functions for workflow execution
"""

import asyncio
from typing import Any, Callable, Awaitable


async def execute_with_timeout(
    func: Callable, 
    args: tuple = (), 
    timeout: float = 5.0,
    is_async: bool = None
) -> Any:
    """
    Execute a function with timeout handling.
    
    Args:
        func: The function to execute
        args: Arguments to pass to the function
        timeout: Timeout in seconds
        is_async: Whether the function is async (auto-detected if None)
    
    Returns:
        The result of the function execution
    
    Raises:
        asyncio.TimeoutError: If execution exceeds timeout
    """
    if is_async is None:
        is_async = asyncio.iscoroutinefunction(func)
    
    if is_async:
        return await asyncio.wait_for(func(*args), timeout=timeout)
    else:
        # For sync functions, run in thread pool with timeout
        loop = asyncio.get_running_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, func, *args),
            timeout=timeout
        )


def create_node_metadata(success: bool, error: str = None, **kwargs) -> dict:
    """Create standardized node metadata."""
    metadata = {
        "success": success,
        "error": error,
        "timestamp": asyncio.get_running_loop().time(),
        **kwargs
    }
    return metadata 