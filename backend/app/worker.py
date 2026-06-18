import time

from app.core.notifications import process_broadcast_queue
from app import models


def main() -> None:
    while True:
        process_broadcast_queue()
        time.sleep(5)


if __name__ == "__main__":
    main()
