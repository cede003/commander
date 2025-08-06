"""
Python Logger - Matches Winston format and configuration
"""

import logging
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import traceback


class WinstonFormatter(logging.Formatter):
    """Custom formatter that matches Winston JSON format"""
    
    def format(self, record):
        # Create Winston-style log entry
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S'),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "service": "commander",
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
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
            # Disable colors if not in interactive terminal or if LOG_NO_COLORS is set
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


def setup_logger(name: str = 'commander', 
                workflow_id: Optional[str] = None,
                run_id: Optional[str] = None) -> logging.Logger:
    """Setup a logger with Winston-compatible configuration"""
    
    # Create logs directory
    logs_dir = Path.cwd() / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, get_log_level().upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatters
    file_formatter = WinstonFormatter()
    console_formatter = ConsoleFormatter()
    
    # File handler for all logs
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
    
    # Console handler for development
    if os.getenv('NODE_ENV') != 'production':
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    
    # Add extra attributes for filtering
    if workflow_id:
        logger.workflow_id = workflow_id
    if run_id:
        logger.run_id = run_id
    
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


# Create default logger
default_logger = setup_logger('commander')

# Convenience functions that match Winston API
def log_error(message: str, meta: Optional[Dict[str, Any]] = None):
    """Log error message with optional metadata"""
    if meta:
        default_logger.error(f"{message} {json.dumps(meta)}")
    else:
        default_logger.error(message)


def log_warn(message: str, meta: Optional[Dict[str, Any]] = None):
    """Log warning message with optional metadata"""
    if meta:
        default_logger.warning(f"{message} {json.dumps(meta)}")
    else:
        default_logger.warning(message)


def log_info(message: str, meta: Optional[Dict[str, Any]] = None):
    """Log info message with optional metadata"""
    if meta:
        default_logger.info(f"{message} {json.dumps(meta)}")
    else:
        default_logger.info(message)


def log_debug(message: str, meta: Optional[Dict[str, Any]] = None):
    """Log debug message with optional metadata"""
    if meta:
        default_logger.debug(f"{message} {json.dumps(meta)}")
    else:
        default_logger.debug(message)


def log_verbose(message: str, meta: Optional[Dict[str, Any]] = None):
    """Log verbose message with optional metadata"""
    if meta:
        default_logger.debug(f"{message} {json.dumps(meta)}")
    else:
        default_logger.debug(message)


# Create a convenience object that matches Winston's log object
class LogWrapper:
    def __init__(self, logger):
        self.logger = logger
    
    def error(self, message: str, meta: Optional[Dict[str, Any]] = None):
        if meta:
            self.logger.error(f"{message} {json.dumps(meta)}")
        else:
            self.logger.error(message)
    
    def warn(self, message: str, meta: Optional[Dict[str, Any]] = None):
        if meta:
            self.logger.warning(f"{message} {json.dumps(meta)}")
        else:
            self.logger.warning(message)
    
    def info(self, message: str, meta: Optional[Dict[str, Any]] = None):
        if meta:
            self.logger.info(f"{message} {json.dumps(meta)}")
        else:
            self.logger.info(message)
    
    def debug(self, message: str, meta: Optional[Dict[str, Any]] = None):
        if meta:
            self.logger.debug(f"{message} {json.dumps(meta)}")
        else:
            self.logger.debug(message)
    
    def verbose(self, message: str, meta: Optional[Dict[str, Any]] = None):
        if meta:
            self.logger.debug(f"{message} {json.dumps(meta)}")
        else:
            self.logger.debug(message)

# Export convenience object that matches Winston's log object
log = LogWrapper(default_logger) 