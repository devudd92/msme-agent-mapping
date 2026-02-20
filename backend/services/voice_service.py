import base64
from typing import Dict, Any, List

class VoiceService:
    def transcribe(self, audio_bytes: bytes, language: str) -> Dict[str, Any]:
        """Mock transcription"""
        # In a real app, this would call Azure/Google Speech API or Whisper
        mock_text = {
            "hi": "मेरी कंपनी का नाम राज हस्तशिल्प है और हम लकड़ी के खिलौने बनाते हैं",
            "en": "My company name is Raj Handicrafts and we make wooden toys"
        }.get(language, "Unknown language input")
        
        return {
            "text": mock_text,
            "confidence": 0.95,
            "processing_time": 1.2
        }

    def extract_entities(self, text: str, language: str) -> List[Dict[str, Any]]:
        """Mock entity extraction"""
        # Mocking generic extraction for demo
        return [
            {"entity": "Raj Handicrafts", "type": "ORG"},
            {"entity": "wooden toys", "type": "PRODUCT"}
        ]

    def text_to_speech(self, text: str, language: str) -> str:
        """Mock TTS - returns empty audio for now"""
        # Return a tiny blank wav mock
        return base64.b64encode(b"RIFF....WAVEfmt ....data....").decode("utf-8")
    
    def get_metrics(self):
        return {"total_transcriptions": 100, "avg_accuracy": 0.98}
