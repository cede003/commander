# Commander - Electron Desktop Browser

A modern Electron desktop application built with React, TypeScript, and Tailwind CSS. Features a Chromium webview browser interface with tab management and an AI chatbot.

## Features

### 🌐 Browser Interface
- **Chromium Webview**: Full-featured browser with persistent cookies
- **URL Bar**: Updates on navigation and accepts user input
- **Navigation Controls**: Back/forward buttons that reflect browser history
- **Context Menu**: Right-click support with macOS compatibility (Control + click)
- **Persistent Sessions**: Cookies and sessions persist across app restarts

### 📑 Tab Management
- **Current Tabs**: Active/open tabs with live previews
- **Closed Tabs**: Recently closed tabs that can be reopened
- **Tab Switching**: Click to activate different tabs
- **Tab Closing**: Close tabs with X button
- **Tab Reopening**: Click closed tabs to reopen them
- **Shared Sessions**: All tabs share cookies and login sessions

### 🎛️ Sidebar
- **Resizable**: Drag to resize the sidebar width
- **Tab Preview**: See current URL and title for each tab
- **Scrollable**: Handles overflow content gracefully
- **AI Chatbot**: Fixed-height chatbot section (LangChain integration ready)

### 🤖 AI Assistant
- **Chat Interface**: Modern chat UI with message bubbles
- **Loading States**: Visual feedback during AI processing
- **LangChain Ready**: Placeholder for LangChain integration
- **Persistent Chat**: Chat history maintained during session

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI library with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **LangChain** - AI/LLM integration (placeholder)

## Project Structure

```
commander/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry point
│   ├── preload.ts     # Preload script for IPC
│   └── tsconfig.json  # TypeScript config for main
├── src/               # React renderer process
│   ├── components/    # React components
│   │   ├── BrowserInterface.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TabList.tsx
│   │   ├── Webview.tsx
│   │   └── Chatbot.tsx
│   ├── types.ts       # TypeScript definitions
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # React entry point
│   └── index.css      # Global styles with Tailwind
├── dist/              # Built files
├── package.json       # Dependencies and scripts
├── vite.config.ts     # Vite configuration
├── tailwind.config.js # Tailwind configuration
└── tsconfig.json      # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd commander
   npm install
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```
   This starts both the Vite dev server and Electron app concurrently.

3. **Build for production:**
   ```bash
   npm run build
   npm run dist
   ```

### Development Scripts

- `npm run dev` - Start development mode (Vite + Electron)
- `npm run dev:vite` - Start only Vite dev server
- `npm run dev:electron` - Start only Electron (waits for Vite)
- `npm run build` - Build for production
- `npm run dist` - Create distributable packages

## Key Features Implementation

### Webview Configuration
The webview uses Electron's `persist:` partition for persistent cookies:
```typescript
<webview
  partition="persist:commander"
  webpreferences="contextIsolation=yes, nodeIntegration=no"
/>
```

### Tab Management
Tabs are managed in two sections:
- **Current**: Active tabs with full functionality
- **Closed**: Recently closed tabs that can be reopened

### Resizable Sidebar
The sidebar can be resized by dragging the left edge:
- Minimum width: 200px
- Maximum width: 600px
- Smooth resize with mouse events

### Context Menu Support
Right-click context menu is handled with proper event prevention:
```typescript
const handleContextMenu = (event: any) => {
  event.preventDefault();
  // Custom context menu implementation
};
```

## Customization

### Adding New Features
1. **New Tab Actions**: Extend the `Tab` interface in `src/types.ts`
2. **Custom Context Menus**: Implement in `BrowserInterface.tsx`
3. **LangChain Integration**: Replace placeholder in `Chatbot.tsx`

### Styling
The app uses Tailwind CSS for styling. Custom styles can be added to:
- `src/index.css` for global styles
- Component-specific classes in each component

### Electron Configuration
Main process configuration is in `electron/main.ts`:
- Window size and properties
- IPC handlers
- Session management

## Building and Distribution

### Development Build
```bash
npm run build
```

### Production Distribution
```bash
npm run dist
```

This creates platform-specific packages in the `release/` directory.

## Troubleshooting

### Common Issues

1. **Webview not loading**: Ensure the webview partition is properly configured
2. **IPC errors**: Check that preload script is correctly exposing APIs
3. **Build errors**: Verify all TypeScript types are properly defined

### Development Tips

- Use `console.log` in the main process for debugging
- Check the Electron DevTools for renderer process debugging
- Monitor the Vite dev server console for build issues

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

Built with ❤️ using Electron, React, TypeScript, and Tailwind CSS. 