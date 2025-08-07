# Error Handling in Commander Workflows

This document explains the comprehensive error handling system in Commander workflows, which allows you to gracefully handle errors like the `press() missing 1 required positional argument: 'key'` error you encountered.

## Overview

The error handling system provides multiple strategies for dealing with errors during workflow execution:

- **Retry**: Attempt the action multiple times
- **Fallback**: Execute an alternative node
- **Pause**: Wait for a specified duration then continue
- **Exit**: Terminate the workflow
- **Continue**: Log the error but continue execution
- **Skip**: Skip the failed node entirely

## Error Handling Strategies

### 1. Retry Strategy

Automatically retry failed actions with configurable attempts and delays:

```json
{
  "error_handling": {
    "strategy": "retry",
    "max_attempts": 3,
    "retry_delay": 2,
    "error_message": "Failed to navigate to website"
  }
}
```

### 2. Pause Strategy

Pause execution for a specified duration when an error occurs:

```json
{
  "error_handling": {
    "strategy": "pause",
    "pause_duration": 5,
    "error_message": "Press action failed - missing key parameter",
    "log_level": "warning"
  }
}
```

### 3. Exit Strategy

Terminate the workflow when a critical error occurs:

```json
{
  "error_handling": {
    "strategy": "exit",
    "error_message": "Critical navigation error - exiting workflow"
  }
}
```

### 4. Continue Strategy

Log the error but continue with the next node:

```json
{
  "error_handling": {
    "strategy": "continue",
    "error_message": "Failed to get page title"
  }
}
```

### 5. Skip Strategy

Skip the failed node entirely:

```json
{
  "error_handling": {
    "strategy": "skip",
    "error_message": "Click action skipped - missing selector"
  }
}
```

### 6. Fallback Strategy

Execute an alternative node when the current one fails:

```json
{
  "error_handling": {
    "strategy": "fallback",
    "fallback_node": "alternative_action",
    "error_message": "Element not found, using fallback"
  }
}
```

## Global Error Handling

You can set default error handling behavior for the entire workflow:

```json
{
  "global_error_handling": {
    "default_strategy": "continue",
    "max_retries": 2,
    "pause_on_error": false,
    "pause_duration": 3,
    "exit_on_critical_errors": true,
    "critical_error_types": ["KeyboardInterrupt", "SystemExit", "MemoryError"]
  }
}
```

## Error Type Specific Handling

Handle different types of errors differently:

```json
{
  "error_handling": {
    "strategy": "continue",
    "continue_on_error_types": ["ValueError", "TimeoutError"],
    "exit_on_error_types": ["KeyboardInterrupt", "SystemExit"]
  }
}
```

## Enhanced Error Messages

The system now provides more helpful error messages. For example, when the `press()` action is missing the `key` parameter:

**Before:**
```
press() missing 1 required positional argument: 'key'
```

**After:**
```
Missing required parameter 'key'. For press() action, specify a key like 'Enter', 'Tab', 'Escape', etc.
```

## Serialization Error Handling

The system now handles Playwright object serialization errors gracefully. When actions return complex objects like ElementHandles, they are automatically serialized to JSON-compatible formats:

**Before:**
```
Object of type ElementHandle is not JSON serializable
```

**After:**
ElementHandles are automatically converted to serializable objects containing:
- Tag name
- Inner text
- Text content
- Common attributes (id, class, name, type)
- Bounding box information

This prevents crashes when workflows return complex Playwright objects.

## Log Levels

Control how errors are logged:

- `debug`: Detailed error information
- `info`: General information about the error
- `warning`: Warning level (default for pause strategy)
- `error`: Error level (default)

## Example: Handling the Press Error

Here's how to handle the specific `press()` error you encountered:

```json
{
  "nodes": {
    "press_action": {
      "id": "press_action",
      "domain": "browser",
      "type": "action",
      "subtype": "press",
      "inputs": {},
      "error_handling": {
        "strategy": "pause",
        "pause_duration": 5,
        "error_message": "Press action failed - missing key parameter",
        "log_level": "warning"
      }
    }
  }
}
```

This will:
1. Detect the missing `key` parameter
2. Show a helpful error message
3. Pause execution for 5 seconds
4. Continue with the next node

## Demo Workflows

Three demo workflows are included to demonstrate error handling:

1. **`press_error_demo_workflow.json`**: Specifically demonstrates handling the press() missing key error
2. **`error_handling_demo_workflow.json`**: Shows all error handling strategies
3. **`element_handle_demo_workflow.json`**: Demonstrates ElementHandle serialization handling

## Best Practices

1. **Use appropriate strategies**: Use `pause` for temporary issues, `retry` for network problems, `exit` for critical errors
2. **Set reasonable retry limits**: Don't retry indefinitely
3. **Provide helpful error messages**: Make debugging easier
4. **Use global defaults**: Set sensible defaults for your workflow
5. **Test error scenarios**: Include error handling in your workflow testing

## Migration from Old Error Handling

If you have existing workflows with the old error handling format:

```json
{
  "error_handling": {
    "retry": true,
    "max_attempts": 3
  }
}
```

This will automatically be converted to:

```json
{
  "error_handling": {
    "strategy": "retry",
    "max_attempts": 3
  }
}
```

The system maintains backward compatibility while providing enhanced functionality. 