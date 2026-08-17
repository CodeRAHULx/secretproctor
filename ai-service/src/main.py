import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import translation, memo, transcription, anomaly
from services.gemini_service import GeminiService

app = FastAPI(
    title="SecureMeet AI Microservice",
    version="2.0.0",
    description="High-performance AI backend for Real-Time Translation, Meeting Memos, and Video Anomaly Forensics"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translation.router)
app.include_router(memo.router)
app.include_router(transcription.router)
app.include_router(anomaly.router)

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "SecureMeet AI Engine",
        "gemini_configured": GeminiService.is_configured()
    }

if __name__ == "__main__":
    port = int(os.getenv("AI_PORT", 8000))
    print(f"🚀 SecureMeet AI Microservice running on http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
