import logging
from mimetypes import init
import os
import sys
import json


class MainLogger():
    def __init__(self, logger_name) -> None:
        self.logger = self._init_root_logger(logger_name)

    def _init_root_logger(self, logger_name) -> logging.Logger:
        logger = logging.getLogger(logger_name)

        if getattr(logger, "_initialized", False):
            return logger

        logger.setLevel(logging.DEBUG)
        logger.handlers.clear()
        logger.propagate = False

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(self._get_console_level())
        handler.setFormatter(logging.Formatter("%(message)s"))

        logger.addHandler(handler)
        logger._initialized = True
        return logger

    def _get_console_level(self) -> int:
        level = (os.environ.get("LOG_LEVEL", "") or "").strip().lower()
        return {
            "debug": logging.DEBUG,
            "verbose": logging.DEBUG,
            "error": logging.ERROR,
            "warn": logging.WARNING,
            "warning": logging.WARNING,
        }.get(level, logging.INFO)





# Initialize singleton logger
logger = MainLogger("commander").logger


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

