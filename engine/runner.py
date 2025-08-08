"""
Scalable Workflow Runner - Uses registry for dynamic function dispatch
"""

import asyncio
import json
import sys
import os
import uuid
from typing import Dict, Any, List, Optional

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules with single fallback path to prevent duplicate imports
try:
    from browser.session import BrowserSession
    from registry.function_registry import registry, execute_node
    from utils.template_engine import TemplateEngine
    from utils.logger import setup_logger, create_workflow_logger_instance, log
except ImportError:
    # Single fallback - add parent directory to path
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    from engine.browser.session import BrowserSession
    from engine.registry.function_registry import registry, execute_node
    from engine.utils.template_engine import TemplateEngine
    from engine.utils.logger import setup_logger, create_workflow_logger_instance, log


class ScalableWorkflowRunner:
    """Scalable workflow runner using registry for dynamic function dispatch"""
    
    def __init__(self):
        self.session: Optional[BrowserSession] = None
        self.logger = setup_logger('commander.runner')
    
    async def initialize(self):
        """Initialize browser session"""
        self.logger.info("Initializing scalable workflow runner...")
        
        # Initialize browser session
        self.session = BrowserSession()
        await self.session.init()
        
        self.logger.info("Browser session initialized")
    
    async def close(self):
        """Close the browser session"""
        if self.session:
            await self.session.close()
    
    async def run_workflow(self, workflow_json: str) -> Dict[str, Any]:
        """Run a complete workflow from JSON"""
        try:
            workflow_data = json.loads(workflow_json)
            
            # Create workflow-specific logger
            workflow_name = workflow_data.get('metadata', {}).get('name', 'Unknown')
            workflow_id = workflow_data.get('metadata', {}).get('id', str(uuid.uuid4()))
            run_id = str(uuid.uuid4())
            
            # Create efficient workflow logger instance
            workflow_logger = create_workflow_logger_instance(workflow_id, workflow_name, run_id)
            
            # Log workflow start
            workflow_logger.log_workflow_start(workflow_name)
            workflow_logger.log_workflow_metadata(workflow_data.get('metadata', {}))
            
            # Initialize if not already done
            if not self.session:
                await self.initialize()
            
            # Get workflow components
            nodes = workflow_data.get('nodes', {})
            edges = workflow_data.get('edges', [])
            inputs = workflow_data.get('inputs', {})
            
            # Find starting nodes (nodes with no incoming edges)
            starting_nodes = self._find_starting_nodes(nodes, edges)
            workflow_logger.log_starting_nodes(starting_nodes)
            
            # Execute starting nodes
            context = {
                'inputs': inputs, 
                'results': {},
                'session': self.session,
                'nodes': nodes,
                'edges': edges,
                'properties': {},
                'workflow_id': workflow_id,
                'run_id': run_id,
                'workflow_logger': workflow_logger,
                'workflow_data': workflow_data  # Add workflow data for global error handling
            }
            
            for node_id in starting_nodes:
                await self._execute_node(node_id, nodes[node_id], context)
                await self._execute_successors(node_id, nodes, edges, context)
            
            # Log workflow completion
            workflow_logger.log_workflow_completion()
            
            # Display final workflow status (now at debug level)
            try:
                from utils.status_display import print_workflow_status
                print_workflow_status(workflow_data)
            except ImportError:
                workflow_logger.workflow_logger.debug("Status display utility not available")
            
            # Return JSON-serializable result
            return {
                'success': True,
                'results': context.get('results', {}),
                'workflow_id': workflow_id,
                'run_id': run_id,
                'workflow_name': workflow_name,
                'updated_workflow': workflow_data  # Include the updated workflow with statuses
            }
            
        except Exception as e:
            log.error(f"Error running workflow: {e}")
            raise
    
    def _find_starting_nodes(self, nodes: Dict, edges: List[Dict]) -> List[str]:
        """Find nodes with no incoming edges"""
        incoming_edges = set()
        for edge in edges:
            incoming_edges.add(edge['to'])
        
        starting_nodes = []
        for node_id in nodes.keys():
            if node_id not in incoming_edges:
                starting_nodes.append(node_id)
        
        return starting_nodes
    
    async def _execute_node(self, node_id: str, node_data: Dict, context: Dict) -> Dict[str, Any]:
        """Execute a single node using the registry"""
        import time
        from datetime import datetime
        
        # Get workflow logger from context
        workflow_logger = context.get('workflow_logger', self.logger)
        
        # Get node properties
        domain = node_data.get('domain', 'browser')
        type_name = node_data.get('type', 'action')
        subtype = node_data.get('subtype')
        inputs = node_data.get('inputs', {})
        properties = node_data.get('properties', {})
        error_handling = node_data.get('error_handling', {})
        
        # Get global error handling settings
        global_error_handling = context.get('workflow_data', {}).get('global_error_handling', {})
        
        # Update context with node properties
        context['properties'] = properties
        
        # Initialize node status tracking
        start_time = time.time()
        started_at = datetime.utcnow().isoformat()
        
        # Update node status to running
        node_data['status'] = 'running'
        node_data['started_at'] = started_at
        node_data['status_message'] = 'Node execution started'
        
        # Process template variables in inputs
        has_templates = TemplateEngine.has_template_variables(inputs)
        workflow_logger.log_template_processing(node_id, has_templates)
        if has_templates:
            inputs = TemplateEngine.process_template_variables(inputs, context)
        
        # Validate template variables
        missing_vars = TemplateEngine.validate_template_variables(inputs, context)
        workflow_logger.log_missing_templates(node_id, missing_vars)
        
        # Execute the node using registry
        try:
            workflow_logger.log_node_execution_start(node_id, domain, type_name, subtype)
            result = await execute_node(domain, type_name, subtype, inputs, context)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            completed_at = datetime.utcnow().isoformat()
            
            # Update node status to complete
            node_data['status'] = 'complete'
            node_data['completed_at'] = completed_at
            node_data['execution_time'] = execution_time
            node_data['status_message'] = 'Node completed successfully'
            
            # Store result in context
            context['results'][node_id] = result
            
            # Log success and result
            workflow_logger.log_node_success(node_id, execution_time)
            workflow_logger.log_node_result(node_id, result)
            return result
            
        except Exception as e:
            # Calculate execution time and update status
            execution_time = time.time() - start_time
            completed_at = datetime.utcnow().isoformat()
            
            # Get error type and message
            error_type = type(e).__name__
            error_message = str(e)
            
            # Update node status to error
            node_data['status'] = 'error'
            node_data['completed_at'] = completed_at
            node_data['execution_time'] = execution_time
            node_data['status_message'] = f"Node failed: {error_message}"
            
            # Create detailed error context
            error_context = {
                "node_id": node_id,
                "domain": domain,
                "type_name": type_name,
                "subtype": subtype,
                "error_type": error_type,
                "error_message": error_message,
                "inputs": inputs,
                "properties": properties
            }
            
            # Log error using workflow logger
            workflow_logger.log_node_error(node_id, e, error_handling, error_context)
            
            # Determine error handling strategy
            strategy = error_handling.get('strategy', global_error_handling.get('default_strategy', 'continue'))
            
            # Check for deprecated 'retry' field
            if error_handling.get('retry') and strategy == 'continue':
                strategy = 'retry'
            
            # Check error type specific handling
            continue_on_types = error_handling.get('continue_on_error_types', [])
            exit_on_types = error_handling.get('exit_on_error_types', [])
            
            if error_type in continue_on_types:
                strategy = 'continue'
            elif error_type in exit_on_types:
                strategy = 'exit'
            
            # Handle critical errors globally
            critical_types = global_error_handling.get('critical_error_types', ['KeyboardInterrupt', 'SystemExit', 'MemoryError'])
            if error_type in critical_types and global_error_handling.get('exit_on_critical_errors', True):
                strategy = 'exit'
            
            # Execute strategy
            if strategy == 'retry':
                return await self._handle_retry_strategy(node_id, node_data, context, e, error_handling, global_error_handling)
            elif strategy == 'fallback':
                return await self._handle_fallback_strategy(node_id, node_data, context, e, error_handling)
            elif strategy == 'pause':
                return await self._handle_pause_strategy(node_id, node_data, context, e, error_handling, global_error_handling)
            elif strategy == 'exit':
                return await self._handle_exit_strategy(node_id, node_data, context, e, error_handling)
            elif strategy == 'skip':
                return await self._handle_skip_strategy(node_id, node_data, context, e, error_handling)
            else:  # strategy == 'continue'
                return await self._handle_continue_strategy(node_id, node_data, context, e, error_handling)
    
    async def _handle_retry_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                   error_handling: Dict, global_error_handling: Dict) -> Dict[str, Any]:
        """Handle retry strategy"""
        workflow_logger = context.get('workflow_logger', self.logger)
        
        max_attempts = error_handling.get('max_attempts', global_error_handling.get('max_retries', 3))
        retry_count = context.get('retry_count', {}).get(node_id, 0)
        retry_delay = error_handling.get('retry_delay', global_error_handling.get('retry_delay', 1))
        
        if retry_count < max_attempts:
            workflow_logger.log_retry_attempt(node_id, retry_count + 1, max_attempts)
            context.setdefault('retry_count', {})[node_id] = retry_count + 1
            await asyncio.sleep(retry_delay)
            return await self._execute_node(node_id, node_data, context)
        else:
            workflow_logger.log_retry_failure(node_id, max_attempts)
            raise error
    
    async def _handle_fallback_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                      error_handling: Dict) -> Dict[str, Any]:
        """Handle fallback strategy"""
        workflow_logger = context.get('workflow_logger', self.logger)
        
        fallback_node = error_handling.get('fallback_node')
        if fallback_node and fallback_node in context['nodes']:
            workflow_logger.log_fallback_execution(node_id, fallback_node)
            return await self._execute_node(fallback_node, context['nodes'][fallback_node], context)
        else:
            workflow_logger.log_fallback_error(node_id)
            raise error
    
    async def _handle_pause_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                   error_handling: Dict, global_error_handling: Dict) -> Dict[str, Any]:
        """Handle pause strategy"""
        workflow_logger = context.get('workflow_logger', self.logger)
        
        pause_duration = error_handling.get('pause_duration', global_error_handling.get('pause_duration', 5))
        workflow_logger.log_pause_execution(node_id, pause_duration)
        await asyncio.sleep(pause_duration)
        
        # After pause, continue with next node
        return {
            'node_id': node_id,
            'status': 'paused_and_continued',
            'error': str(error),
            'pause_duration': pause_duration
        }
    
    async def _handle_exit_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                  error_handling: Dict) -> Dict[str, Any]:
        """Handle exit strategy"""
        workflow_logger = context.get('workflow_logger', self.logger)
        
        workflow_logger.log_workflow_exit(node_id, error)
        raise SystemExit(f"Workflow terminated due to error in node {node_id}: {error}")
    
    async def _handle_skip_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                  error_handling: Dict) -> Dict[str, Any]:
        """Handle skip strategy"""
        import time
        from datetime import datetime
        
        workflow_logger = context.get('workflow_logger', self.logger)
        
        # Update node status to skipped
        completed_at = datetime.utcnow().isoformat()
        node_data['status'] = 'skipped'
        node_data['completed_at'] = completed_at
        node_data['status_message'] = f"Node skipped due to error: {str(error)}"
        
        workflow_logger.log_skip_node(node_id)
        return {
            'node_id': node_id,
            'status': 'skipped',
            'error': str(error)
        }
    
    async def _handle_continue_strategy(self, node_id: str, node_data: Dict, context: Dict, error: Exception, 
                                      error_handling: Dict) -> Dict[str, Any]:
        """Handle continue strategy"""
        workflow_logger = context.get('workflow_logger', self.logger)
        
        workflow_logger.log_continue_after_error(node_id)
        return {
            'node_id': node_id,
            'status': 'failed_but_continued',
            'error': str(error)
        }
    
    async def _execute_successors(self, node_id: str, nodes: Dict, edges: List[Dict], context: Dict):
        """Execute all successor nodes"""
        # Find edges where this node is the source
        successors = []
        for edge in edges:
            if edge['from'] == node_id:
                successors.append(edge['to'])
        
        # Execute each successor
        for successor_id in successors:
            if successor_id in nodes:
                await self._execute_node(successor_id, nodes[successor_id], context)
                await self._execute_successors(successor_id, nodes, edges, context)
    
    def list_available_functions(self) -> Dict[str, Dict[str, list]]:
        """List all available functions in the registry"""
        return registry.list_functions()
    
    def get_workflow_status(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get current status of all nodes in a workflow"""
        try:
            from utils.status_display import get_node_status_summary
            summary = get_node_status_summary(workflow_data)
            
            # Get detailed status for each node
            node_statuses = {}
            for node_id, node_data in workflow_data.get('nodes', {}).items():
                node_statuses[node_id] = {
                    'status': node_data.get('status', 'queued'),
                    'status_message': node_data.get('status_message', ''),
                    'started_at': node_data.get('started_at', ''),
                    'completed_at': node_data.get('completed_at', ''),
                    'execution_time': node_data.get('execution_time', 0)
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
        log.info("Created ScalableWorkflowRunner instance")
        
        await runner.initialize()
        log.info("Runner initialization completed")
        
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
    import sys
    import asyncio
    
    # Run the main function which handles both persistent and single-execution modes
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 