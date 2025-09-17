from langchain_core.tools import BaseTool
from typing import Callable, Optional, List, Dict, Any
from pydantic import Field
import asyncio
import sys

from engine.utils.logging import logger


class BrowserTool(BaseTool):
    """Tool bound to an async function (Playwright or custom)."""
    
    function: Callable
    required_arguments: List[str] = Field(default_factory=list)
    
    def __init__(
        self,
        name: str,
        description: str,
        function: Callable,
        required_arguments: Optional[List[str]] = None
    ):
        super().__init__(
            name=name,
            description=description,
            function=function,
            required_arguments=required_arguments or []
        )

    def _run(self, **kwargs):
        raise RuntimeError(f"{self.name} only supports async execution.")

    async def _ainvoke(self, **args: Dict[str, Any]) -> Dict[str, Any]:
        missing = [p for p in self.required_arguments if p not in args]
        if missing:
            return {"success": False, "error": f"Missing required inputs: {missing}"}
        
        try:
            result = await self.function(**args)
            # Handle both sync and async functions
            if hasattr(result, "__await__"):
                result = await result
            return result
        except Exception as e:
            logger.error(f"Error executing tool {self.name}: {e}")
            sys.exit(1)

    async def arun(self, tool_input: str | Dict[str, Any], **kwargs) -> str:
        inputs = tool_input if isinstance(tool_input, dict) else {"input": tool_input}
        result = await self._ainvoke(**inputs)
        return result
