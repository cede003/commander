# Logging Consistency Improvements

## Issues Fixed

### 1. IPC Handler Registration Timing
**Problem**: The `logEntry` handler was being registered after window creation, causing "No handler registered for 'logEntry'" errors.

**Solution**: Moved IPC handler setup to occur before window creation in `electron/main.ts`:
```typescript
// Set up IPC handlers FIRST - before creating any windows
setupIpcHandlers();

// Create the main window
mainWindow = createMainWindow();
```

### 2. Duplicate Logging
**Problem**: Browser logger was sending logs to both console and main process, causing duplicate entries.

**Solution**: Modified browser logger to only send to main process in production or when explicitly enabled:
```typescript
const shouldSendToMain = process.env.NODE_ENV === 'production' || 
                       localStorage.getItem('SEND_LOGS_TO_MAIN') === 'true';
```

### 3. Inconsistent Log Formats
**Problem**: Mixed use of `[DEBUG]` format and Winston format throughout the codebase.

**Solution**: 
- Removed `[IPC]` prefixes from all IPC handlers
- Standardized on Winston-style format: `YYYY-MM-DD HH:mm:ss [LEVEL]: message`
- Updated browser logger console output to match Winston format

### 4. Direct Console.log Usage
**Problem**: Some components were using `console.log` instead of the logger.

**Solution**: Replaced all `console.log` calls with proper logger calls:
```typescript
// Before
console.log('[DEBUG] BrowserView navigated:', data.url);

// After
logger.debug('BrowserView navigated:', { url: data.url });
```

## Logging Architecture

### Main Process (Electron)
- Uses Winston logger with file and console transports
- Structured JSON logging to files
- Colorized console output for development
- Log levels: error, warn, info, debug, verbose

### Renderer Process (Browser)
- Browser-compatible logger that mimics Winston API
- Sends logs to main process in production
- Stores logs in localStorage for persistence
- Consistent format with main process

### IPC Communication
- `logEntry` handler in main process receives logs from renderer
- Proper error handling for missing handlers
- Structured data passing between processes

## Usage

### Development
```bash
# Normal development
npm run dev

# Verbose logging
npm run dev:verbose

# Debug level logging
npm run dev:debug

# Info level only
npm run dev:info
```

### Testing Logging
```bash
# Test logging consistency
npm run test:logging

# View logs in real-time
npm run logs:view

# Clear logs
npm run logs:clear
```

### Environment Variables
- `LOG_LEVEL`: Set log level (error, warn, info, debug, verbose)
- `NODE_ENV`: Controls whether logs are sent to main process
- `SEND_LOGS_TO_MAIN`: Force browser logs to be sent to main process

## Best Practices

1. **Use structured logging**: Pass objects instead of string interpolation
   ```typescript
   // Good
   logger.info('User logged in:', { userId: 123, method: 'oauth' });
   
   // Avoid
   logger.info(`User ${userId} logged in via ${method}`);
   ```

2. **Consistent log levels**:
   - `error`: Application errors that need attention
   - `warn`: Unexpected but recoverable situations
   - `info`: Important application events
   - `debug`: Detailed information for debugging
   - `verbose`: Very detailed information

3. **Avoid direct console.log**: Always use the logger for application logs

4. **Use appropriate metadata**: Include relevant context in log entries

## File Structure
```
logs/
├── combined.log      # All log levels
├── error.log         # Error level only
├── workflows/        # Workflow-specific logs
└── runs/            # Run-specific logs
``` 