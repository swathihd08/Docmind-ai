import os
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

# Ensure environment variables are reloaded from .env
load_dotenv()


class GeminiService:
    """Service to generate RAG answers with citations using Google's Gemini LLM."""

    @classmethod
    def _clean_reasoning_output(cls, text: str) -> str:
        """Strips out bulleted 'thinking' or scratchpad notes from models like Gemma."""
        lines = text.strip().splitlines()
        # If the output contains scratchpad bullets, grab only the normal paragraphs at the end
        normal_paragraphs = [
            line.strip()
            for line in lines
            if line.strip()
            and not line.strip().startswith("*")
            and not line.strip().startswith("-")
            and not line.strip().startswith("#")
        ]
        if normal_paragraphs:
            # Return the last clean paragraph (which is the finalized answer)
            return normal_paragraphs[-1]
        return text.strip()

    @classmethod
    def generate_answer(
        cls, query: str, context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generates an answer from Gemini using retrieved FAISS chunks as context.

        :param query: User question
        :param context_chunks: Matching chunks returned by VectorStoreService.search
        :return: Dict containing AI answer and citation metadata
        """
        # Always reload environment and grab key dynamically
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

        # Configure Gemini with the active key
        genai.configure(api_key=api_key)

        # 1. Format context and extract unique citations
        context_text = ""
        citations = []
        seen_files = set()

        for i, chunk in enumerate(context_chunks, start=1):
            context_text += f"\n[Source {i} - File: {chunk['filename']}]\n{chunk['text']}\n"
            if chunk["filename"] not in seen_files:
                citations.append(
                    {
                        "filename": chunk["filename"],
                        "doc_id": chunk["doc_id"],
                    }
                )
                seen_files.add(chunk["filename"])

        # 2. Build prompt with explicit instruction against scratchpad notes
        prompt = f"""You are DocMind AI, an enterprise Retrieval-Augmented Generation (RAG) assistant.
Answer the user's question explicitly and accurately using ONLY the provided context sources below.
Do NOT include any internal checklists, bullet points, or drafting notes in your response. Output ONLY the final answer sentence or paragraph.
If the answer cannot be found in the provided context, state clearly that the document does not contain this information.
Always mention the source filename when referencing facts from the documents.

====================
CONTEXT SOURCES:
{context_text}
====================

USER QUESTION:
{query}

ANSWER:"""

        # 3. Dynamically discover available models and try them with automatic fallback
        try:
            available_models = [
                m.name
                for m in genai.list_models()
                if "generateContent" in m.supported_generation_methods
            ]
        except Exception as e:
            return {
                "answer": f"Error connecting to Gemini API to list models: {str(e)}",
                "citations": [],
            }

        # Prioritize stable free-tier models first
        preferred_order = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-flash-8b",
            "models/gemini-1.5-pro",
            "models/gemini-1.5-pro-latest",
            "models/gemini-pro",
            "models/gemini-2.0-flash",
            "models/gemini-2.5-flash",
        ]

        models_to_try = [m for m in preferred_order if m in available_models]
        for m in available_models:
            if m not in models_to_try:
                models_to_try.append(m)

        answer_text = None
        last_error = None

        for model_name in models_to_try:
            try:
                print(f"[RAG Pipeline] Attempting generation with: {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                raw_text = response.text.strip()
                # Clean up scratchpad notes if any model outputs them
                answer_text = cls._clean_reasoning_output(raw_text)
                print(f"[RAG Pipeline] Successfully generated answer using {model_name}!")
                break
            except Exception as e:
                last_error = str(e)
                print(
                    f"[RAG Pipeline] Model {model_name} failed. Trying next model..."
                )
                continue

        if not answer_text:
            answer_text = (
                f"Error generating response from Gemini: All available models failed. "
                f"Last error: {last_error}"
            )

        return {
            "answer": answer_text,
            "citations": citations,
        }