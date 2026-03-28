# Example: Using Centralized Logging

This example demonstrates the centralized logging system across different modules.

## Usage Examples

```python
# In any Python module
from infra.logging import get_logger

logger = get_logger(__name__)

# Basic events
logger.info("application_started")
logger.debug("config_loaded", env="production", config_path="/etc/app/config.yml")

# With structured data
logger.info(
    "user_registered",
    user_id=12345,
    email="user@example.com",
    registration_method="oauth"
)

# Error logging with context
try:
    result = risky_operation()
except Exception as e:
    logger.error(
        "operation_failed",
        operation="risky_operation",
        error=str(e),
        error_type=type(e).__name__
    )
    raise

# Performance tracking
import time
start = time.time()
# ... do work ...
logger.info("task_completed", elapsed_time=time.time() - start)
```

## Running the Examples

```bash
# Development mode (colorized console logs)
python main.py
python apps/cli/main.py

# Production mode (JSON logs)
ENV=production python main.py

# Change log level
LOG_LEVEL=DEBUG python apps/cli/main.py
```

## Log Locations

- **Console**: Always outputs to stdout
- **File** (production only): `logs/app.log` with 10MB rotation, 5 backup files
