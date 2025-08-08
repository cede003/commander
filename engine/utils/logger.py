"""
Python Logger - Matches Winston format and configuration
"""

import logging
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import traceback


class WinstonFormatter(logging.Formatter):
    """Custom formatter that matches Winston JSON format"""
    
    def format(self, record):
        # Create Winston-style log entry
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S'),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Only include service metadata in debug and error levels (not info)
        if record.levelno == logging.DEBUG or record.levelno >= logging.ERROR:
            log_entry["service"] = "commander"
        
        # Add extra fields if present
        if hasattr(record, 'workflow_id'):
            log_entry['workflowId'] = record.workflow_id
        if hasattr(record, 'workflow_name'):
            log_entry['workflowName'] = record.workflow_name
        if hasattr(record, 'run_id'):
            log_entry['runId'] = record.run_id
        
        # Add exception info if present
        if record.exc_info:
            log_entry['error'] = {
                'message': str(record.exc_info[1]),
                'stack': traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry)


class ConsoleFormatter(logging.Formatter):
    """Console formatter with colors and Winston-style output"""
    
    # Color codes for different log levels
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def __init__(self, use_colors=None):
        super().__init__()
        # Auto-detect if we should use colors
        if use_colors is None:
            self.use_colors = (
                sys.stdout.isatty() and 
                os.getenv('LOG_NO_COLORS') is None and
                os.getenv('TERM') is not None
            )
        else:
            self.use_colors = use_colors
    
    def format(self, record):
        # Get color for log level (or empty string if colors disabled)
        if self.use_colors:
            color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
            reset = self.COLORS['RESET']
        else:
            color = ''
            reset = ''
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # Format message
        message = record.getMessage()
        
        # Add extra info if present
        extra_info = ""
        if hasattr(record, 'workflow_id'):
            extra_info += f" [workflow:{record.workflow_id}]"
        if hasattr(record, 'run_id'):
            extra_info += f" [run:{record.run_id}]"
        
        return f"{timestamp} [{color}{record.levelname}{reset}]: {message}{extra_info}"


def get_log_level() -> str:
    """Get log level from environment variable"""
    env_level = os.getenv('LOG_LEVEL', '').lower()
    valid_levels = ['error', 'warn', 'info', 'debug', 'verbose']
    
    if env_level in valid_levels:
        return env_level
    
    # Default based on environment
    return 'debug' if os.getenv('NODE_ENV') == 'development' else 'info'


# Global logger cache to prevent duplicate loggers
_logger_cache = {}


def setup_logger(name: str = 'commander', 
                workflow_id: Optional[str] = None,
                run_id: Optional[str] = None) -> logging.Logger:
    """Setup a logger with Winston-compatible configuration"""
    
    # Check if logger already exists in cache
    cache_key = f"{name}_{workflow_id}_{run_id}"
    if cache_key in _logger_cache:
        return _logger_cache[cache_key]
    
    # Create logs directory
    logs_dir = Path.cwd() / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, get_log_level().upper()))
    
    # Disable propagation to prevent duplicate logs
    logger.propagate = False
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatters
    file_formatter = WinstonFormatter()
    console_formatter = ConsoleFormatter()
    
    # File handler for all logs (only in production)
    if os.getenv('NODE_ENV') == 'production':
        combined_handler = logging.FileHandler(logs_dir / 'combined.log')
        combined_handler.setLevel(logging.DEBUG)
        combined_handler.setFormatter(file_formatter)
        logger.addHandler(combined_handler)
        
        # File handler for errors only
        error_handler = logging.FileHandler(logs_dir / 'error.log')
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        logger.addHandler(error_handler)
    
    # Workflow-specific log file
    if workflow_id:
        workflow_logs_dir = logs_dir / 'workflows'
        workflow_logs_dir.mkdir(exist_ok=True)
        
        workflow_handler = logging.FileHandler(workflow_logs_dir / f'{workflow_id}.log')
        workflow_handler.setLevel(logging.DEBUG)
        workflow_handler.setFormatter(file_formatter)
        logger.addHandler(workflow_handler)
    
    # Run-specific log file
    if run_id:
        run_logs_dir = logs_dir / 'runs'
        run_logs_dir.mkdir(exist_ok=True)
        
        run_handler = logging.FileHandler(run_logs_dir / f'{run_id}.log')
        run_handler.setLevel(logging.DEBUG)
        run_handler.setFormatter(file_formatter)
        logger.addHandler(run_handler)
    
    # Console handler for development (only add if no console handler exists)
    if os.getenv('NODE_ENV') != 'production':
        # Check if we already have a console handler
        has_console_handler = any(
            isinstance(handler, logging.StreamHandler) and 
            handler.stream == sys.stdout 
            for handler in logger.handlers
        )
        
        if not has_console_handler:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.DEBUG)
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
    
    # Add extra attributes for filtering
    if workflow_id:
        logger.workflow_id = workflow_id
    if run_id:
        logger.run_id = run_id
    
    # Cache the logger
    _logger_cache[cache_key] = logger
    
    return logger


def create_workflow_logger(workflow_id: str, workflow_name: Optional[str] = None) -> logging.Logger:
    """Create a logger specifically for a workflow"""
    logger = setup_logger(f'commander.workflow.{workflow_id}', workflow_id=workflow_id)
    if workflow_name:
        logger.workflow_name = workflow_name
    return logger


def create_run_logger(run_id: str, workflow_id: Optional[str] = None) -> logging.Logger:
    """Create a logger specifically for a workflow run"""
    return setup_logger(f'commander.run.{run_id}', workflow_id=workflow_id, run_id=run_id)


def get_shared_logger(name: str = 'commander.browser') -> logging.Logger:
    """Get a shared logger instance for browser modules"""
    return setup_logger(name)


# Create default logger and shared logger instances
default_logger = setup_logger('commander')
shared_logger = get_shared_logger()


class LogWrapper:
    """Convenience wrapper that matches Winston's log object"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def _log_with_meta(self, level: str, message: str, meta: Optional[Dict[str, Any]] = None):
        """Internal method to log with optional metadata"""
        if meta:
            getattr(self.logger, level)(f"{message} {json.dumps(meta)}")
        else:
            getattr(self.logger, level)(message)
    
    def error(self, message: str, meta: Optional[Dict[str, Any]] = None):
        self._log_with_meta('error', message, meta)
    
    def warn(self, message: str, meta: Optional[Dict[str, Any]] = None):
        self._log_with_meta('warning', message, meta)
    
    def info(self, message: str, meta: Optional[Dict[str, Any]] = None):
        self._log_with_meta('info', message, meta)
    
    def debug(self, message: str, meta: Optional[Dict[str, Any]] = None):
        self._log_with_meta('debug', message, meta)
    
    def verbose(self, message: str, meta: Optional[Dict[str, Any]] = None):
        self._log_with_meta('debug', message, meta)


# Export convenience objects
log = LogWrapper(default_logger)


class WorkflowLogger:
    """Efficient workflow-specific logging with context management"""
    
    def __init__(self, workflow_id: str, workflow_name: str = None, run_id: str = None):
        self.workflow_id = workflow_id
        self.workflow_name = workflow_name or 'Unknown'
        self.run_id = run_id
        
        # Create specialized loggers
        self.workflow_logger = create_workflow_logger(workflow_id, workflow_name)
        self.run_logger = create_run_logger(run_id, workflow_id) if run_id else self.workflow_logger
        
        # Cache for performance
        self._node_status_cache = {}
    
    def log_workflow_start(self, workflow_name: str = None):
        """Log workflow start with metadata"""
        name = workflow_name or self.workflow_name
        self.workflow_logger.info(f"Starting workflow: {name}")
    
    def log_workflow_metadata(self, metadata: Dict[str, Any]):
        """Log workflow metadata at debug level"""
        author = metadata.get('author', 'Unknown')
        self.workflow_logger.debug(f"Author: {author}")
        
        # Log other metadata if present
        for key, value in metadata.items():
            if key not in ['name', 'id', 'author']:
                self.workflow_logger.debug(f"{key}: {value}")
    
    def log_starting_nodes(self, starting_nodes: List[str]):
        """Log starting nodes information"""
        self.workflow_logger.debug(f"Starting with {len(starting_nodes)} node(s): {', '.join(starting_nodes)}")
    
    def log_node_execution_start(self, node_id: str, domain: str, type_name: str, subtype: str):
        """Log node execution start"""
        self.workflow_logger.debug(f"Executing node: {node_id} (domain: {domain}, type: {type_name}, subtype: {subtype})")
    
    def log_template_processing(self, node_id: str, has_templates: bool):
        """Log template variable processing"""
        if has_templates:
            self.workflow_logger.debug(f"Processing template variables in node {node_id}")
    
    def log_missing_templates(self, node_id: str, missing_vars: List[str]):
        """Log missing template variables"""
        if missing_vars:
            self.workflow_logger.warning(f"Missing template variables in node {node_id}: {missing_vars}")
    
    def log_node_success(self, node_id: str, execution_time: float):
        """Log successful node completion"""
        self.workflow_logger.debug(f"Node {node_id} completed successfully in {execution_time:.2f}s")
    
    def log_node_result(self, node_id: str, result: Dict[str, Any]):
        """Log detailed node result at debug level"""
        self.run_logger.debug(f"Node {node_id} result", {"result": result})
    
    def log_node_error(self, node_id: str, error: Exception, error_handling: Dict[str, Any], 
                      error_context: Dict[str, Any] = None):
        """Log node error with appropriate level based on error handling config"""
        error_type = type(error).__name__
        error_message = str(error)
        
        # Get logging level from error handling config
        log_level = error_handling.get('log_level', 'error')
        custom_message = error_handling.get('error_message', f"Node {node_id} failed")
        
        # Log with appropriate level
        if log_level == 'debug':
            self.workflow_logger.debug(f"{custom_message}: {error_message}", error_context or {})
        elif log_level == 'info':
            self.workflow_logger.info(f"{custom_message}: {error_message}")
        elif log_level == 'warning':
            self.workflow_logger.warning(f"{custom_message}: {error_message}")
        else:  # error level
            self.workflow_logger.error(f"{custom_message}: {error_message}")
        
        # Always log detailed error context at error level
        if error_context:
            self.run_logger.error(f"Node {node_id} failed", error_context)
    
    def log_retry_attempt(self, node_id: str, attempt: int, max_attempts: int):
        """Log retry attempt"""
        self.workflow_logger.info(f"Retrying node {node_id} ({attempt}/{max_attempts})")
    
    def log_retry_failure(self, node_id: str, max_attempts: int):
        """Log retry failure"""
        self.workflow_logger.error(f"Node {node_id} failed after {max_attempts} attempts")
    
    def log_fallback_execution(self, node_id: str, fallback_node: str):
        """Log fallback node execution"""
        self.workflow_logger.info(f"Executing fallback node: {fallback_node}")
    
    def log_fallback_error(self, node_id: str):
        """Log fallback error"""
        self.workflow_logger.error(f"No valid fallback node specified for {node_id}")
    
    def log_pause_execution(self, node_id: str, pause_duration: int):
        """Log pause execution"""
        self.workflow_logger.info(f"Pausing execution for {pause_duration} seconds due to error in node {node_id}")
    
    def log_skip_node(self, node_id: str):
        """Log node skip"""
        self.workflow_logger.info(f"Skipping node {node_id} due to error")
    
    def log_continue_after_error(self, node_id: str):
        """Log continue after error"""
        self.workflow_logger.info(f"Continuing execution after error in node {node_id}")
    
    def log_workflow_exit(self, node_id: str, error: Exception):
        """Log workflow exit"""
        self.workflow_logger.error(f"Exiting workflow due to error in node {node_id}")
    
    def log_workflow_completion(self):
        """Log workflow completion"""
        self.workflow_logger.info("Workflow execution completed successfully")
    
    def log_runner_initialization(self):
        """Log runner initialization"""
        self.workflow_logger.info("Initializing scalable workflow runner...")
        self.workflow_logger.info("Browser session initialized")


def create_workflow_logger_instance(workflow_id: str, workflow_name: str = None, run_id: str = None) -> WorkflowLogger:
    """Create a workflow logger instance with all necessary loggers"""
    return WorkflowLogger(workflow_id, workflow_name, run_id) 