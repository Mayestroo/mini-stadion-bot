"""Runtime-configurable platform settings (key/value, editable by superadmin)."""
from sqlalchemy.orm import Session

from app.models.settings import Setting

# key -> (default_value, description, kind). kind: "bool" | "int" | "str"
SETTINGS_REGISTRY: dict[str, tuple[str, str, str]] = {
    "maintenance_mode": ("false", "Texnik ishlar rejimi — API faqat adminlar uchun ishlaydi", "bool"),
    "broadcast_interval_seconds": ("60", "Bir superadmin tomonidan ketma-ket broadcastlar orasidagi minimal tanaffus (soniya)", "int"),
}


def get_setting(db: Session, key: str) -> str:
    default = SETTINGS_REGISTRY.get(key)
    row = db.query(Setting).filter(Setting.key == key).first()
    if row is not None:
        return row.value
    if default is not None:
        return default[0]
    raise KeyError(key)


def get_setting_bool(db: Session, key: str) -> bool:
    return get_setting(db, key).lower() == "true"


def get_setting_int(db: Session, key: str) -> int:
    try:
        return int(get_setting(db, key))
    except ValueError:
        return int(SETTINGS_REGISTRY[key][0])


def list_settings(db: Session) -> list[Setting]:
    """Every registered setting, materialized with stored value or default."""
    stored = {row.key: row for row in db.query(Setting).all()}
    items = []
    for key, (default, description, _kind) in SETTINGS_REGISTRY.items():
        row = stored.get(key)
        if row is None:
            row = Setting(key=key, value=default, description=description, updated_by=None, updated_at=None)
        else:
            row.description = description
        items.append(row)
    return items


def validate_setting_value(key: str, value: str) -> str:
    kind = SETTINGS_REGISTRY[key][2]
    value = value.strip()
    if kind == "bool":
        if value.lower() not in ("true", "false"):
            raise ValueError("Qiymat true yoki false bo'lishi kerak")
        return value.lower()
    if kind == "int":
        ivalue = int(value)  # raises ValueError on garbage
        if ivalue < 0:
            raise ValueError("Qiymat manfiy bo'lmasligi kerak")
        return str(ivalue)
    if not value:
        raise ValueError("Qiymat bo'sh bo'lmasligi kerak")
    return value
