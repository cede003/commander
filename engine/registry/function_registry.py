"""
Function Registry - Centralized registry with auto-dispatch
"""

import importlib
import inspect
from typing import Dict, Any, Callable, Optional
import asyncio
from playwright.async_api import Page


class FunctionRegistry:
    """Central registry for dynamic function dispatch with auto-dispatch"""
    
    def __init__(self):
        self._registry: Dict[str, Dict[str, Dict[str, Callable]]] = {}
        self._cache: Dict[str, Callable] = {}
        self._auto_dispatch_enabled = True
    
    def register_function(self, domain: str, type_name: str, subtype: str, func: Callable):
        """Register a function in the registry"""
        if domain not in self._registry:
            self._registry[domain] = {}
        if type_name not in self._registry[domain]:
            self._registry[domain][type_name] = {}
        
        self._registry[domain][type_name][subtype] = func
        print(f"📝 Registered: {domain}.{type_name}.{subtype}")
    
    def get_function(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Get a function from the registry with auto-dispatch fallback"""
        # Check cache first
        cache_key = f"{domain}.{type_name}.{subtype}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Check registry
        if (domain in self._registry and 
            type_name in self._registry[domain] and 
            subtype in self._registry[domain][type_name]):
            func = self._registry[domain][type_name][subtype]
            self._cache[cache_key] = func
            return func
        
        # Try dynamic import
        try:
            func = self._load_function_dynamically(domain, type_name, subtype)
            if func:
                self._cache[cache_key] = func
                return func
        except Exception as e:
            print(f"⚠️  Failed to load {domain}.{type_name}.{subtype}: {e}")
        
        # Auto-dispatch to Playwright method if enabled
        if self._auto_dispatch_enabled:
            try:
                func = self._create_auto_wrapper(domain, type_name, subtype)
                if func:
                    self._cache[cache_key] = func
                    print(f"🎭 Auto-dispatched: {domain}.{type_name}.{subtype}")
                    return func
            except Exception as e:
                print(f"⚠️  Failed to auto-dispatch {subtype}: {e}")
        
        return None
    
    def _load_function_dynamically(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Dynamically load a function from a module"""
        try:
            # Map singular type names to plural module names
            type_to_module = {
                "action": "actions",
                "observation": "observations", 
                "event": "events",
                "notification": "notification"
            }
            
            # Use the mapped module name if available, otherwise use type_name
            module_name = type_to_module.get(type_name, type_name)
            module_path = f"{domain}.{module_name}"
            module = importlib.import_module(module_path)
            
            # Get the function
            if hasattr(module, subtype):
                func = getattr(module, subtype)
                
                # Verify it's a callable
                if callable(func):
                    print(f"🔄 Dynamically loaded: {domain}.{type_name}.{subtype}")
                    return func
                else:
                    print(f"⚠️  {subtype} is not callable in {module_path}")
            else:
                # For dynamically registered functions, they might not exist as static functions
                # Let auto-dispatch handle it
                print(f"⚠️  Function {subtype} not found in {module_path} (will use auto-dispatch)")
                return None
                
        except ImportError as e:
            print(f"⚠️  Could not import {module_path}: {e}")
        except Exception as e:
            print(f"⚠️  Error loading {domain}.{type_name}.{subtype}: {e}")
        
        return None
    
    def _create_auto_wrapper(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Create an auto-wrapper for Playwright methods"""
        if type_name == "notification":
            # Notifications don't use Playwright methods
            return self._create_auto_notification(subtype)
        
        if not hasattr(Page, subtype):
            return None
        
        async def auto_wrapper(inputs: Dict, context: Dict) -> Dict[str, Any]:
            import sys
            import os
            
            # Add engine directory to path for absolute imports
            engine_path = os.path.join(os.path.dirname(__file__), '..')
            if engine_path not in sys.path:
                sys.path.insert(0, engine_path)
            
            try:
                from utils.playwright_helpers import PlaywrightHelpers
                from registry.central_spec import get_required_inputs
            except ImportError:
                # Fallback for when run from engine directory
                from .utils.playwright_helpers import PlaywrightHelpers
                from .central_spec import get_required_inputs
            
            required_inputs = get_required_inputs(domain, type_name, subtype)
            if required_inputs:
                PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
            
            page = PlaywrightHelpers.get_session_page(context)
            return await PlaywrightHelpers.call_playwright_method(page, subtype, inputs, context)
        
        return auto_wrapper
    
    def _create_auto_notification(self, subtype: str) -> Optional[Callable]:
        """Create an auto-wrapper for notification methods"""
        import sys
        import os
        
        # Add engine directory to path for absolute imports
        engine_path = os.path.join(os.path.dirname(__file__), '..')
        if engine_path not in sys.path:
            sys.path.insert(0, engine_path)
        
        async def notification_wrapper(inputs: Dict, context: Dict) -> Dict[str, Any]:
            try:
                from browser.helpers import auto_notification
            except ImportError:
                # Fallback for when run from engine directory
                from .browser.helpers import auto_notification
            
            return await auto_notification(inputs, context, subtype)
        
        return notification_wrapper
    

    
    def list_functions(self) -> Dict[str, Dict[str, list]]:
        """List all registered functions"""
        result = {}
        for domain, types in self._registry.items():
            result[domain] = {}
            for type_name, subtypes in types.items():
                result[domain][type_name] = list(subtypes.keys())
        return result
    
    def clear_cache(self):
        """Clear the function cache"""
        self._cache.clear()
        print("🧹 Function cache cleared")
    
    def enable_auto_dispatch(self, enabled: bool = True):
        """Enable or disable auto-dispatch"""
        self._auto_dispatch_enabled = enabled
        print(f"🎭 Auto-dispatch {'enabled' if enabled else 'disabled'}")


# Global registry instance
registry = FunctionRegistry()


def register(domain: str, type_name: str, subtype: str):
    """Decorator to register a function in the registry"""
    def decorator(func: Callable) -> Callable:
        registry.register_function(domain, type_name, subtype, func)
        return func
    return decorator


async def execute_node(domain: str, type_name: str, subtype: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
    """Execute a node using the registry with auto-dispatch"""
    func = registry.get_function(domain, type_name, subtype)
    
    if not func:
        raise Exception(f"Function not found: {domain}.{type_name}.{subtype}")
    
    # Check if function is async
    if asyncio.iscoroutinefunction(func):
        result = await func(inputs, context)
    else:
        result = func(inputs, context)
    
    return result


# Enable auto-dispatch by default
registry.enable_auto_dispatch(True) 