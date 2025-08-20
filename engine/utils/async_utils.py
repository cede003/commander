"""
Utility functions for async operations
"""

import asyncio
from typing import Any


async def await_coroutines_recursively(obj: Any) -> Any:
    """
    Recursively await any coroutines in the object and return resolved values.
    
    This function traverses data structures (dicts, lists, tuples) and awaits
    any coroutines it finds, returning the resolved values.
    """
    if asyncio.iscoroutine(obj):
        return await obj
    if isinstance(obj, dict):
        return {k: await await_coroutines_recursively(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [await await_coroutines_recursively(i) for i in obj]
    if isinstance(obj, tuple):
        return tuple(await await_coroutines_recursively(i) for i in obj)
    # If it's not awaitable, just return it as is
    return obj 