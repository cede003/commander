from typing import List, Dict, Any
from ..utils.logging.logger import logger
from .function_resolver import FunctionResolver
from ..browser.browser_tool import BrowserTool
from .tool_registry import tool_registry
from .definitions.playwright_definitions import PLAYWRIGHT_SPECS
from .definitions.custom_definitions import CUSTOM_SPECS


class ToolFactory:
    """Creates and registers tools based on JSON specs."""

    def __init__(self):
        self.browser_tools: List[BrowserTool] = []
        self.resolver = FunctionResolver()
        self._register_all()

    def _register_all(self):
        self._create_tools_from_specs(PLAYWRIGHT_SPECS, "playwright")
        self._create_tools_from_specs(CUSTOM_SPECS, "custom")
        for tool in self.browser_tools:
            domain, op = tool.name.split(".")
            tool_registry.register_tool(domain, op, tool)

    def _create_tools_from_specs(self, specs: Dict, tool_type: str):
        resolve_func = self.resolver.resolve_playwright_function if tool_type == "playwright" else self.resolver.resolve_custom_function
        for domain, methods in specs.items():
            for method_name, spec in methods.items():
                tool_name = f"{domain}.{method_name}"
                description = spec.get("description", f"{tool_type} tool: {method_name}")
                required = spec.get("required_properties", [])
                try:
                    func = resolve_func(method_name)
                    tool = BrowserTool(
                        name=tool_name,
                        description=description,
                        function=func,
                        required_properties=required
                    )
                    self.browser_tools.append(tool)
                except Exception as e:
                    logger.error(f"Failed to create tool {tool_name}: {e}")

    def get_tool(self, name: str) -> BrowserTool:
        return next((t for t in self.browser_tools if t.name == name), None)

    def list_tools(self) -> List[str]:
        return [tool.name for tool in self.browser_tools]
