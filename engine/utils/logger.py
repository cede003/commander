import logging, json, traceback, os, sys
from pathlib import Path
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        for attr in ['workflow_id', 'workflow_name', 'run_id']:
            if hasattr(record, attr):
                log[attr] = getattr(record, attr)
        if record.exc_info:
            log["error"] = {
                "message": str(record.exc_info[1]),
                "stack": traceback.format_exception(*record.exc_info),
            }
        return json.dumps(log)

class ConsoleFormatter(logging.Formatter):
    def format(self, record):
        return record.getMessage()


_logger_cache = {}

def _get_console_level() -> int:
    level = (os.environ.get("LOG_LEVEL", "") or "").strip().lower()
    if level in ("debug", "verbose"):
        return logging.DEBUG
    if level in ("error",):
        return logging.ERROR
    if level in ("warn", "warning"):
        return logging.WARNING
    return logging.INFO

def setup_logger(name="app", workflow_id=None, run_id=None):
    key = f"{name}_{workflow_id}_{run_id}"
    if key in _logger_cache:
        return _logger_cache[key]

    logs = Path("logs"); logs.mkdir(exist_ok=True)
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    logger.propagate = False

    jf = JSONFormatter()
    cf = ConsoleFormatter()
    
    # Create handlers, set formatters, then add handlers (addHandler returns None)
    fh_all = logging.FileHandler(logs / "combined.log", mode='a')
    fh_all.setFormatter(jf)
    logger.addHandler(fh_all)

    fh_err = logging.FileHandler(logs / "error.log", mode='a')
    fh_err.setFormatter(jf)
    logger.addHandler(fh_err)

    # Console handler (stdout). Level from LOG_LEVEL: info -> INFO; debug/verbose -> DEBUG
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(_get_console_level())
    ch.setFormatter(cf)
    logger.addHandler(ch)


    if workflow_id:
        wf = logs / "workflows"; wf.mkdir(exist_ok=True)
        wf_handler = logging.FileHandler(wf / f"{workflow_id}.log", mode='a')
        wf_handler.setFormatter(jf)
        logger.addHandler(wf_handler)
    if run_id:
        rf = logs / "runs"; rf.mkdir(exist_ok=True)
        run_handler = logging.FileHandler(rf / f"{run_id}.log", mode='a')
        run_handler.setFormatter(jf)
        logger.addHandler(run_handler)

    if workflow_id: logger.workflow_id = workflow_id
    if run_id: logger.run_id = run_id
    _logger_cache[key] = logger
    return logger

class LogWrapper:
    def __init__(self, logger): self.logger = logger
    def _log(self, level, msg, meta=None):
        full = f"{msg} {json.dumps(meta)}" if meta else msg
        getattr(self.logger, level)(full)
    def error(self, msg, meta=None): self._log('error', msg, meta)
    def warn(self, msg, meta=None): self._log('warning', msg, meta)
    def info(self, msg, meta=None): self._log('info', msg, meta)
    def debug(self, msg, meta=None): self._log('debug', msg, meta)

log = LogWrapper(setup_logger())

class WorkflowLogger:
    def __init__(self, workflow_id, workflow_name=None, run_id=None):
        self.workflow_logger = setup_logger(f"workflow.{workflow_id}", workflow_id)
        self.run_logger = setup_logger(f"run.{run_id}", workflow_id, run_id) if run_id else self.workflow_logger
        self.workflow_name = workflow_name or "Unknown"

    def log_workflow_start(self): self.workflow_logger.info(f"Starting workflow: {self.workflow_name}")
    def log_node_start(self, node_id): self.workflow_logger.info(f"Starting node: {node_id}")
    def log_node_success(self, node_id, exec_time=None): self.workflow_logger.info(f"Node {node_id} completed")
    def log_node_result(self, node_id, result): self.workflow_logger.debug(f"Node {node_id} result: {result}")
    def log_node_error(self, node_id, err, error_handling=None, meta=None): self.workflow_logger.error(f"Node {node_id} failed: {err}")
    def log_continue_after_error(self, node_id): self.workflow_logger.info(f"Continuing after error at node {node_id}")
    def log_retry_attempt(self, node_id, attempt, max_attempts): self.workflow_logger.info(f"Retrying node {node_id}: attempt {attempt}/{max_attempts}")
    def log_retry_failure(self, node_id, max_attempts): self.workflow_logger.error(f"Retry failed for node {node_id} after {max_attempts} attempts")
    def log_pause_execution(self, node_id, seconds): self.workflow_logger.info(f"Pausing execution at node {node_id} for {seconds} seconds")
    def log_workflow_exit(self, node_id, exception): self.workflow_logger.error(f"Exiting workflow at node {node_id}: {exception}")
    def log_workflow_error(self, exception): self.workflow_logger.error(f"Workflow error: {exception}")
    def log_workflow_done(self): self.workflow_logger.info("Workflow completed")

def create_workflow_logger_instance(workflow_id, workflow_name=None, run_id=None):
    return WorkflowLogger(workflow_id, workflow_name, run_id)

# Convenience helpers expected by engine.utils exports
def get_shared_logger(name: str):
    """Return a shared LogWrapper for the given logger name."""
    return LogWrapper(setup_logger(name))

def safe_log(fn, *args, **kwargs):
    """Best-effort logging: swallow any exception raised by the logging call."""
    try:
        fn(*args, **kwargs)
    except Exception:
        pass
