#!/usr/bin/env python3

"""
Test script to demonstrate the new Python logging behavior
"""

import json
import sys
import os

# Add the engine directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'engine'))

from runner import ScalableWorkflowRunner
import asyncio

# Test workflow
test_workflow = {
    "metadata": {
        "name": "Test Logging Workflow",
        "author": "Test Author"
    },
    "nodes": {
        "navigate": {
            "type": "action",
            "domain": "browser",
            "inputs": {
                "url": "https://www.google.com"
            }
        },
        "get_title": {
            "type": "observation",
            "domain": "browser",
            "inputs": {},
            "properties": {
                "result_key": "page_title"
            }
        },
        "notify": {
            "type": "notification",
            "domain": "browser",
            "inputs": {
                "message": "Page title retrieved",
                "level": "info"
            }
        }
    },
    "edges": [
        {"from": "navigate", "to": "get_title"},
        {"from": "get_title", "to": "notify"}
    ]
}

async def test_logging():
    """Test the new logging behavior"""
    print("🧪 Testing Python logging behavior...")
    print("=" * 50)
    
    # Test with INFO level (should show only completion status)
    print("\n📋 INFO Level Logging (completion status only):")
    print("-" * 40)
    
    # Set environment variable for INFO level
    os.environ['LOG_LEVEL'] = 'info'
    
    runner = ScalableWorkflowRunner()
    try:
        await runner.initialize()
        result = await runner.run_workflow(json.dumps(test_workflow))
        print("✅ INFO level test completed")
    except Exception as e:
        print(f"❌ INFO level test failed: {e}")
    finally:
        await runner.close()
    
    print("\n" + "=" * 50)
    
    # Test with DEBUG level (should show detailed output)
    print("\n🔍 DEBUG Level Logging (detailed output):")
    print("-" * 40)
    
    # Set environment variable for DEBUG level
    os.environ['LOG_LEVEL'] = 'debug'
    
    runner = ScalableWorkflowRunner()
    try:
        await runner.initialize()
        result = await runner.run_workflow(json.dumps(test_workflow))
        print("✅ DEBUG level test completed")
    except Exception as e:
        print(f"❌ DEBUG level test failed: {e}")
    finally:
        await runner.close()
    
    print("\n" + "=" * 50)
    print("🎉 Logging test completed!")

if __name__ == "__main__":
    asyncio.run(test_logging()) 