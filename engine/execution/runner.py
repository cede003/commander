#!/usr/bin/env python3
"""
Persistent runner for executing workflows from JSON input.
Runs continuously and processes workflow requests as they come in.
"""

import json
import sys
import os
import asyncio
from typing import Dict, Any

# Force unbuffered output for proper communication with Electron
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Add the current working directory to Python path so we can import from engine
sys.path.insert(0, os.getcwd())

# Also add the parent directory in case we're running from a subdirectory
parent_dir = os.path.dirname(os.getcwd())
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from engine.utils.logging.logger import logger

# Now use absolute imports from the project root
try:
    from engine.execution.commander_engine import CommanderEngine
    from engine.browser.session_manager import initialize_browser_session
except ImportError as e:
    logger.error(f"Failed to import engine modules: {e}")
    raise


class PersistentWorkflowRunner:
    """Persistent runner that continuously processes workflow requests"""
    
    def __init__(self, workflow_timeout: int = 300):  # 5 minutes default timeout
        self.engine = CommanderEngine()
        self.running = True
        self.workflow_timeout = workflow_timeout
        logger.info("🚀 Starting persistent workflow runner")
        print("READY", file=sys.stdout)
        sys.stdout.flush()
    

    
    async def _init_browser_session(self):
        """Initialize browser session using session manager"""
        try:
            await initialize_browser_session()
            logger.info("🌐 Browser session initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize browser session: {e}")
    
    def _parse_workflow(self, line: str) -> Dict[str, Any]:
        """Parse workflow JSON and handle Electron format"""
        workflow_json = json.loads(line)
        
        if isinstance(workflow_json, dict) and workflow_json.get("action") == "cleanup":
            return {"action": "cleanup"}
        
        if "workflow" in workflow_json:
            workflow_raw = workflow_json.get("workflow", {})
            return json.loads(workflow_raw) if isinstance(workflow_raw, str) else workflow_raw
        
        return workflow_json
    
    async def _execute_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single workflow with timeout and return results"""
        try:
            # Use asyncio.wait_for to prevent workflows from hanging forever
            final_context = await asyncio.wait_for(
                self._run_workflow(workflow),
                timeout=self.workflow_timeout
            )
            
            results = {
                "status": "completed" if final_context.get("success") else "error",
                "final_state": final_context,
                "inputs": workflow.get("inputs", {}),
                "outputs": final_context.get("outputs", {})
            }
            
            if final_context.get("error"):
                results["status"] = "error"
                results["error"] = final_context.get("error")
            
            return results
            
        except asyncio.TimeoutError:
            logger.error(f"⏰ Workflow execution timed out after {self.workflow_timeout} seconds")
            return {
                "status": "error",
                "error": f"Workflow execution timed out after {self.workflow_timeout} seconds"
            }
    
    async def _run_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Internal method to run the workflow"""
        self.engine.load_workflow(workflow)
        return await self.engine.execute_workflow()
    
    def _output_results(self, results: Dict[str, Any], request_id: str = None):
        """Output results to stdout in Electron-compatible format"""
        if request_id:
            # Format for Electron IPC communication
            electron_response = {
                "id": request_id,
                "success": results.get("status") == "completed",
                "result": results
            }
            logger.info(f"📤 Sending Electron response: {json.dumps(electron_response, indent=2)}")
            # Send without indentation to avoid line splitting issues
            print(json.dumps(electron_response), file=sys.stdout, flush=True)
        else:
            # Fallback format for direct output
            print(json.dumps(results, indent=2), file=sys.stdout, flush=True)
        sys.stdout.flush()
    
    async def run(self):
        """Main loop - continuously read and process workflows"""
        # Initialize browser session when async event loop is running
        await self._init_browser_session()
        
        logger.info("🔄 Entering main processing loop")
        workflow_count = 0
        
        while self.running:
            try:
                # Monitor stdin for workflow requests
                line = await asyncio.to_thread(sys.stdin.readline)
                if not line or not line.strip():
                    continue
                
                line = line.strip()
                workflow_count += 1
                logger.info(f"🔄 Processing workflow #{workflow_count}")
                
                try:
                    # Parse the original line to get request ID and workflow data
                    original_data = json.loads(line)
                    request_id = original_data.get("id") if isinstance(original_data, dict) else None
                    
                    workflow = self._parse_workflow(line)
                    
                    if workflow.get("action") == "cleanup":
                        logger.info("🧹 Received cleanup signal, shutting down...")
                        self.running = False
                        break
                    
                    logger.info(f"📋 Workflow: {workflow.get('metadata', {}).get('name', 'Unknown')}")
                    
                    # Execute workflow with timeout protection
                    results = await self._execute_workflow(workflow)
                    logger.info(f"✅ Workflow #{workflow_count} completed: {results['status']}")
                    
                    # Return results
                    logger.info(f"📤 Sending results to Electron for request {request_id}")
                    self._output_results(results, request_id)
                    logger.info(f"📤 Results sent successfully for request {request_id}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON decode error: {e}")
                    error_result = {"status": "error", "error": f"Invalid JSON: {str(e)}"}
                    self._output_results(error_result, request_id)
                except Exception as e:
                    logger.error(f"❌ Workflow execution error: {e}")
                    error_result = {"status": "error", "error": str(e)}
                    self._output_results(error_result, request_id)
                
            except KeyboardInterrupt:
                logger.info("⌨️ Received keyboard interrupt, shutting down...")
                self.running = False
                break
            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}")
                self._output_results({"status": "error", "error": f"Runner error: {str(e)}"})
        
        logger.info("🧹 Runner shutdown complete")


def main():
    """Main entry point - start the persistent workflow runner"""
    try:
        logger.info("🚀 Starting persistent workflow runner")
        runner = PersistentWorkflowRunner()
        asyncio.run(runner.run())
        logger.info("✅ Persistent workflow runner completed")
    except Exception as e:
        logger.error(f"❌ Failed to start runner: {e}")
        error_result = {"status": "error", "error": f"Failed to start runner: {str(e)}"}
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
