import os
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.database.document_model import Document
from app.schemas.document import DocumentResponse, SearchRequest, SearchResultItem
from app.services.text_extractor import TextExtractor
from app.services.text_chunker import TextChunker
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService

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

    # 1. Save document record in SQLite first so we get a unique ID
    document = Document(
        filename=file.filename,
        file_type=extension.replace(".", ""),
        file_path=file_path
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # 2. Extract, Chunk, and Embed
    extracted_text = TextExtractor.extract(file_path)
    chunks = TextChunker.chunk_text(extracted_text)

    print("\nGenerating embeddings for document chunks...")
    embeddings = EmbeddingService.generate_embeddings(chunks)

    # 3. Add to FAISS Vector Store
    print("Storing vectors in FAISS index...")
    total_indexed_vectors = VectorStoreService.add_chunks(
        embeddings=embeddings,
        chunks=chunks,
        doc_id=document.id,
        filename=document.filename
    )

    print("\n" + "=" * 70)
    print("DOCUMENT PROCESSING SUMMARY")
    print("=" * 70)
    print(f"Document ID           : {document.id}")
    print(f"Total Chunks Created  : {len(chunks)}")
    print(f"Total Embeddings      : {len(embeddings)}")
    if embeddings:
        print(f"Vector Dimension      : {len(embeddings[0])}")
        print(f"Chunk 1 Preview       : {chunks[0][:80]}...")
        print(f"Chunk 1 Vector Start  : {embeddings[0][:4]}...")
    print(f"Total FAISS Index Size: {total_indexed_vectors} vectors stored")
    print("=" * 70)

    return document


@router.post(
    "/search",
    response_model=List[SearchResultItem]
)
async def search_documents(request: SearchRequest):
    """Semantic similarity search against stored document chunks in FAISS."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    # 1. Convert user question into a 384-dimensional query vector
    print(f"\nGenerating embedding for search query: '{request.query}'")
    query_embeddings = EmbeddingService.generate_embeddings([request.query])

    if not query_embeddings:
        return []

    # 2. Search FAISS index for top_k closest chunks
    results = VectorStoreService.search(
        query_embedding=query_embeddings[0],
        top_k=request.top_k
    )

    print("\n" + "=" * 70)
    print("SEMANTIC SEARCH RESULTS")
    print("=" * 70)
    print(f"Query           : {request.query}")
    print(f"Matches Found   : {len(results)}")
    for i, match in enumerate(results, start=1):
        print(f"\nMatch {i} (Distance: {match['distance']:.4f})")
        print(f"File            : {match['filename']} (Doc ID: {match['doc_id']})")
        print(f"Chunk Text      : {match['text'][:120]}...")
    print("=" * 70)

    return results