from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
import tempfile
from PIL import Image, UnidentifiedImageError
import aiofiles

from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.core.database import get_db
from app.models.stadium import Stadium
from app.models.user import User, UserRole

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024

SAFE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


async def _validate_and_save_image(content: bytes, filename_prefix: str) -> str | None:
    """Validate image content and save to uploads. Returns the filename or None."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        img = Image.open(tmp_path)
        img.thumbnail((1200, 900), Image.LANCZOS)

        ext = img.format.lower() if img.format else "jpg"
        if ext not in SAFE_EXTENSIONS:
            ext = "jpg"

        filename = f"{filename_prefix}{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        img.save(filepath, optimize=True, quality=85)
        return filename
    except (UnidentifiedImageError, Exception):
        return None
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP ruxsat etilgan")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Fayl hajmi {settings.MAX_FILE_SIZE_MB}MB dan oshmasligi kerak")

    filename = await _validate_and_save_image(content, "")
    if not filename:
        raise HTTPException(status_code=400, detail="Rasm formati noto'g'ri yoki fayl buzilgan")

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/broadcast/image")
async def upload_broadcast_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP ruxsat etilgan")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Fayl hajmi {settings.MAX_FILE_SIZE_MB}MB dan oshmasligi kerak")

    filename = await _validate_and_save_image(content, "broadcast_")
    if not filename:
        raise HTTPException(status_code=400, detail="Rasm formati noto'g'ri yoki fayl buzilgan")

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/stadium/{stadium_id}/images")
async def upload_stadium_images(
    stadium_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    if admin.role != UserRole.superadmin and stadium.owner_id != admin.id:
        raise HTTPException(status_code=403, detail="Faqat o'z stadioningiz rasmlarini yuklashingiz mumkin")

    urls = []
    for file in files[:10]:
        if file.content_type not in ALLOWED_TYPES:
            continue
        content = await file.read()
        if len(content) > MAX_SIZE:
            continue

        filename = await _validate_and_save_image(content, f"stadium_{stadium_id}_")
        if filename:
            urls.append(f"/uploads/{filename}")

    current_images = stadium.images or []
    stadium.images = current_images + urls
    if not stadium.cover_image and urls:
        stadium.cover_image = urls[0]

    db.commit()
    return {"uploaded": urls, "total": len(stadium.images)}
