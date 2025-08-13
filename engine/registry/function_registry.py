"""
Function Registry - Simple registry for function definitions and wrappers
"""

import asyncio
from typing import Dict, Any, Callable, Optional
from engine.utils import log


class FunctionRegistry:
    """Simple registry for function definitions and wrappers"""
    
    def __init__(self):
        self._registry: Dict[str, Dict[str, Dict[str, Callable]]] = {}
    
    def register_function(self, domain: str, type_name: str, subtype: str, func: Callable):
        """Register a function in the registry"""
        if domain not in self._registry:
            self._registry[domain] = {}
        if type_name not in self._registry[domain]:
            self._registry[domain][type_name] = {}
        
        self._registry[domain][type_name][subtype] = func
        log.debug(f"Registered: {domain}.{type_name}.{subtype}")
    
    def get_function(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Get a function from the registry"""
        return self._registry.get(domain, {}).get(type_name, {}).get(subtype)
    
    def list_functions(self) -> Dict[str, Dict[str, list]]:
        """List all registered functions"""
        result = {}
        for domain, types in self._registry.items():
            result[domain] = {}
            for type_name, subtypes in types.items():
                result[domain][type_name] = list(subtypes.keys())
        return result


# Global registry instance
registry = FunctionRegistry()


def register(domain: str, type_name: str, subtype: str):
    """Decorator to register a function in the registry"""
    def decorator(func: Callable) -> Callable:
        registry.register_function(domain, type_name, subtype, func)
        return func
    return decorator


async def execute_node(domain: str, type_name: str, subtype: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Execute a node using the registry"""
    func = registry.get_function(domain, type_name, subtype)
    
    if not func:
        raise Exception(f"Function not found: {domain}.{type_name}.{subtype}")
    
    # Check if function is async
    if asyncio.iscoroutinefunction(func):
        result = await func(inputs, context)
    else:
        result = func(inputs, context)
    
    return result 