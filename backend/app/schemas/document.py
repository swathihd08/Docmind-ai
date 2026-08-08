from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_path: str
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


class SearchResultItem(BaseModel):
    doc_id: int
    filename: str
    text: str
    distance: float