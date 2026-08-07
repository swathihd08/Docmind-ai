from typing import List
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Service to generate 384-dimensional dense vector embeddings using sentence-transformers."""

    _model = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Lazy-load the SentenceTransformer model to optimize start-up time."""
        if cls._model is None:
            # Using industry-standard lightweight model all-MiniLM-L6-v2
            cls._model = SentenceTransformer("all-MiniLM-L6-v2")
        return cls._model

    @classmethod
    def generate_embeddings(cls, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a list of text chunks.

        :param texts: List of text strings/chunks
        :return: List of 384-dimensional floating point vector lists
        """
        if not texts:
            return []

        model = cls.get_model()
        embeddings = model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()