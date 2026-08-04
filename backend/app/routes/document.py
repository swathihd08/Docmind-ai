import os
import shutil

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.database.document_model import Document
from app.schemas.document import DocumentResponse

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post(
    "/upload",
    response_model=DocumentResponse
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    allowed_extensions = [
        ".pdf",
        ".docx",
        ".xlsx"
    ]

    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX and XLSX files are allowed."
        )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document = Document(
        filename=file.filename,
        file_type=extension.replace(".", ""),
        file_path=file_path
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document