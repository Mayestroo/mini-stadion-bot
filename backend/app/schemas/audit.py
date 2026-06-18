from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    actor_id: int | None
    actor_name: str | None
    action: str
    entity_type: str | None
    entity_id: int | None
    metadata_json: dict | None
    created_at: datetime
