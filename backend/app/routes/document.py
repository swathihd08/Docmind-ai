import os
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.database.document_model import Document
from app.schemas.document import DocumentResponse
from app.services.text_extractor import TextExtractor
from app.services.text_chunker import TextChunker
from app.services.embedding_service import EmbeddingService

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

    extracted_text = TextExtractor.extract(file_path)
    chunks = TextChunker.chunk_text(extracted_text)

    # Generate embeddings for document chunks
    print("\nGenerating embeddings for document chunks...")
    embeddings = EmbeddingService.generate_embeddings(chunks)

    print("\n" + "=" * 70)
    print("DOCUMENT PROCESSING SUMMARY")
    print("=" * 70)
    print(f"Total Chunks Created  : {len(chunks)}")
    print(f"Total Embeddings      : {len(embeddings)}")
    if embeddings:
        print(f"Vector Dimension      : {len(embeddings[0])}")
        print(f"Chunk 1 Preview       : {chunks[0][:80]}...")
        print(f"Chunk 1 Vector Start  : {embeddings[0][:4]}...")
    print("=" * 70)

    document = Document(
        filename=file.filename,
        file_type=extension.replace(".", ""),
        file_path=file_path
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document