import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from app.services.notifications import process_broadcast_queue
from app import models

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sportly.worker")

HEARTBEAT_PATH = Path("/tmp/sportly_worker_heartbeat")
LOOP_SLEEP_SECONDS = 2
ERROR_BACKOFF_SECONDS = 15

_running = True


def _handle_signal(signum: int, frame: Any) -> None:
    global _running
    logger.info("Received signal %s, shutting down after current iteration", signum)
    _running = False


def _touch_heartbeat() -> None:
    try:
        HEARTBEAT_PATH.touch()
    except OSError:
        pass


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    logger.info("Broadcast worker started")
    consecutive_errors = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        while _running:
            _touch_heartbeat()
            try:
                futures = [executor.submit(process_broadcast_queue) for _ in range(2)]
                for future in futures:
                    future.result()
                consecutive_errors = 0
                time.sleep(LOOP_SLEEP_SECONDS)
            except Exception:
                # e.g. transient DB outage — must not kill the worker.
                consecutive_errors += 1
                backoff = min(ERROR_BACKOFF_SECONDS * consecutive_errors, 60)
                logger.exception(
                    "Broadcast queue iteration failed (%d in a row); backing off %ds",
                    consecutive_errors, backoff,
                )
                time.sleep(backoff)
    logger.info("Broadcast worker stopped")


if __name__ == "__main__":
    main()
