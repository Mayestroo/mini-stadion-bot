from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Paginated list envelope so admin UIs can offer infinite scrolling."""

    items: List[T]
    total: int
