import subprocess
import re
import os
import time
from infra.logging import get_logger

logger = get_logger(__name__)


def start_hai_proxy():
    logger.info("hai_proxy_starting", message="Starting HAI proxy")

    process = subprocess.Popen(
        ["hai", "proxy", "start"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    api_key = None

    for _ in range(20):
        line = process.stdout.readline()
        if not line:
            time.sleep(0.5)
            continue

        logger.debug("hai_proxy_output", line=line.strip())

        match = re.search(r'API Key:\s*([a-zA-Z0-9\-]+)', line)
        if match:
            api_key = match.group(1)
            logger.info("hai_proxy_started", message="HAI proxy started successfully")
            break

    if not api_key:
        logger.error("hai_proxy_failed", message="Failed to extract API key")
        raise Exception("Failed to extract API key")

    os.environ["HAI_PROXY_API_KEY"] = api_key
    os.environ["HAI_PROXY_URL"] = "http://localhost:6655/anthropic"

    return api_key


def ensure_hai_proxy():
    if os.getenv("HAI_PROXY_API_KEY"):
        logger.debug("hai_proxy_exists", message="Using existing HAI proxy API key")
        return os.getenv("HAI_PROXY_API_KEY")

    return start_hai_proxy()