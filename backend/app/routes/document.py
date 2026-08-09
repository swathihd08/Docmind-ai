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