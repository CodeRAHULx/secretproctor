from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
from services.gemini_service import GeminiService

router = APIRouter(prefix="/api/v1", tags=["Memo"])

class MessageItem(BaseModel):
    id: Optional[str] = None
    senderName: str
    text: str
    timestamp: Optional[str] = None

class MemoRequest(BaseModel):
    roomId: str = "meeting"
    messages: List[MessageItem] = []

class MemoResponse(BaseModel):
    roomId: str
    generatedAt: str
    messageCount: int
    memo: str

@router.post("/memo", response_model=MemoResponse)
async def generate_memo(req: MemoRequest):
    if not req.messages:
        return MemoResponse(
            roomId=req.roomId,
            generatedAt=datetime.now().isoformat(),
            messageCount=0,
            memo="No chat messages recorded in this meeting to summarize."
        )

    transcript = "\n".join([f"[{m.timestamp or ''}] {m.senderName}: {m.text}" for m in req.messages])
    prompt = f"""You are a professional meeting assistant. Create a clear, executive meeting memo from this live chat transcript:

Room: {req.roomId}

TRANSCRIPT:
{transcript}

Please structure the memo with:
1. Summary (2-3 sentences)
2. Key Decisions & Discussion Points
3. Action Items (if any)
4. Participants Involved
5. Meeting Sentiment (Productive, Cooperative, Urgent, etc.)"""

    try:
        memo = GeminiService.generate(prompt)
        return MemoResponse(
            roomId=req.roomId,
            generatedAt=datetime.now().isoformat(),
            messageCount=len(req.messages),
            memo=memo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
