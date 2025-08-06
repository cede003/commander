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

try:
    from browser.session import BrowserSession
    from registry.function_registry import registry, execute_node
    from utils.template_engine import TemplateEngine
    from utils.logger import setup_logger, create_workflow_logger, create_run_logger, log
except ImportError:
    # Fallback for when run as standalone script
    try:
        from .browser.session import BrowserSession
        from .registry.function_registry import registry, execute_node
        from .utils.template_engine import TemplateEngine
        from .utils.logger import setup_logger, create_workflow_logger, create_run_logger, log
    except ImportError:
        # Final fallback - add parent directory to path
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        from engine.browser.session import BrowserSession
        from engine.registry.function_registry import registry, execute_node
        from engine.utils.template_engine import TemplateEngine
        from engine.utils.logger import setup_logger, create_workflow_logger, create_run_logger, log


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
            
            workflow_logger = create_workflow_logger(workflow_id, workflow_name)
            run_logger = create_run_logger(run_id, workflow_id)
            
            workflow_logger.info(f"Starting workflow: {workflow_name}")
            workflow_logger.debug(f"Author: {workflow_data.get('metadata', {}).get('author', 'Unknown')}")
            run_logger.info(f"Starting workflow run: {workflow_name}")
            
            # Initialize if not already done
            if not self.session:
                await self.initialize()
            
            # Get workflow components
            nodes = workflow_data.get('nodes', {})
            edges = workflow_data.get('edges', [])
            inputs = workflow_data.get('inputs', {})
            
            # Find starting nodes (nodes with no incoming edges)
            starting_nodes = self._find_starting_nodes(nodes, edges)
            workflow_logger.debug(f"Starting with {len(starting_nodes)} node(s): {', '.join(starting_nodes)}")
            
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
                'run_logger': run_logger
            }
            
            for node_id in starting_nodes:
                await self._execute_node(node_id, nodes[node_id], context)
                await self._execute_successors(node_id, nodes, edges, context)
            
            # Info level: Just show completion status
            workflow_logger.info("Workflow completed successfully")
            run_logger.info("Workflow run completed successfully")
            
            # Debug level: Show detailed results
            run_logger.debug("Workflow results", { "results": context.get('results', {}) })
            return context
            
        except Exception as e:
            # Info level: Just show failure status
            log.info("Workflow failed")
            
            # Debug level: Show detailed error
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
        # Get loggers from context
        workflow_logger = context.get('workflow_logger', self.logger)
        run_logger = context.get('run_logger', self.logger)
        
        # Get node properties
        domain = node_data.get('domain', 'browser')
        type_name = node_data.get('type', 'action')
        subtype = node_data.get('subtype')
        inputs = node_data.get('inputs', {})
        properties = node_data.get('properties', {})
        error_handling = node_data.get('error_handling', {})
        
        # Update context with node properties
        context['properties'] = properties
        
        # Process template variables in inputs
        if TemplateEngine.has_template_variables(inputs):
            workflow_logger.debug(f"Processing template variables in node {node_id}")
            inputs = TemplateEngine.process_template_variables(inputs, context)
        
        # Validate template variables
        missing_vars = TemplateEngine.validate_template_variables(inputs, context)
        if missing_vars:
            workflow_logger.warning(f"Missing template variables in node {node_id}: {missing_vars}")
        
        # Execute the node using registry
        try:
            workflow_logger.debug(f"Executing node: {node_id} (domain: {domain}, type: {type_name}, subtype: {subtype})")
            result = await execute_node(domain, type_name, subtype, inputs, context)
            
            # Store result in context
            context['results'][node_id] = result
            
            # Info level: Just show completion status
            workflow_logger.info(f"Node {node_id} completed successfully")
            
            # Debug level: Show detailed result
            run_logger.debug(f"Node {node_id} result", { "result": result })
            return result
            
        except Exception as e:
            # Info level: Just show failure status
            workflow_logger.info(f"Node {node_id} failed")
            
            # Debug level: Show detailed error
            run_logger.error(f"Node {node_id} failed", { 
                "error": str(e), 
                "node_id": node_id, 
                "domain": domain, 
                "type_name": type_name, 
                "subtype": subtype 
            })
            
            # Handle error based on error_handling configuration
            fallback_node = error_handling.get('fallback_node')
            if fallback_node and fallback_node in context['nodes']:
                workflow_logger.info(f"Executing fallback node: {fallback_node}")
                return await self._execute_node(fallback_node, context['nodes'][fallback_node], context)
            
            # Check for retry configuration
            max_retries = error_handling.get('max_retries', 0)
            retry_count = context.get('retry_count', {}).get(node_id, 0)
            
            if retry_count < max_retries:
                workflow_logger.info(f"Retrying node {node_id} ({retry_count + 1}/{max_retries})")
                context.setdefault('retry_count', {})[node_id] = retry_count + 1
                await asyncio.sleep(error_handling.get('retry_delay', 1))
                return await self._execute_node(node_id, node_data, context)
            
            raise e
    
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


async def main():
    """Main entry point for workflow execution"""
    try:
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


if __name__ == "__main__":
    import sys
    import asyncio

    if len(sys.argv) < 2:
        log.error("Usage: python runner.py '<workflow_json>'")
        sys.exit(1)

    workflow_json = sys.argv[1]
    runner = ScalableWorkflowRunner()
    async def run():
        await runner.initialize()
        try:
            await runner.run_workflow(workflow_json)
        finally:
            await runner.close()
    asyncio.run(run()) 