"""Boshlang'ich ma'lumotlar - Andijondagi haqiqiy stadionlar"""
from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.stadium import Stadium
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

superadmin = db.query(User).filter(User.role == UserRole.superadmin).first()
if not superadmin:
    admin_ids = [i.strip() for i in settings.ADMIN_TELEGRAM_IDS.split(",") if i.strip()]
    admin_tg = admin_ids[0] if admin_ids else None
    superadmin = User(
        full_name="Superadmin",
        telegram_id=admin_tg,
        hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
        role=UserRole.superadmin,
    )
    db.add(superadmin)
    db.commit()
    print(f"✅ Superadmin yaratildi: telegram_id={admin_tg or 'aniqlanmadi'}")

moderator = db.query(User).filter(User.role == UserRole.moderator).first()
if not moderator:
    moderator = User(
        full_name="Moderator",
        phone="+998901234568",

        hashed_password=get_password_hash("Moderator123!"),
        role=UserRole.moderator,
    )
    db.add(moderator)
    db.commit()
    print("✅ Moderator yaratildi: +998901234568 / Moderator123!")

owner = db.query(User).filter(User.role == UserRole.owner).first()
if not owner:
    owner = User(
        full_name="Test Owner",
        phone="+998909999999",
        telegram_id="123456789",
        owner_login="owner",
        hashed_password=get_password_hash("Owner123!"),
        role=UserRole.owner,
        must_change_password=True,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    print("✅ Test owner yaratildi: owner / Owner123! / telegram_id=123456789")

stadions_data = [
    {
        "name": "Green Park Mini Futbol",
        "description": "Andijondagi eng zamonaviy mini futbol maydoni. Sun'iy o'tlar qoplama, chiroq tizimi.",
        "address": "Andijan shahar, Bobur ko'chasi 45",
        "district": "Shaharsozlik",
        "latitude": 40.7821,
        "longitude": 72.3442,
        "phone": "+998901111111",
        "price_per_hour": 150000,
        "price_weekend": 200000,
        "price_night": 180000,
        "width": 25.0,
        "length": 45.0,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "open_time": "07:00",
        "close_time": "24:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.8,
    },
    {
        "name": "Sport Arena Andijan",
        "description": "Katta hajmli sport markazi. 2 ta mini futbol maydoni, kiyinish xonalari.",
        "address": "Andijan shahar, Navoi ko'chasi 12",
        "district": "Asaka tumani",
        "latitude": 40.7754,
        "longitude": 72.3521,
        "phone": "+998902222222",
        "price_per_hour": 120000,
        "price_weekend": 160000,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_parking": False,
        "open_time": "08:00",
        "close_time": "23:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.5,
    },
    {
        "name": "Champions Field",
        "description": "Professional darajadagi o'yin maydoni. Turnirlar uchun ideal.",
        "address": "Andijan shahar, Mustaqillik ko'chasi 78",
        "district": "Markaziy",
        "latitude": 40.7892,
        "longitude": 72.3398,
        "phone": "+998903333333",
        "telegram": "@championsfield_andijan",
        "price_per_hour": 200000,
        "price_weekend": 250000,
        "price_night": 220000,
        "width": 30.0,
        "length": 50.0,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "has_cafe": True,
        "has_tribunes": True,
        "open_time": "06:00",
        "close_time": "24:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.9,
    },
    {
        "name": "Yoshlar Sport Klubi",
        "description": "Yoshlar uchun arzon va qulay mini futbol maydoni.",
        "address": "Andijan shahar, Yosh Gvardiya ko'chasi 5",
        "district": "Yangiqo'rg'on",
        "latitude": 40.7943,
        "longitude": 72.3612,
        "phone": "+998904444444",
        "price_per_hour": 80000,
        "surface": "concrete",
        "has_lighting": True,
        "has_changing_room": False,
        "open_time": "09:00",
        "close_time": "22:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "rating": 4.0,
    },
    {
        "name": "FC Andijan Mini Arena",
        "description": "FC Andijan klubi bilan hamkorlikda qurilgan maydon.",
        "address": "Andijan shahar, Sport majmuasi, 3-bino",
        "district": "Markaziy",
        "latitude": 40.7811,
        "longitude": 72.3468,
        "phone": "+998905555555",
        "phone2": "+998906666666",
        "price_per_hour": 175000,
        "price_weekend": 220000,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "open_time": "07:00",
        "close_time": "23:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": False,
        "rating": 4.6,
    },
]

import re

def make_slug(name):
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug

for data in stadions_data:
    slug = make_slug(data["name"])
    if not db.query(Stadium).filter(Stadium.slug == slug).first():
        s = Stadium(**data, slug=slug, images=[], owner_id=owner.id)
        db.add(s)
        print(f"✅ Stadion qo'shildi: {data['name']}")

db.commit()
db.close()
print("\n🎉 Seed muvaffaqiyatli bajarildi!")
