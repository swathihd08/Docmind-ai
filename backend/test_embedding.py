from app.services.embedding_service import EmbeddingService

def test_embeddings():
    sample_chunks = [
        "DocMind AI is an enterprise RAG assistant.",
        "FAISS is used for fast similarity search of vectors."
    ]

    print("🧠 Loading model and generating embeddings...")
    embeddings = EmbeddingService.generate_embeddings(sample_chunks)

    print("\n" + "=" * 60)
    print("EMBEDDING VERIFICATION RESULTS")
    print("=" * 60)
    print(f"Total Chunks Processed : {len(embeddings)}")
    print(f"Vector Dimensionality    : {len(embeddings[0])} (Should be 384)")
    print(f"Sample Vector Values   : {embeddings[0][:5]} ...")
    print("=" * 60)

if __name__ == "__main__":
    test_embeddings()