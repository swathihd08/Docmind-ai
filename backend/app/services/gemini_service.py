import os
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    """Service to generate RAG answers with citations using Google's Gemini LLM."""

    @classmethod
    def _clean_reasoning_output(cls, text: str) -> str:
        lines = text.strip().splitlines()
        normal_paragraphs = [
            line.strip()
            for line in lines
            if line.strip()
            and not line.strip().startswith("*")
            and not line.strip().startswith("-")
            and not line.strip().startswith("#")
        ]
        if normal_paragraphs:
            return normal_paragraphs[-1]
        return text.strip()

    @classmethod
    def generate_answer(
        cls, 
        query: str, 
        context_chunks: List[Dict[str, Any]],
        chat_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key or api_key.strip() == "" or "AIzaSy..." in api_key:
            return {
                "answer": "Error: GEMINI_API_KEY is not configured in the backend environment.",
                "citations": [],
            }

        if not context_chunks:
            return {
                "answer": "I couldn't find any relevant information in the uploaded documents to answer your question.",
                "citations": [],
            }

        genai.configure(api_key=api_key)

        # 1. Format context and extract unique citations
        context_text = ""
        citations = []
        seen_files = set()

        for i, chunk in enumerate(context_chunks, start=1):
            context_text += f"\n[Source {i} - File: {chunk['filename']}]\n{chunk['text']}\n"
            if chunk["filename"] not in seen_files:
                citations.append({"filename": chunk["filename"], "doc_id": chunk["doc_id"]})
                seen_files.add(chunk["filename"])

        # 2. Format Chat History (Keep last 4 interactions to save tokens)
        history_text = ""
        if chat_history:
            history_text = "====================\nPREVIOUS CHAT HISTORY:\n"
            for msg in chat_history[-4:]:
                role_name = "User" if msg.get("role") == "user" else "AI"
                history_text += f"{role_name}: {msg.get('content')}\n"
            history_text += "====================\n"

        # 3. Build prompt
        prompt = f"""You are DocMind AI, an enterprise Retrieval-Augmented Generation (RAG) assistant.
Answer the user's newest question explicitly and accurately using ONLY the provided context sources below.
If the user refers to something said earlier, use the PREVIOUS CHAT HISTORY for context, but base facts ONLY on CONTEXT SOURCES.
Do NOT include any internal checklists, bullet points, or drafting notes. Output ONLY the final answer sentence or paragraph.
If the answer cannot be found in the provided context, state clearly that the document does not contain this information.
Always mention the source filename when referencing facts from the documents.

{history_text}
====================
CONTEXT SOURCES:
{context_text}
====================

USER QUESTION:
{query}

ANSWER:"""

        try:
            available_models = [
                m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods
            ]
        except Exception as e:
            return {"answer": f"Error connecting to Gemini API: {str(e)}", "citations": []}

        preferred_order = [
            "models/gemini-1.5-flash", "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-pro", "models/gemini-2.0-flash", "models/gemini-2.5-flash",
        ]

        models_to_try = [m for m in preferred_order if m in available_models]
        for m in available_models:
            if m not in models_to_try:
                models_to_try.append(m)

        answer_text = None
        last_error = None

        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                answer_text = cls._clean_reasoning_output(response.text.strip())
                break
            except Exception as e:
                last_error = str(e)
                continue

        if not answer_text:
            answer_text = f"Error generating response from Gemini: {last_error}"

        return {"answer": answer_text, "citations": citations}