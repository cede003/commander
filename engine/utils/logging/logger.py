import logging
import os
import sys
import json

def _get_console_level() -> int:
    level = (os.environ.get("LOG_LEVEL", "") or "").strip().lower()
    return {
        "debug": logging.DEBUG,
        "verbose": logging.DEBUG,
        "error": logging.ERROR,
        "warn": logging.WARNING,
        "warning": logging.WARNING,
    }.get(level, logging.INFO)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "logger": record.name,
            "time": self.formatTime(record, self.datefmt or "%Y-%m-%d %H:%M:%S"),
        }
        return json.dumps(log_record)


def _init_root_logger() -> logging.Logger:
    logger = logging.getLogger("commander")

    if getattr(logger, "_initialized", False):
        return logger

    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    logger.propagate = False

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(_get_console_level())

    # Use JSON logs only when explicitly requested
    if os.environ.get("LOG_JSON") == "1":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(message)s"))

    logger.addHandler(handler)
    logger._initialized = True  # type: ignore[attr-defined]
    return logger


# Initialize singleton logger
logger = _init_root_logger()
log = logger  # Optional alias


class WorkflowLogger:
    """Lightweight workflow logger that writes through the global logger."""
    def __init__(self, workflow_id, workflow_name="Unknown", run_id=None):
        self.workflow_id = workflow_id
        self.workflow_name = workflow_name
        self.run_id = run_id

    def log_workflow_start(self):
        logger.info(f"[workflow] Starting workflow: {self.workflow_name} (ID: {self.workflow_id})")

    def log_node_start(self, node_id):
        logger.info(f"[workflow] Starting node: {node_id}")

    def log_node_success(self, node_id, exec_time=None):
        msg = f"[workflow] Node {node_id} completed"
        if exec_time:
            msg += f" in {exec_time:.2f}s"
        logger.info(msg)

    def log_node_result(self, node_id, result):
        logger.debug(f"[workflow] Node {node_id} result: {result}")

    def log_node_error(self, node_id, err, error_handling=None, meta=None):
        msg = f"[workflow] Node {node_id} failed: {err}"
        if error_handling:
            msg += f" | Handling: {error_handling}"
        if meta:
            msg += f" | Meta: {meta}"
        logger.error(msg)

    def log_continue_after_error(self, node_id):
        logger.info(f"[workflow] Continuing after error at node {node_id}")

    def log_retry_attempt(self, node_id, attempt, max_attempts):
        logger.info(f"[workflow] Retrying node {node_id}: attempt {attempt}/{max_attempts}")

    def log_retry_failure(self, node_id, max_attempts):
        logger.error(f"[workflow] Retry failed for node {node_id} after {max_attempts} attempts")

    def log_pause_execution(self, node_id, seconds):
        logger.info(f"[workflow] Pausing execution at node {node_id} for {seconds} seconds")

    def log_workflow_exit(self, node_id, exception):
        logger.error(f"[workflow] Exiting workflow at node {node_id}: {exception}")

    def log_workflow_error(self, exception):
        logger.error(f"[workflow] Workflow error: {exception}")

    def log_workflow_done(self):
        logger.info("[workflow] Workflow completed")


# -----------------------------------------------------------------------------
# Backward/compatibility helpers so existing imports continue to work
# -----------------------------------------------------------------------------

def setup_logger(name: str = "commander") -> logging.Logger:
    """Return the singleton stdout-only logger regardless of name.

    Kept for backward compatibility with existing calls like
    `setup_logger("commander.runner")`.
    """
    return logger


def get_shared_logger(name: str = "commander") -> logging.Logger:
    """Alias to retrieve the shared stdout-only logger."""
    return logger


def create_workflow_logger_instance(workflow_id, workflow_name="Unknown", run_id=None) -> WorkflowLogger:
    """Factory retained for compatibility to construct WorkflowLogger."""
    return WorkflowLogger(workflow_id, workflow_name, run_id)


def safe_log(message) -> None:
    """Best-effort debug logging that never raises."""
    try:
        logger.debug(message)
    except Exception:
        pass


# -----------------------------------------------------------------------------
# Protocol emitters (stdout-only, no log envelope) for IPC with Electron.
# These are NOT logs; they are part of the Python<->Electron protocol.
# -----------------------------------------------------------------------------

def emit_protocol_line(text: str) -> None:
    try:
        sys.stdout.write(f"{text}\n")
        sys.stdout.flush()
    except Exception:
        # As a last resort try logging the line
        try:
            logger.info(text)
        except Exception:
            pass


def emit_protocol_json(data: dict) -> None:
    try:
        sys.stdout.write(json.dumps(data) + "\n")
        sys.stdout.flush()
    except Exception:
        # Fallback: log as info; Electron will still display it
        try:
            logger.info(json.dumps(data))
        except Exception:
            pass 