from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_path: str
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True