# Commander - AI-Powered Browser Automation Platform

Commander is a sophisticated desktop application that combines browser automation, workflow execution, and AI capabilities to create a powerful platform for autonomous web interactions. Built with Electron, React, TypeScript, and Python, it enables users to create, share, and execute deterministic JSON workflows while incorporating AI agents for intelligent browser automation.

## Core Features

### **Browser Automation Engine**
- **Playwright Integration**: Full browser automation using Playwright with 50+ built-in actions
- **Session Management**: Persistent browser sessions with CDP (Chrome DevTools Protocol) integration
- **Real-time Control**: Direct manipulation of browser elements, forms, and navigation
- **Cross-platform**: Works on Windows, macOS, and Linux

### **Workflow System**
- **JSON-based Workflows**: Define complex automation sequences using declarative JSON schemas
- **Node-based Architecture**: Extensible system with domain.operation tool structure
- **Variable Interpolation**: Dynamic content using Jinja2 templating with `{{variable}}` syntax
- **Conditional Execution**: Branching logic and error handling with retry mechanisms
- **Workflow Sharing**: Export/import workflows for collaboration and distribution

### **AI Integration**
- **LangChain Integration**: Built-in support for AI agents and language models
- **Conversation Memory**: Maintains context across workflow executions
- **Tool Registry**: Extensible tool system for AI agents to interact with the browser
- **State Management**: TypedDict-based workflow state with conversation history

### **Modern Desktop App**
- **Electron Framework**: Native desktop application with web technologies
- **React + TypeScript**: Modern, responsive UI with type safety
- **Tailwind CSS**: Beautiful, customizable interface with dark/light mode
- **Real-time Updates**: Live workflow execution monitoring and progress tracking

## Architecture Overview

```
Commander Application
├── Frontend (React + TypeScript)
│   ├── Main App Interface
│   ├── Workflow Management
│   ├── Browser Pane Integration
│   └── Real-time Execution Monitoring
├── Backend (Electron + Python)
│   ├── Browser View Management
│   ├── IPC Communication
│   ├── Python Process Management
│   └── Workflow Execution Engine
└── Engine (Python + LangGraph)
    ├── Commander Engine
    ├── Tool Registry & Factory
    ├── Browser Session Management
    ├── Workflow State Management
    └── AI Agent Integration
```

## Technology Stack

### **Frontend**
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** for modern, responsive styling
- **Vite** for fast development and building
- **Electron** for cross-platform desktop deployment

### **Backend**
- **Electron 28** with remote debugging capabilities
- **Node.js** IPC handlers for frontend-backend communication
- **Python 3.7+** for workflow execution engine
- **Playwright** for browser automation

### **AI & Workflow Engine**
- **LangChain** for AI agent framework
- **LangGraph** for workflow orchestration
- **Jinja2** for template processing
- **Pydantic** for data validation

## Installation & Setup

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.7+** with pip
- **Git** for version control

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd commander

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install

# Start development mode
npm run dev
```

### Build & Distribution
```bash
# Build for production
npm run build

# Create distributable packages
npm run dist

# Clean build artifacts
npm run clean
```

## Workflow System

### **Workflow Structure**
Workflows are defined using a JSON schema with nodes, edges, and metadata:

```json
{
  "metadata": {
    "name": "Workflow Name",
    "description": "Workflow description",
    "version": "1.0.0"
  },
  "arguments": {
    "base_url": "https://example.com"
  },
  "nodes": {
    "navigate": {
      "domain": "browser",
      "operation": "goto",
      "arguments": {
        "url": "{{inputs.base_url}}"
      }
    }
  },
  "edges": [
    {
      "from": "navigate",
      "to": "next_action"
    }
  ]
}
```

### **Available Browser Operations**
The platform provides 50+ Playwright actions all under the `browser` domain:

#### **Navigation**
- `browser.goto`, `browser.reload`, `browser.go_back`, `browser.go_forward`

#### **Basic Interaction**
- `browser.click`, `browser.dblclick`, `browser.fill`, `browser.type`, `browser.press`, `browser.hover`, `browser.focus`, `browser.blur`, `browser.tap`, `browser.drag_to`

#### **Form Controls**
- `browser.select_option`, `browser.check`, `browser.uncheck`

#### **Information Extraction**
- `browser.text_content`, `browser.get_attribute`, `browser.title`, `browser.url`, `browser.content`, `browser.inner_html`, `browser.outer_html`, `browser.query_selector`, `browser.query_selector_all`

#### **Element Properties**
- `browser.is_visible`, `browser.is_hidden`, `browser.is_enabled`, `browser.is_disabled`, `browser.is_checked`, `browser.bounding_box`

#### **Waiting & Synchronization**
- `browser.wait_for_selector`, `browser.wait_for_load_state`, `browser.wait_for_function`, `browser.wait_for_event`, `browser.wait_for_url`, `browser.wait_for_timeout`

#### **Utilities**
- `browser.screenshot`, `browser.scroll_into_view_if_needed`, `browser.scroll_to`

### **Variable Interpolation**
Use $ref templating for dynamic content:
```json
{
  "arguments": {
    "url": "$base_url/$page",
    "selector": "input[name='$inputs.field_name']"
  }
}
```

## AI Agent Integration

### **LangChain Tools**
The platform automatically registers all browser operations as LangChain tools, enabling AI agents to:
- Navigate websites autonomously
- Fill forms based on natural language instructions
- Extract information using semantic understanding
- Make decisions based on page content

### **Conversation Memory**
- Maintains context across workflow executions
- Stores conversation history for AI agents
- Enables multi-turn interactions and learning

### **Tool Registry**
- **Domain.Operation Structure**: All browser tools use `browser.{operation}` naming (e.g., `browser.click`, `browser.fill`, `browser.goto`)
- **Automatic Registration**: Playwright actions are automatically registered from specifications
- **Extensible**: Custom tools can be added using the `@register_tool` decorator
- **LangChain Integration**: All tools are automatically available to LangChain agents

## Use Cases

### **Business Automation**
- **Form Filling**: Automate repetitive data entry tasks
- **Data Extraction**: Scrape and collect information from websites
- **Testing**: Automated testing of web applications
- **Monitoring**: Check website status and functionality

### **AI-Powered Interactions**
- **Intelligent Navigation**: AI agents that understand user intent
- **Content Analysis**: Automated content processing and decision making
- **Conversational Interfaces**: Natural language workflow creation
- **Learning Systems**: Agents that improve with experience

### **Workflow Sharing**
- **Template Library**: Pre-built workflows for common tasks
- **Collaboration**: Share workflows with team members
- **Distribution**: Package workflows for end users
- **Version Control**: Track workflow changes and improvements

## Development Roadmap

### **Phase 1: Electron UI and Browser Integration (Current)**
- [x] **Electron Desktop Application**: Native desktop app with React frontend
- [x] **Browser View Management**: Integrated browser pane with real-time control
- [x] **Playwright Integration**: Full browser automation with Playwright functions
- [x] **IPC Communication**: Seamless frontend-backend communication
- [x] **Session Management**: Persistent browser sessions with health monitoring
- [x] **LangGraph Orchestration**: Enable Playwright to be orchestrated by LangGraph
- [x] **Tool Registry**: Automatic registration of browser operations as LangChain tools
- [x] **Workflow Execution**: JSON-based workflow system with node-based architecture
- [ ] **Real-time Monitoring**: Live workflow execution tracking and progress updates

### **Phase 2: Advanced LangChain Integration**
- [ ] **Natural Language Workflow Creation**: Generate workflows from text descriptions
- [ ] **AI-Powered Error Recovery**: Intelligent handling of automation failures
- [ ] **Contextual Decision Making**: AI agents that understand page context
- [ ] **Multi-modal Input**: Support for voice, image, and text inputs
- [ ] **Conversation Memory Enhancement**: Advanced context management across sessions
- [ ] **Intelligent Form Filling**: AI agents that understand form semantics

### **Phase 3: Advanced Workflow Features**
- [ ] **Visual Workflow Builder**: Drag-and-drop workflow creation interface
- [ ] **Conditional Logic**: Advanced branching and decision trees
- [ ] **Parallel Execution**: Concurrent workflow execution
- [ ] **Workflow Templates**: Industry-specific workflow libraries
- [ ] **Advanced Templating**: Enhanced variable interpolation and dynamic content

### **Phase 4: Enterprise Features**
- [ ] **Multi-user Support**: Team collaboration and role-based access
- [ ] **Workflow Analytics**: Execution metrics and performance insights
- [ ] **API Integration**: REST API for external system integration
- [ ] **Cloud Synchronization**: Workflow backup and sharing across devices

### **Phase 5: Ecosystem Expansion**
- [ ] **Plugin System**: Third-party tool and integration support
- [ ] **Marketplace**: Workflow and tool marketplace
- [ ] **Mobile Support**: Companion mobile applications
- [ ] **API Gateway**: Cloud-based workflow execution service

## Development & Testing

### **Development Commands**
```bash
# Start development environment
npm run dev

# Build TypeScript
npm run dev:types

# Build Electron
npm run dev:electron

# Kill all processes
npm run kill
```

### **Testing**
```bash
# Test workflow execution
python engine/execution/runner.py

# Test browser connection
python test_browser_connection.py

# Validate workflow schemas
python -m engine.utils.evaluation.workflow_validation
```

### **Logging**
The application uses structured logging with configurable levels:
- **Minimal Logging**: Only logs when tools run and when they fail
- **Debug Mode**: Enable with `LOG_LEVEL=debug`
- **Log Directory**: Stored in `logs/` folder

## Contributing

### **Code Structure**
- **Frontend**: React components in `src/components/`
- **Backend**: Electron main process in `electron/`
- **Engine**: Python workflow engine in `engine/`
- **Examples**: Sample workflows in `public/`

### **Development Guidelines**
- Follow TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for new features

## License

MIT License - see LICENSE file for details.

## Links

- **Documentation**: [Project Wiki]
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]
- **Releases**: [GitHub Releases]

---

**Commander** - Empowering users to automate the web with intelligence and precision.