from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gemini_service import GeminiService

router = APIRouter(prefix="/api/v1", tags=["Translation"])

class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str = "English"

class TranslateResponse(BaseModel):
    original: str
    translated: str
    targetLanguage: str

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if not GeminiService.is_configured():
        return TranslateResponse(original=req.text, translated=req.text, targetLanguage=req.targetLanguage)

    prompt = f"""You are a real-time meeting chat translator.
Translate the following message to {req.targetLanguage}.
If it is already in {req.targetLanguage}, return it unchanged.
Only return the translated text, nothing else.

Message: "{req.text}" """

    try:
        translated = GeminiService.generate(prompt)
        return TranslateResponse(original=req.text, translated=translated, targetLanguage=req.targetLanguage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
