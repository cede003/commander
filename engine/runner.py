"""
Workflow Runner - Thin wrapper that sets up session and delegates to ExecutionEngine
"""

import asyncio
import json
import sys
import os
import uuid
from typing import Dict, Any, Optional

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules with single fallback path to prevent duplicate imports
try:
    from browser.session import BrowserSession
    from registry.function_registry import registry
    from engine.utils import setup_logger, create_workflow_logger_instance, log
    from execution.engine import ExecutionEngine
    from execution.context import WorkflowContext
except ImportError:
    # Single fallback - add parent directory to path
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    from engine.browser.session import BrowserSession
    from engine.registry.function_registry import registry
    from engine.utils import setup_logger, create_workflow_logger_instance, log
    from engine.execution.engine import ExecutionEngine
    from engine.execution.context import WorkflowContext


class ScalableWorkflowRunner:
    """Thin runner delegating execution to ExecutionEngine using WorkflowContext"""
    
    def __init__(self):
        self.session: Optional[BrowserSession] = None
        self.logger = setup_logger('commander.runner')
    
    async def initialize(self):
        """Initialize browser session"""
        self.logger.debug("Initializing scalable workflow runner...")
        
        # Initialize browser session
        self.session = BrowserSession()
        await self.session.init()
        
        self.logger.debug("Browser session initialized")
    
    async def close(self):
        """Close the browser session"""
        if self.session:
            await self.session.close()
    
    async def run_workflow(self, workflow_json: Any) -> Dict[str, Any]:
        """Run a complete workflow from JSON string or already-parsed dict"""
        try:
            if isinstance(workflow_json, (str, bytes)):
                workflow_data = json.loads(workflow_json)
            elif isinstance(workflow_json, dict):
                workflow_data = workflow_json
            else:
                raise ValueError("workflow_json must be a JSON string or a dict")
            # Validate before running
            # Import validator using engine package root so it's consistent with PYTHONPATH usage
            from execution.validator import validate_workflow

            validation = validate_workflow(workflow_data)
            if not validation.get('valid', False):
                # Include a compact error summary in exception
                msg = "; ".join(validation.get('errors', [])[:5])
                raise ValueError(f"Workflow validation failed: {msg}")

            # If there are warnings, surface them in logs but proceed
            warnings = validation.get('warnings', [])
            if warnings:
                for w in warnings[:10]:
                    self.logger.warning(f"Workflow validation warning: {w}")

            # Create workflow-specific logger
            workflow_name = workflow_data.get('metadata', {}).get('name', 'Unknown')
            workflow_id = workflow_data.get('metadata', {}).get('id', str(uuid.uuid4()))
            run_id = str(uuid.uuid4())
            
            # Create efficient workflow logger instance
            workflow_logger = create_workflow_logger_instance(workflow_id, workflow_name, run_id)
            
            # Log workflow start
            workflow_logger.log_workflow_start()
            
            # Initialize if not already done
            if not self.session:
                await self.initialize()

            # Build context and engine, then run
            wf_ctx = WorkflowContext(
                workflow_data=workflow_data,
                session=self.session,
                workflow_logger=workflow_logger,
                workflow_id=workflow_id,
                run_id=run_id,
            )
            engine = ExecutionEngine()
            result = await engine.run(wf_ctx)

            # Log workflow completion
            workflow_logger.log_workflow_done()
            
            # Display final workflow status (now at debug level)
            try:
                from engine.utils import print_workflow_status
                print_workflow_status(wf_ctx.workflow_data)
            except ImportError:
                workflow_logger.workflow_logger.debug("Status display utility not available")
            
            return result
            
        except Exception as e:
            log.error(f"Error running workflow: {e}")
            raise
    
    def list_available_functions(self) -> Dict[str, Dict[str, list]]:
        """List all available functions in the registry"""
        return registry.list_functions()
    
    def get_workflow_status(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get current status of all nodes in a workflow"""
        try:
            from engine.utils import get_node_status_summary
            summary = get_node_status_summary(workflow_data)
            
            # Get detailed status for each node
            node_statuses = {}
            for node_id, node_data in workflow_data.get('nodes', {}).items():
                runs = (node_data.get('execution_info', {}) or {}).get('runs', [])
                last_run = runs[-1] if runs else {}
                node_statuses[node_id] = {
                    'status': node_data.get('status', 'queued'),
                    'status_message': node_data.get('status_message', ''),
                    'started_at': last_run.get('started_at', ''),
                    'completed_at': last_run.get('completed_at', ''),
                    'execution_time_seconds': last_run.get('execution_time_seconds', 0.0),
                    'execution_result': last_run.get('execution_result', ''),
                }
            
            return {
                'summary': summary,
                'nodes': node_statuses
            }
        except ImportError:
            return {'error': 'Status display utility not available'}


async def main():
    """Main entry point for workflow execution"""
    try:
        # Check if running in persistent mode
        if '--persistent' in sys.argv:
            await run_persistent_mode()
        else:
            # Read workflow JSON from stdin
            workflow_json = sys.stdin.read().strip()
            
            if not workflow_json:
                log.error("No workflow JSON provided")
                return 1
            
            # Create runner
            runner = ScalableWorkflowRunner()
            
            try:
                # Run the workflow
                result = await runner.run_workflow(workflow_json)
                log.info("Workflow execution completed successfully")
                return 0
                
            finally:
                # Clean up
                await runner.close()
                
    except Exception as e:
        log.info("Workflow execution failed")
        log.error(f"Workflow execution failed: {e}")
        return 1


async def run_persistent_mode():
    """Run in persistent mode, listening for workflow requests"""
    log.info("Starting persistent workflow runner...")
    
    try:
        runner = ScalableWorkflowRunner()
        log.debug("Created ScalableWorkflowRunner instance")
        
        await runner.initialize()
        log.debug("Runner initialization completed")
        
        log.info("Persistent runner ready")
        print("READY", flush=True)  # Signal to Electron that we're ready
        
    except Exception as e:
        log.error(f"Failed to initialize persistent runner: {e}")
        raise
    
    try:
        # Listen for workflow requests from stdin
        while True:
            try:
                # Read JSON request from stdin
                request_line = input().strip()
                if not request_line:
                    continue
                
                request = json.loads(request_line)
                request_id = request.get('id')
                workflow_data = request.get('workflow')
                
                if not workflow_data:
                    log.error("No workflow data in request")
                    continue
                
                log.info(f"Processing workflow request {request_id}")
                
                try:
                    # Run the workflow
                    result = await runner.run_workflow(workflow_data)
                    
                    # Send success response
                    response = {
                        'id': request_id,
                        'success': True,
                        'result': result
                    }
                    print(json.dumps(response), flush=True)
                    
                except Exception as e:
                    log.error(f"Workflow execution failed: {e}")
                    
                    # Handle JSON serialization errors specifically
                    if "not JSON serializable" in str(e):
                        log.error(f"JSON serialization error: {e}")
                        # Try to create a serializable error response
                        error_info = {
                            'error_type': type(e).__name__,
                            'error_message': str(e),
                            'suggestion': 'This may be due to Playwright objects that cannot be serialized. Check the workflow for actions that return complex objects.'
                        }
                        response = {
                            'id': request_id,
                            'success': False,
                            'error': f"Serialization error: {str(e)}",
                            'error_details': error_info
                        }
                    else:
                        # Send regular error response
                        response = {
                            'id': request_id,
                            'success': False,
                            'error': str(e)
                        }
                    
                    print(json.dumps(response), flush=True)
                    
            except EOFError:
                log.info("Stdin closed, shutting down")
                break
            except KeyboardInterrupt:
                log.info("Received interrupt, shutting down")
                break
            except Exception as e:
                log.error(f"Error processing request: {e}")
                continue
                
    finally:
        await runner.close()
        log.info("Persistent runner shutdown complete")


if __name__ == "__main__":
    # Run the main function which handles both persistent and single-execution modes
    exit_code = asyncio.run(main())
    sys.exit(exit_code)