#!/usr/bin/env python3
"""
Persistent runner for executing workflows from JSON input.
Runs continuously and processes workflow requests as they come in.
"""

import json
import sys
import os
import asyncio
from typing import Dict, Any, Optional
from engine.execution.commander_engine import CommanderEngine
from engine.execution.workflow_state import create_initial_state
from engine.browser.session_manager import (
    initialize_browser_session, 
    restart_browser_session, 
    is_browser_session_healthy, 
    is_browser_session_ready
    )
from engine.utils.logging.logger import logger
from engine.utils.ipc_utils import emit_line


# Force unbuffered output for proper communication with Electron
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Add the current working directory to Python path so we can import from engine
sys.path.insert(0, os.getcwd())

# Also add the parent directory in case we're running from a subdirectory
parent_dir = os.path.dirname(os.getcwd())
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)




class PersistentWorkflowRunner:
    """Persistent runner that continuously processes workflow requests"""
    
    def __init__(self, workflow_timeout: int = 120):
        self.engine = CommanderEngine()
        self.running = True
        self.workflow_timeout = workflow_timeout
        emit_line("READY")
        logger.info("Starting persistent workflow runner")
    
    async def _init_browser_session(self):
        """Initialize browser session using session manager"""
        try:
            await initialize_browser_session()
            logger.info("Browser session initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize browser session: {e}")
            sys.exit(1)
    
    def _parse_data(self, line: str) -> Dict[str, Any]:
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
            final_workflow_state = await asyncio.wait_for(
                self._run_workflow(workflow),
                timeout=self.workflow_timeout
            )

            logger.info(f"Final workflow state: {final_workflow_state}")
            
            results = {
                "status": "completed" if final_workflow_state.get("execution").get("status") == "success" else "error",
                "final_state": final_workflow_state,
                "inputs": workflow.get("inputs", {}),
                "outputs": final_workflow_state.get("outputs", {})
            }
            
            if final_workflow_state.get("error"):
                results["status"] = "error"
                results["error"] = final_workflow_state.get("error")
            
            return results
            
        except asyncio.TimeoutError:
            logger.error(f"Workflow execution timed out after {self.workflow_timeout} seconds")
            return {
                "status": "error",
                "error": f"Workflow execution timed out after {self.workflow_timeout} seconds"
            }
    
    async def _run_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Internal method to run the workflow"""
        self.engine.load_workflow(workflow)
        initial_state = create_initial_state(workflow)
        return await self.engine.execute_workflow(initial_state)
    
    def _output_results(self, results: Dict[str, Any], request_id: str = None):
        """Output results to stdout in Electron-compatible format"""
        if request_id:
            # Format for Electron IPC communication
            electron_response = {
                "id": request_id,
                "success": results.get("status") == "completed",
                "result": results
            }
            # logger.info(f"Sending Electron response: {json.dumps(electron_response, indent=2)}")
            # Send without indentation to avoid line splitting issues
            print(json.dumps(electron_response), file=sys.stdout, flush=True)
        else:
            # Fallback format for direct output
            print(json.dumps(results), file=sys.stdout, flush=True)
        sys.stdout.flush()
    
    async def run(self):
        """Main loop - continuously read and process workflows"""
        # Initialize browser session when async event loop is running
        await self._init_browser_session()
        
        logger.info("Entering main processing loop")
        workflow_count = 0
        
        while self.running:
            try:
                # Monitor stdin for workflow requests
                line = await asyncio.to_thread(sys.stdin.readline)
                if not line or not line.strip():
                    continue
                
                line = line.strip()
                workflow_count += 1
                logger.info(f"Processing workflow #{workflow_count}")
                
                try:
                    # Parse the original line to get request ID and workflow data
                    original_data = json.loads(line)
                    request_id = original_data.get("id") if isinstance(original_data, dict) else None
                    
                    workflow = self._parse_data(line)
                    
                    if workflow.get("action") == "cleanup":
                        logger.info("Received cleanup signal, shutting down...")
                        self.running = False
                        break
                    
                    if workflow.get("action") == "restart_browser_session":
                        logger.info("Restarting browser session...")
                        try:
                            await restart_browser_session()
                            results = {"status": "completed", "message": "Browser session restarted successfully"}
                        except Exception as e:
                            logger.error(f"Failed to restart browser session: {e}")
                            results = {"status": "error", "error": str(e)}
                        
                        # Send results immediately for restart actions
                        self._output_results(results, request_id)
                        continue
                    
                    if workflow.get("action") == "check_session_health":
                        logger.info("Checking browser session health...")
                        try:
                            # Use absolute import from the engine package
                            health_status = {
                                "is_ready": is_browser_session_ready(),
                                "is_healthy": is_browser_session_healthy(),
                                "timestamp": asyncio.get_event_loop().time()
                            }
                            results = {"status": "completed", "health": health_status}
                        except Exception as e:
                            logger.error(f"Failed to check session health: {e}")
                            results = {"status": "error", "error": str(e)}
                        
                        # Send results immediately for health check actions
                        self._output_results(results, request_id)
                        continue
                    
                    logger.info(f"Workflow: {workflow.get('metadata', {}).get('name', 'Unknown')}")
                    
                    # Execute workflow with timeout protection
                    results = await self._execute_workflow(workflow)
                    logger.info(f"Workflow #{workflow_count} completed: {results['status']}")
                    
                    # Return results
                    logger.info(f"Sending results to Electron for request {request_id}")
                    self._output_results(results, request_id)
                    logger.info(f"Results sent successfully for request {request_id}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {e}")
                    error_result = {"status": "error", "error": f"Invalid JSON: {str(e)}"}
                    self._output_results(error_result, request_id)
                except Exception as e:
                    logger.error(f"Workflow execution error: {e}")
                    error_result = {"status": "error", "error": str(e)}
                    self._output_results(error_result, request_id)
                
            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt, shutting down...")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                self._output_results({"status": "error", "error": f"Runner error: {str(e)}"})
        
        logger.info("Runner shutdown complete")


def main():
    """Main entry point - start the persistent workflow runner"""
    try:
        runner = PersistentWorkflowRunner()
        asyncio.run(runner.run())
        logger.info("Persistent workflow runner completed")
    except Exception as e:
        logger.error(f"Failed to start runner: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
