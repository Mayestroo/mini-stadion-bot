import math
from datetime import datetime

from app.models.stadium import Stadium


def time_to_minutes(value: str) -> int:
    hours, minutes = map(int, value.split(":"))
    return hours * 60 + minutes


def calculate_price(stadium: Stadium, start_time: str, end_time: str, date: str) -> tuple[int, int]:
    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    duration_hours = math.ceil((end_minutes - start_minutes) / 60)

    weekday = datetime.strptime(date, "%Y-%m-%d").weekday()
    is_weekend = weekday in [5, 6]

    is_night = start_minutes >= 1200

    if is_weekend and stadium.price_weekend:
        price_per_hour = stadium.price_weekend
    elif is_night and stadium.price_night:
        price_per_hour = stadium.price_night
    else:
        price_per_hour = stadium.price_per_hour

    return int(price_per_hour * duration_hours), duration_hours
