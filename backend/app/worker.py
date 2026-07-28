import signal
import time
from typing import Any

from app.core.notifications import process_broadcast_queue
from app import models

_running = True


def _handle_signal(signum: int, frame: Any) -> None:
    global _running
    _running = False


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    while _running:
        process_broadcast_queue()
        time.sleep(5)


if __name__ == "__main__":
    main()
