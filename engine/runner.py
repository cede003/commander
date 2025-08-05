"""
Workflow Runner - Interprets and executes node JSON using browser components
"""

import asyncio
import json
import sys
from typing import Dict, Any, List, Optional
from browser.session import BrowserSession
from browser.observations import BrowserObservations
from browser.events import BrowserEvents


class WorkflowRunner:
    """Interprets and executes workflow nodes using browser components"""
    
    def __init__(self):
        self.session: Optional[BrowserSession] = None
        self.actions: Optional[object] = None
        self.observations: Optional[BrowserObservations] = None
        self.events: Optional[BrowserEvents] = None
    
    async def initialize(self):
        """Initialize browser session and components"""
        print("🚀 Initializing workflow runner...")
        
        # Initialize browser session
        self.session = BrowserSession()
        await self.session.init()
        
        # Initialize browser components
        page = self.session.get_page()
        if page:
            self.observations = BrowserObservations(page)
            self.events = BrowserEvents(page)
            print("✅ Browser components initialized")
        else:
            raise Exception("Failed to get browser page")
    
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
                'edges': edges
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
        """Execute a single node based on its type and subtype"""
        node_id = node_data.get('id', node_id)
        node_domain = node_data.get('domain', 'browser')
        node_type = node_data.get('type')
        node_subtype = node_data.get('subtype')
        inputs = node_data.get('inputs', {})
        outputs = node_data.get('outputs', {})
        error_handling = node_data.get('error_handling', {})
        
        print(f"🔧 Executing node '{node_id}' (domain: {node_domain}, type: {node_type}, subtype: {node_subtype})")
        
        # Process template variables in inputs
        processed_inputs = self._process_template_variables(inputs, context)
        
        # Add node properties to context for function access
        context['properties'] = node_data.get('properties', {})
        
        # Execute with error handling
        max_attempts = error_handling.get('max_attempts', 1)
        retry = error_handling.get('retry', False)
        fallback_node = error_handling.get('fallback_node')
        
        for attempt in range(max_attempts):
            try:
                # Dynamically load and execute the function
                result = await self._execute_dynamic_function(node_domain, node_type, node_subtype, processed_inputs, context)
                
                # Store result in context
                context['results'][node_id] = result
                
                print(f"✅ Node '{node_id}' completed successfully")
                return result
                
            except Exception as e:
                print(f"❌ Error in node '{node_id}' (attempt {attempt + 1}/{max_attempts}): {e}")
                
                if attempt + 1 >= max_attempts:
                    if fallback_node:
                        print(f"🔄 Falling back to node: {fallback_node}")
                        return await self._execute_node(fallback_node, context['nodes'][fallback_node], context)
                    else:
                        raise e
                elif retry:
                    print(f"🔄 Retrying node '{node_id}'...")
                    await asyncio.sleep(1)  # Brief delay before retry
                else:
                    raise e
    
    async def _execute_dynamic_function(self, domain: str, type_name: str, subtype: str, inputs: Dict, context: Dict) -> Dict[str, Any]:
        """Dynamically load and execute a function based on domain/type/subtype"""
        try:
            # Import the module
            module_path = f"{domain}.{type_name}"
            module = __import__(module_path, fromlist=[subtype])
            
            # Get the function directly
            function = getattr(module, subtype)
            
            # Call the async function
            if asyncio.iscoroutinefunction(function):
                result = await function(inputs, context)
            else:
                result = function(inputs, context)
            
            return result
            
        except ImportError as e:
            raise Exception(f"Could not import {domain}.{type_name}.{subtype}: {e}")
        except AttributeError as e:
            raise Exception(f"Function {subtype} not found in {domain}.{type_name}: {e}")
        except Exception as e:
            raise Exception(f"Error executing {domain}.{type_name}.{subtype}: {e}")
    
    def _process_template_variables(self, inputs: Dict, context: Dict) -> Dict:
        """Process template variables like {{inputs.customer_name}}"""
        processed = {}
        
        for key, value in inputs.items():
            if isinstance(value, str):
                # Replace template variables
                processed_value = value
                if '{{inputs.' in value:
                    for input_key, input_value in context.get('inputs', {}).items():
                        placeholder = f"{{{{inputs.{input_key}}}}}"
                        processed_value = processed_value.replace(placeholder, str(input_value))
                processed[key] = processed_value
            elif isinstance(value, dict):
                # Recursively process nested dictionaries
                processed[key] = self._process_template_variables(value, context)
            else:
                processed[key] = value
        
        return processed
    
    async def _execute_notification(self, inputs: Dict, context: Dict) -> Dict[str, Any]:
        """Execute notification operation"""
        message = inputs.get('message', '')
        title = inputs.get('title', 'Notification')
        
        print(f"📢 {title}: {message}")
        
        return {
            'message': message,
            'title': title,
            'success': True
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


async def main():
    """Main entry point for workflow execution"""
    try:
        # Read workflow JSON from stdin
        workflow_json = sys.stdin.read().strip()
        
        if not workflow_json:
            print("❌ No workflow JSON provided")
            return 1
        
        # Create runner
        runner = WorkflowRunner()
        
        try:
            # Run the workflow
            result = await runner.run_workflow(workflow_json)
            print("✅ Workflow execution completed successfully")
            return 0
            
        finally:
            # Always close the browser session
            await runner.close()
            
    except Exception as e:
        print(f"❌ Error in main: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 