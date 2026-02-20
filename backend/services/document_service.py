from typing import Dict, Any

class DocumentService:
    def process_document(self, file_bytes: bytes, file_type: str, document_type: str) -> Dict[str, Any]:
        """Mock OCR processing"""
        return {
            "extracted_text": "Sample Extracted Text",
            "fields": {
                "gst_number": "29ABCDE1234F1Z5",
                "legal_name": "Raj Handicrafts"
            }
        }

    def validate(self, document_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock validation"""
        return {
            "valid": True,
            "details": {"source": "GST Portal"},
            "errors": []
        }
