# Workflow Executor

A Python CLI tool for executing browser automation workflows using Playwright. Designed to work with Electron apps and read workflow schemas from stdin.

## 🚀 Features

- **JSON-based workflows** - Define workflows using simple JSON schemas
- **Browser automation** - Fill forms, navigate pages using Playwright
- **Variable interpolation** - Use `{{variable}}` syntax in inputs
- **Conditional execution** - Add conditions to edges for branching logic
- **Node-based architecture** - Extensible handler system for different node types
- **Electron integration** - Connect to existing Chromium tabs

## 📦 Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install
```

## 🏗️ Architecture

```
workflow_executor.py          # Main entry point
engine/                       # Core workflow engine
├── __init__.py              # Engine package initialization
├── workflow_runner.py        # Core execution engine
├── handlers/                 # Node type implementations
│   ├── __init__.py          # Handler registry
│   ├── browser_autofill.py  # Form filling automation
│   ├── notification.py      # Message printing
│   └── llm_generate.py      # LLM integration (stub)
├── schemas/                  # JSON schema validation
│   └── workflow_schema.json # Workflow schema definition
└── examples/                 # Example workflows
    ├── example_workflow.json
    └── example_conditional_workflow.json
requirements.txt              # Dependencies
test_engine.py               # Engine testing
```

## 📝 Usage

### Basic Usage

```bash
# Execute a workflow from JSON file
python workflow_executor.py < engine/examples/example_workflow.json

# Execute from stdin
echo '{"nodes": {...}}' | python workflow_executor.py

# Test the engine
python test_engine.py
```

### Workflow JSON Structure

```json
{
  "metadata": {
    "name": "Workflow Name",
    "author": "Author Name"
  },
  "inputs": {
    "variable_name": "value"
  },
  "nodes": {
    "node_id": {
      "type": "node_type",
      "inputs": {
        "param1": "value1",
        "param2": "{{variable_name}}"
      }
    }
  },
  "edges": [
    {
      "from": "node_id",
      "to": "next_node_id",
      "condition": "optional_condition"
    }
  ]
}
```

## 🔧 Node Types

### notification
Prints messages with different levels.

**Inputs:**
- `message` (string): The message to display
- `level` (string): Message level (info, warning, error, success)

**Example:**
```json
{
  "type": "notification",
  "inputs": {
    "message": "Starting workflow...",
    "level": "info"
  }
}
```

### browser_autofill
Fills form fields in a web page.

**Inputs:**
- `url` (string): The URL to navigate to
- `fields` (object): CSS selectors mapped to values

**Example:**
```json
{
  "type": "browser_autofill",
  "inputs": {
    "url": "https://example.com/form",
    "fields": {
      "#name": "John Doe",
      "#email": "john@example.com"
    }
  }
}
```

### llm_generate (Stub)
Placeholder for LLM text generation.

**Inputs:**
- `prompt` (string): The prompt to send to the LLM
- `model` (string): The model to use

## 🔄 Variable Interpolation

Use `{{variable_name}}` syntax to reference:
- Global inputs
- Outputs from previous nodes
- Context variables

**Example:**
```json
{
  "inputs": {
    "name": "John Doe"
  },
  "nodes": {
    "fill_form": {
      "type": "browser_autofill",
      "inputs": {
        "url": "https://example.com",
        "fields": {
          "#name": "{{name}}"
        }
      }
    }
  }
}
```

## 🔀 Conditional Execution

Add conditions to edges using Python expressions:

```json
{
  "edges": [
    {
      "from": "node1",
      "to": "node2",
      "condition": "len(outputs['node1']['result']) > 0"
    }
  ]
}
```

## 🔌 Electron Integration

The browser autofill handler can connect to existing Chromium tabs:

1. Launch Electron with remote debugging:
   ```bash
   electron --remote-debugging-port=9222
   ```

2. The workflow executor will automatically connect to the existing browser instance.

### 🚀 Using with the Commander App

The workflow executor is designed to work with the Commander Electron app:

1. **Start the Commander app** (which now has remote debugging enabled)
2. **Run workflows** that will execute in the existing browser window:

```bash
# Test browser connection
python test_browser_connection.py

# Execute workflow in existing browser
python engine/workflow_executor.py < engine/examples/electron_workflow.json
```

### 🔧 Browser Integration Features

- ✅ **Connects to existing browser** - No need to launch new browser instances
- ✅ **Uses current page** - Works with the page already open in the app
- ✅ **Form filling** - Automatically fills forms in the existing browser window
- ✅ **Navigation** - Can navigate to new URLs within the app
- ✅ **Graceful fallback** - Falls back to new browser if connection fails

### 📋 Example Workflow for Electron

The `engine/examples/electron_workflow.json` demonstrates:
- Connecting to the existing browser window
- Filling forms in the current page
- Using variable interpolation
- Providing user feedback through notifications

## 🧪 Testing

```bash
# Test with example workflow
python workflow_executor.py < engine/examples/example_workflow.json

# Test the engine
python test_engine.py

# Expected output:
# 🚀 Starting workflow: Contact Form Automation
# 👤 Author: Workflow Builder
# 📍 Starting with 1 node(s): start_notification
# 🔧 Executing node 'start_notification' (type: notification)
# ℹ️  Starting contact form automation...
# ✅ Node 'start_notification' completed successfully
# ➡️  Following edge to 'fill_contact_form'
# ...
```

## 🔧 Development

### Adding New Node Types

1. Create a new handler in `engine/handlers/`:
   ```python
   class MyHandler:
       async def execute(self, inputs, context):
           # Your logic here
           return output
   ```

2. Register it in `engine/handlers/__init__.py`:
   ```python
   from .my_handler import MyHandler
   _HANDLERS['my_type'] = MyHandler
   ```

### Error Handling

The executor provides detailed error messages and continues execution where possible. Failed nodes are logged but don't stop the entire workflow.

## 📄 License

MIT License - see LICENSE file for details.