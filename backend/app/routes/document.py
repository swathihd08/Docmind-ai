import os
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.database.document_model import Document
from app.schemas.document import (
    DocumentResponse,
    SearchRequest,
    SearchResultItem,
    AskResponse,
)
from app.services.text_extractor import TextExtractor
from app.services.text_chunker import TextChunker
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService
from app.services.gemini_service import GeminiService

# This was the missing line that caused the crash!
router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.get("/", response_model=List[DocumentResponse])
def get_all_documents(db: Session = Depends(get_db)):
    """Fetch all uploaded documents from the SQLite database."""
    # Order by ID descending so the newest uploads show at the top
    return db.query(Document).order_by(Document.id.desc()).all()


@router.post(
    "/upload",
    response_model=DocumentResponse
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    allowed_extensions = [".pdf", ".docx", ".xlsx"]
    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX and XLSX files are allowed."
        )

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

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

    extracted_text = TextExtractor.extract(file_path)
    chunks = TextChunker.chunk_text(extracted_text)
    embeddings = EmbeddingService.generate_embeddings(chunks)

    VectorStoreService.add_chunks(
        embeddings=embeddings,
        chunks=chunks,
        doc_id=document.id,
        filename=document.filename
    )

    return document


@router.post(
    "/search",
    response_model=List[SearchResultItem]
)
async def search_documents(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    query_embeddings = EmbeddingService.generate_embeddings([request.query])
    if not query_embeddings:
        return []

    return VectorStoreService.search(
        query_embedding=query_embeddings[0],
        top_k=request.top_k
    )


@router.post(
    "/ask",
    response_model=AskResponse
)
async def ask_question(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    query_embeddings = EmbeddingService.generate_embeddings([request.query])
    if not query_embeddings:
        raise HTTPException(status_code=500, detail="Failed to generate query embedding.")

    context_chunks = VectorStoreService.search(
        query_embedding=query_embeddings[0],
        top_k=request.top_k
    )

    # Convert Pydantic chat history models to plain dicts for the service
    formatted_history = [msg.dict() for msg in request.chat_history] if request.chat_history else []

    rag_result = GeminiService.generate_answer(
        query=request.query,
        context_chunks=context_chunks,
        chat_history=formatted_history
    )

    return AskResponse(
        query=request.query,
        answer=rag_result["answer"],
        citations=rag_result["citations"]
    )

@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Deletes a document from the database and removes the physical file."""
    document = db.query(Document).filter(Document.id == doc_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # 1. Delete physical file from the uploads folder
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
        
    # 2. Delete from SQLite Database
    db.delete(document)
    db.commit()
    
    return {"message": f"Successfully deleted {document.filename}"}