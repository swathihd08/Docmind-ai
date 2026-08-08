import json
import os
from typing import Dict, List, Any
import faiss
import numpy as np

# Store index and metadata in the root-level vector_store directory
VECTOR_STORE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "vector_store",
)
INDEX_PATH = os.path.join(VECTOR_STORE_DIR, "docmind_faiss.index")
METADATA_PATH = os.path.join(VECTOR_STORE_DIR, "docmind_metadata.json")
DIMENSION = 384


class VectorStoreService:
    """Service to manage FAISS vector index and document chunk metadata persistence."""

    _index = None
    _metadata: List[Dict[str, Any]] = []

    @classmethod
    def _initialize(cls):
        """Ensure the vector store directory exists and load index/metadata if present."""
        os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

        if cls._index is None:
            if os.path.exists(INDEX_PATH):
                cls._index = faiss.read_index(INDEX_PATH)
            else:
                cls._index = faiss.IndexFlatL2(DIMENSION)

        if not cls._metadata and os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                cls._metadata = json.load(f)

    @classmethod
    def add_chunks(
        cls,
        embeddings: List[List[float]],
        chunks: List[str],
        doc_id: int,
        filename: str,
    ) -> int:
        """Add document chunk embeddings and metadata to FAISS index and save to disk."""
        if not embeddings or not chunks:
            return 0

        cls._initialize()

        # Convert embeddings to numpy float32 array required by FAISS
        vectors = np.array(embeddings).astype("float32")
        cls._index.add(vectors)

        # Store metadata mapping each vector index back to its source text and file
        for chunk_text in chunks:
            cls._metadata.append(
                {
                    "doc_id": doc_id,
                    "filename": filename,
                    "text": chunk_text,
                }
            )

        cls.save()
        return cls._index.ntotal

    @classmethod
    def search(
        cls, query_embedding: List[float], top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Search FAISS index for the top_k most similar chunks."""
        cls._initialize()

        if cls._index is None or cls._index.ntotal == 0:
            return []

        query_vector = np.array([query_embedding]).astype("float32")
        distances, indices = cls._index.search(
            query_vector, min(top_k, cls._index.ntotal)
        )

        results = []
        for idx, dist in zip(indices[0], distances[0]):
            if idx != -1 and idx < len(cls._metadata):
                match_info = cls._metadata[idx].copy()
                match_info["distance"] = float(dist)
                results.append(match_info)

        return results

    @classmethod
    def save(cls):
        """Persist FAISS index and metadata JSON to disk."""
        os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
        if cls._index is not None:
            faiss.write_index(cls._index, INDEX_PATH)
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(cls._metadata, f, indent=2, ensure_ascii=False)

    @classmethod
    def get_total_vectors(cls) -> int:
        """Return total number of vectors stored in the index."""
        cls._initialize()
        return cls._index.ntotal if cls._index else 0