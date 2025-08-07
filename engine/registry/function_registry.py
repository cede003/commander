"""
Function Registry - Centralized registry with auto-dispatch
"""

import importlib
import inspect
from typing import Dict, Any, Callable, Optional
import asyncio
import sys
import os
from playwright.async_api import Page
from utils.logger import setup_logger, log


class FunctionRegistry:
    """Central registry for dynamic function dispatch with auto-dispatch"""
    
    def __init__(self):
        self._registry: Dict[str, Dict[str, Dict[str, Callable]]] = {}
        self._cache: Dict[str, Callable] = {}
        self._auto_dispatch_enabled = True
        self._engine_path = os.path.join(os.path.dirname(__file__), '..')
    
    def _ensure_engine_path(self):
        """Ensure engine path is in sys.path for imports"""
        if self._engine_path not in sys.path:
            sys.path.insert(0, self._engine_path)
    
    def _safe_import(self, module_path: str, fallback_path: str = None):
        """Safely import a module with fallback"""
        try:
            return importlib.import_module(module_path)
        except ImportError:
            if fallback_path:
                try:
                    return importlib.import_module(fallback_path)
                except ImportError:
                    log.warn(f"Failed to import {module_path} or {fallback_path}")
                    return None
            log.warn(f"Failed to import {module_path}")
            return None
    
    def _safe_import_or_fail(self, module_path: str, fallback_path: str = None, error_msg: str = None):
        """Import a module or raise ImportError with custom message"""
        module = self._safe_import(module_path, fallback_path)
        if module is None:
            raise ImportError(error_msg or f"Required module not found: {module_path}")
        return module
    
    def register_function(self, domain: str, type_name: str, subtype: str, func: Callable):
        """Register a function in the registry"""
        if domain not in self._registry:
            self._registry[domain] = {}
        if type_name not in self._registry[domain]:
            self._registry[domain][type_name] = {}
        
        self._registry[domain][type_name][subtype] = func
        log.debug(f"Registered: {domain}.{type_name}.{subtype}")
    
    def get_function(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Get a function from the registry with auto-dispatch fallback"""
        cache_key = f"{domain}.{type_name}.{subtype}"
        
        # Check cache first
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
        func = self._load_function_dynamically(domain, type_name, subtype)
        if func:
            self._cache[cache_key] = func
            return func
        
        # Auto-dispatch if enabled
        if self._auto_dispatch_enabled:
            func = self._create_auto_wrapper(domain, type_name, subtype)
            if func:
                self._cache[cache_key] = func
                log.info(f"Auto-dispatched: {domain}.{type_name}.{subtype}")
                return func
        
        return None
    
    def _load_function_dynamically(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Dynamically load a function from a module"""
        # Map singular type names to plural module names
        type_to_module = {
            "action": "actions",
            "observation": "observations", 
            "event": "events",
            "notification": "notification"
        }
        
        module_name = type_to_module.get(type_name, type_name)
        module_path = f"{domain}.{module_name}"
        
        self._ensure_engine_path()
        module = self._safe_import(module_path, f".{module_name}")
        
        if module and hasattr(module, subtype):
            func = getattr(module, subtype)
            if callable(func):
                log.info(f"Dynamically loaded: {domain}.{type_name}.{subtype}")
                return func
        
        return None
    
    def _create_auto_wrapper(self, domain: str, type_name: str, subtype: str) -> Optional[Callable]:
        """Create an auto-wrapper for Playwright methods"""
        if type_name == "notification":
            return self._create_auto_notification(subtype)
        
        if not hasattr(Page, subtype):
            return None
        
        async def auto_wrapper(inputs: Dict, context: Dict) -> Dict[str, Any]:
            self._ensure_engine_path()
            
            # Import required modules or fail fast
            playwright_helpers = self._safe_import_or_fail(
                "utils.playwright_helpers", 
                ".utils.playwright_helpers",
                "Playwright helpers module not found"
            )
            central_spec = self._safe_import_or_fail(
                "registry.central_spec", 
                ".central_spec",
                "Central spec module not found"
            )
            
            PlaywrightHelpers = playwright_helpers.PlaywrightHelpers
            get_required_inputs = central_spec.get_required_inputs
            
            # Validate inputs if required
            required_inputs = get_required_inputs(domain, type_name, subtype)
            if required_inputs:
                PlaywrightHelpers.validate_required_inputs(inputs, required_inputs)
            
            # Execute Playwright method
            page = PlaywrightHelpers.get_session_page(context)
            return await PlaywrightHelpers.call_playwright_method(page, subtype, inputs, context)
        
        return auto_wrapper
    
    def _create_auto_notification(self, subtype: str) -> Optional[Callable]:
        """Create an auto-wrapper for notification methods"""
        async def notification_wrapper(inputs: Dict, context: Dict) -> Dict[str, Any]:
            self._ensure_engine_path()
            
            # Import browser helpers or fail fast
            browser_helpers = self._safe_import_or_fail(
                "browser.helpers", 
                ".browser.helpers",
                "Browser helpers module not found"
            )
            
            auto_notification = browser_helpers.auto_notification
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
        print(f"Auto-dispatch {'enabled' if enabled else 'disabled'}")


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