import os
import requests
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")

class GeminiService:
    @staticmethod
    def is_configured() -> bool:
        return bool(GEMINI_API_KEY)

    @staticmethod
    def generate(prompt: str) -> str:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048}
        }
        res = requests.post(url, json=payload, timeout=15)
        if not res.ok:
            raise RuntimeError(f"Gemini API error: {res.text}")
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
