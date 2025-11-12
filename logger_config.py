"""
Logging configuration for Fantasy Competition Backend
Writes logs to files in the logs/ directory
"""

import logging
import os
from datetime import datetime
from pathlib import Path

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Generate timestamped log filename
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOGS_DIR / f"backend_{timestamp}.log"
LATEST_LOG = LOGS_DIR / "backend_latest.log"

# Configure logging format
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Create formatter
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

# File handler - writes to timestamped file
file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)

# File handler - writes to latest log (overwrites)
latest_handler = logging.FileHandler(LATEST_LOG, mode='w', encoding='utf-8')
latest_handler.setLevel(logging.DEBUG)
latest_handler.setFormatter(formatter)

# Console handler - still output to console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,
    handlers=[file_handler, latest_handler, console_handler]
)

# Create logger
logger = logging.getLogger("fantasy_backend")

# Log initialization
logger.info("=" * 80)
logger.info("🚀 Fantasy Competition Backend - Logging Initialized")
logger.info(f"📝 Log file: {LOG_FILE}")
logger.info(f"📝 Latest log: {LATEST_LOG}")
logger.info("=" * 80)

def get_logger(name: str = "fantasy_backend"):
    """Get a logger instance"""
    return logging.getLogger(name)
