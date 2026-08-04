from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
import tempfile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.core.database import get_db
from app.core.ratelimit import rate_limit
from app.models.stadium import Stadium
from app.models.user import User, UserRole

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024
# Reject decompression bombs before decoding: 20MP is far above any
# legitimate stadium photo after client-side uploads.
MAX_IMAGE_PIXELS = 20_000_000
MAX_STADIUM_IMAGES = 20

SAFE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


async def _read_capped(file: UploadFile) -> bytes | None:
    """Read at most MAX_SIZE+1 bytes; None means 'too large'.

    Reading with a size cap keeps arbitrarily large request bodies out of
    memory (the old code read the whole body and checked afterwards).
    """
    if file.size is not None and file.size > MAX_SIZE:
        return None
    content = await file.read(MAX_SIZE + 1)
    if len(content) > MAX_SIZE:
        return None
    return content


async def _validate_and_save_image(content: bytes, filename_prefix: str) -> str | None:
    """Validate image content and save to uploads. Returns the filename or None."""
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        img = Image.open(tmp_path)
        width, height = img.size
        if width * height > MAX_IMAGE_PIXELS:
            return None
        img.thumbnail((1200, 900), Image.LANCZOS)

        ext = img.format.lower() if img.format else "jpg"
        if ext not in SAFE_EXTENSIONS:
            ext = "jpg"

        filename = f"{filename_prefix}{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        img.save(filepath, optimize=True, quality=85)
        return filename
    except (UnidentifiedImageError, OSError, ValueError):
        return None
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@router.post("/image", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP ruxsat etilgan")

    content = await _read_capped(file)
    if content is None:
        raise HTTPException(status_code=400, detail=f"Fayl hajmi {settings.MAX_FILE_SIZE_MB}MB dan oshmasligi kerak")

    filename = await _validate_and_save_image(content, "")
    if not filename:
        raise HTTPException(status_code=400, detail="Rasm formati noto'g'ri yoki fayl buzilgan")

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/broadcast/image", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
async def upload_broadcast_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP ruxsat etilgan")

    content = await _read_capped(file)
    if content is None:
        raise HTTPException(status_code=400, detail=f"Fayl hajmi {settings.MAX_FILE_SIZE_MB}MB dan oshmasligi kerak")

    filename = await _validate_and_save_image(content, "broadcast_")
    if not filename:
        raise HTTPException(status_code=400, detail="Rasm formati noto'g'ri yoki fayl buzilgan")

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/stadium/{stadium_id}/images", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
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

    current_images = stadium.images or []
    if len(current_images) >= MAX_STADIUM_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maksimum {MAX_STADIUM_IMAGES} ta rasm yuklash mumkin")

    urls = []
    skipped = 0
    for file in files[:10]:
        if len(current_images) + len(urls) >= MAX_STADIUM_IMAGES:
            break
        if file.content_type not in ALLOWED_TYPES:
            skipped += 1
            continue
        content = await _read_capped(file)
        if content is None:
            skipped += 1
            continue

        filename = await _validate_and_save_image(content, f"stadium_{stadium_id}_")
        if filename:
            urls.append(f"/uploads/{filename}")
        else:
            skipped += 1

    stadium.images = current_images + urls
    if not stadium.cover_image and urls:
        stadium.cover_image = urls[0]

    db.commit()
    return {"uploaded": urls, "skipped": skipped, "total": len(stadium.images)}
