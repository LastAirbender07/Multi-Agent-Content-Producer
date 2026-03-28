import os
from infra.logging import get_logger

logger = get_logger(__name__)

HAI_PROXY_URL = "http://localhost:6655/anthropic"
HAI_API_KEY = "xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Replace with your actual API key

def setup_hai_env():
    if os.getenv("HAI_PROXY_API_KEY"):
        logger.info("HAI environment already configured")
        return

    logger.info("\n--- HAI Proxy Setup ---")

    if not HAI_API_KEY:
        raise ValueError("API key cannot be empty")

    os.environ["HAI_PROXY_API_KEY"] = HAI_API_KEY
    os.environ["HAI_PROXY_URL"] = HAI_PROXY_URL

    logger.info("✅ HAI environment configured successfully\n")