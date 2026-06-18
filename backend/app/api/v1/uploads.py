from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
from PIL import Image
import aiofiles

from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.core.database import get_db
from app.models.stadium import Stadium
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


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

    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    try:
        img = Image.open(filepath)
        img.thumbnail((1200, 900), Image.LANCZOS)
        img.save(filepath, optimize=True, quality=85)
    except Exception:
        pass

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

    ext = file.filename.split(".")[-1].lower()
    filename = f"broadcast_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    try:
        img = Image.open(filepath)
        img.thumbnail((1200, 900), Image.LANCZOS)
        img.save(filepath, optimize=True, quality=85)
    except Exception:
        pass

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

    urls = []
    for file in files[:10]:
        if file.content_type not in ALLOWED_TYPES:
            continue
        content = await file.read()
        if len(content) > MAX_SIZE:
            continue

        ext = file.filename.split(".")[-1].lower()
        filename = f"stadium_{stadium_id}_{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)

        try:
            img = Image.open(filepath)
            img.thumbnail((1200, 900), Image.LANCZOS)
            img.save(filepath, optimize=True, quality=85)
        except Exception:
            pass

        url = f"/uploads/{filename}"
        urls.append(url)

    current_images = stadium.images or []
    stadium.images = current_images + urls
    if not stadium.cover_image and urls:
        stadium.cover_image = urls[0]

    db.commit()
    return {"uploaded": urls, "total": len(stadium.images)}
