from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def write_audit(
    db: Session,
    action: str,
    actor: User | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    db.add(entry)
    return entry
