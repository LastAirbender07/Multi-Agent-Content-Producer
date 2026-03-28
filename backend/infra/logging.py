"""
Centralized logging configuration for the backend.

Usage:
    from infra.logging import get_logger

    logger = get_logger(__name__)
    logger.info("message", key="value", user_id=123)
"""

import logging
import sys
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler
import structlog


# Determine environment
ENV = os.getenv("ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENV == "production" else "DEBUG")
LOG_DIR = Path(os.getenv("LOG_DIR", "logs"))
LOG_DIR.mkdir(exist_ok=True)


def setup_logging():
    """Configure structured logging for the application."""

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, LOG_LEVEL.upper()),
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Add file handler for production
    if ENV == "production":
        file_handler = RotatingFileHandler(
            LOG_DIR / "app.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.INFO)
        logging.root.addHandler(file_handler)

    # Configure structlog processors
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Use JSON formatting in production, console formatting in development
    if ENV == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback
            )
        )

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.stdlib.BoundLogger:
    """
    Get a logger instance for the given module.

    Args:
        name: Logger name, typically __name__ from the calling module

    Returns:
        Configured structlog logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("user_login", user_id=123, ip="192.168.1.1")
        logger.error("api_error", error=str(e), endpoint="/api/data")
    """
    return structlog.get_logger(name)


# Initialize logging on module import
setup_logging()
