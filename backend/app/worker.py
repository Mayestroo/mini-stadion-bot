import signal
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.services.notifications import process_broadcast_queue
from app import models

_running = True


def _handle_signal(signum: int, frame: Any) -> None:
    global _running
    _running = False


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    with ThreadPoolExecutor(max_workers=5) as executor:
        while _running:
            futures = [executor.submit(process_broadcast_queue) for _ in range(2)]
            for future in futures:
                future.result()
            time.sleep(2)


if __name__ == "__main__":
    main()
