import fitz
import pandas as pd
from docx import Document


class TextExtractor:

    @staticmethod
    def extract_pdf(file_path: str) -> str:
        text = ""

        pdf = fitz.open(file_path)

        for page in pdf:
            text += page.get_text()

        pdf.close()

        return text.strip()

    @staticmethod
    def extract_docx(file_path: str) -> str:
        doc = Document(file_path)

        paragraphs = []

        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                paragraphs.append(paragraph.text)

        return "\n".join(paragraphs)

    @staticmethod
    def extract_xlsx(file_path: str) -> str:

        workbook = pd.ExcelFile(file_path)

        text = []

        for sheet in workbook.sheet_names:

            df = workbook.parse(sheet)

            text.append(f"===== Sheet: {sheet} =====")

            text.append(df.to_string(index=False))

            text.append("\n")

        return "\n".join(text)

    @staticmethod
    def extract(file_path: str):

        if file_path.lower().endswith(".pdf"):
            return TextExtractor.extract_pdf(file_path)

        if file_path.lower().endswith(".docx"):
            return TextExtractor.extract_docx(file_path)

        if file_path.lower().endswith(".xlsx"):
            return TextExtractor.extract_xlsx(file_path)

        return ""