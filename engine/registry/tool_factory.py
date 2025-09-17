from typing import List, Dict, Any
from engine.utils.logging.logger import logger
from engine.registry.function_resolver import FunctionResolver
from engine.browser.browser_tool import BrowserTool
from engine.registry.tool_registry import tool_registry
from engine.registry.definitions.playwright_definitions import PLAYWRIGHT_SPECS

# Import custom functions to trigger their registration via @register_tool decorator
import engine.browser.custom_functions


class ToolFactory:
    """Creates and registers tools based on JSON specs."""

    def __init__(self):
        self.browser_tools: List[BrowserTool] = []
        self.resolver = FunctionResolver()
        self._register_all()

    def _register_all(self):
        # Register Playwright tools from specs
        self._create_tools_from_specs(PLAYWRIGHT_SPECS, "playwright")
        # Register all browser tools
        for tool in self.browser_tools:
            domain, op = tool.name.split(".")
            tool_registry.register_tool(domain, op, tool)
            logger.debug(f"Registered tool: {tool.name}")
        
        
    def _create_tools_from_specs(self, specs: Dict, tool_type: str):
        resolve_func = self.resolver.resolve_playwright_function
        for domain, methods in specs.items():
            for method_name, spec in methods.items():
                tool_name = f"{domain}.{method_name}"
                description = spec.get("description", f"{tool_type} tool: {method_name}")
                required = spec.get("required_arguments", [])
                try:
                    func = resolve_func(domain, method_name)
                    tool = BrowserTool(
                        name=tool_name,
                        description=description,
                        function=func,
                        required_arguments=required
                    )
                    self.browser_tools.append(tool)
                except Exception as e:
                    logger.error(f"Failed to create tool {tool_name}: {e}")

    def get_tool(self, name: str) -> BrowserTool:
        return next((t for t in self.browser_tools if t.name == name), None)

    def list_tools(self) -> List[str]:
        """Return all available tool names from the registry"""
        registry_tools = []
        all_tools = tool_registry.list_tools()
        for domain, operations in all_tools.items():
            registry_tools.extend([f"{domain}.{op}" for op in operations])
        return sorted(registry_tools)
