import requests
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self, model_name="llama3.1:latest", base_url="http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.api_generate = f"{base_url}/api/generate"

    def _generate(self, prompt: str, system_prompt: str = None) -> str:
        """Helper to call Ollama generate API"""
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic/factual outputs
                "top_p": 0.9,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(self.api_generate, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama API error: {e}")
            # Fallback or re-raise depending on strategy. For now, log and return empty.
            return ""

    def categorize_product(self, description: str, taxonomy_context: str = "") -> Dict[str, Any]:
        """
        Categorize a product description into ONDC taxonomy levels.
        taxonomy_context can be a simplified string representation of the taxonomy tree.
        """
        system_prompt = """You are an AI assistant for ONDC (Open Network for Digital Commerce). 
        Your task is to categorize product descriptions into a hierarchical taxonomy (Level 1 > Level 2 > Level 3). 
        You must also extract key attributes like material, color, usage, etc.
        Return ONLY valid JSON."""

        prompt = f"""
        Product Description: "{description}"
        
        Task:
        1. Classify this product into Level 1, Level 2, and Level 3 categories.
        2. Extract key attributes as key-value pairs.
        3. Identify compliance requirements (e.g., FSSAI, BIS) if applicable.

        Output Format (JSON):
        {{
            "categories": {{
                "level_1": "Category",
                "level_2": "Sub-Category",
                "level_3": "Item Type"
            }},
            "attributes": {{
                "attribute_1": "value",
                "attribute_2": "value"
            }},
            "compliance": ["Requirement1", "Requirement2"],
            "confidence": 0.95
        }}
        """
        
        try:
            response_text = self._generate(prompt, system_prompt)
            # Find JSON in response (in case of extra text)
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = response_text[start:end]
                return json.loads(json_str)
            else:
                 # Fallback
                return {"categories": {}, "attributes": {}, "compliance": [], "confidence": 0.0}
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON")
            return {"categories": {}, "attributes": {}, "compliance": [], "confidence": 0.0}


    def extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Extract business entities from a voice transcript.
        """
        system_prompt = """You are an AI assistant processing voice transcripts for business registration.
        Extract the following fields: Company Name, Owner Name, Location (City/State), Products (list), Contact Info (Phone/Email).
        Return ONLY valid JSON."""

        prompt = f"""
        Transcript: "{text}"

        Output Format (JSON):
        {{
            "company_name": "Name or null",
            "owner_name": "Name or null",
            "location": {{
                "city": "City or null",
                "state": "State or null"
            }},
            "products": ["product1", "product2"],
            "contact": {{
                "phone": "Number or null",
                "email": "Email or null"
            }}
        }}
        """

        try:
            response_text = self._generate(prompt, system_prompt)
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = response_text[start:end]
                return json.loads(json_str)
            else:
                return {}
        except Exception:
            return {}
