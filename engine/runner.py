"""
Scalable Workflow Runner - Uses registry for dynamic function dispatch
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any, List, Optional

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from browser.session import BrowserSession
    from registry.function_registry import registry, execute_node
    from utils.template_engine import TemplateEngine
except ImportError:
    # Fallback for when run as standalone script
    try:
        from .browser.session import BrowserSession
        from .registry.function_registry import registry, execute_node
        from .utils.template_engine import TemplateEngine
    except ImportError:
        # Final fallback - add parent directory to path
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        from engine.browser.session import BrowserSession
        from engine.registry.function_registry import registry, execute_node
        from engine.utils.template_engine import TemplateEngine


class ScalableWorkflowRunner:
    """Scalable workflow runner using registry for dynamic function dispatch"""
    
    def __init__(self):
        self.session: Optional[BrowserSession] = None
    
    async def initialize(self):
        """Initialize browser session"""
        print("🚀 Initializing scalable workflow runner...")
        
        # Initialize browser session
        self.session = BrowserSession()
        await self.session.init()
        
        print("✅ Browser session initialized")
    
    async def close(self):
        """Close the browser session"""
        if self.session:
            await self.session.close()
    
    async def run_workflow(self, workflow_json: str) -> Dict[str, Any]:
        """Run a complete workflow from JSON"""
        try:
            workflow_data = json.loads(workflow_json)
            
            print(f"🚀 Starting workflow: {workflow_data.get('metadata', {}).get('name', 'Unknown')}")
            print(f"👤 Author: {workflow_data.get('metadata', {}).get('author', 'Unknown')}")
            
            # Initialize if not already done
            if not self.session:
                await self.initialize()
            
            # Get workflow components
            nodes = workflow_data.get('nodes', {})
            edges = workflow_data.get('edges', [])
            inputs = workflow_data.get('inputs', {})
            
            # Find starting nodes (nodes with no incoming edges)
            starting_nodes = self._find_starting_nodes(nodes, edges)
            print(f"📍 Starting with {len(starting_nodes)} node(s): {', '.join(starting_nodes)}")
            
            # Execute starting nodes
            context = {
                'inputs': inputs, 
                'results': {},
                'session': self.session,
                'nodes': nodes,
                'edges': edges,
                'properties': {}
            }
            
            for node_id in starting_nodes:
                await self._execute_node(node_id, nodes[node_id], context)
                await self._execute_successors(node_id, nodes, edges, context)
            
            print("✅ Workflow completed successfully")
            return context
            
        except Exception as e:
            print(f"❌ Error running workflow: {e}")
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
        print(f"🎯 Executing node: {node_id}")
        
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
            print(f"🔧 Processing template variables in node {node_id}")
            inputs = TemplateEngine.process_template_variables(inputs, context)
        
        # Validate template variables
        missing_vars = TemplateEngine.validate_template_variables(inputs, context)
        if missing_vars:
            print(f"⚠️  Missing template variables in node {node_id}: {missing_vars}")
        
        # Execute the node using registry
        try:
            result = await execute_node(domain, type_name, subtype, inputs, context)
            
            # Store result in context
            context['results'][node_id] = result
            
            print(f"✅ Node {node_id} completed successfully")
            return result
            
        except Exception as e:
            print(f"❌ Error executing node {node_id}: {e}")
            
            # Handle error based on error_handling configuration
            fallback_node = error_handling.get('fallback_node')
            if fallback_node and fallback_node in context['nodes']:
                print(f"🔄 Executing fallback node: {fallback_node}")
                return await self._execute_node(fallback_node, context['nodes'][fallback_node], context)
            
            # Check for retry configuration
            max_retries = error_handling.get('max_retries', 0)
            retry_count = context.get('retry_count', {}).get(node_id, 0)
            
            if retry_count < max_retries:
                print(f"🔄 Retrying node {node_id} ({retry_count + 1}/{max_retries})")
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
            print("❌ No workflow JSON provided")
            return 1
        
        # Create runner
        runner = ScalableWorkflowRunner()
        
        try:
            # Run the workflow
            result = await runner.run_workflow(workflow_json)
            print("✅ Workflow execution completed successfully")
            return 0
            
        finally:
            # Clean up
            await runner.close()
            
    except Exception as e:
        print(f"❌ Workflow execution failed: {e}")
        return 1


if __name__ == "__main__":
    import sys
    import asyncio

    if len(sys.argv) < 2:
        print("Usage: python runner.py '<workflow_json>'")
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