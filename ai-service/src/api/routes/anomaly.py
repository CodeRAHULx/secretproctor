from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["Anomaly"])

class AnomalyScanRequest(BaseModel):
    userId: str
    faceCount: int = 1
    gazeDeviationX: float = 0.0
    gazeDeviationY: float = 0.0
    audioVolume: float = 0.0

class AnomalyScanResponse(BaseModel):
    isAnomaly: bool
    riskScore: int
    anomalies: List[str]

@router.post("/anomaly/detect", response_model=AnomalyScanResponse)
async def detect_anomaly(req: AnomalyScanRequest):
    anomalies = []
    risk = 0

    if req.faceCount == 0:
        anomalies.append("NO_FACE_DETECTED")
        risk += 40
    elif req.faceCount > 1:
        anomalies.append("MULTIPLE_FACES_DETECTED")
        risk += 60

    if abs(req.gazeDeviationX) > 0.65 or abs(req.gazeDeviationY) > 0.65:
        anomalies.append("PERSISTENT_OFF_SCREEN_GAZE")
        risk += 30

    return AnomalyScanResponse(
        isAnomaly=risk > 30,
        riskScore=min(risk, 100),
        anomalies=anomalies
    )
