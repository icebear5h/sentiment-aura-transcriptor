from pydantic import BaseModel
from typing import List

class TextProcessRequest(BaseModel):
    text: str

class ParticleParameterMapping(BaseModel):
    # Direct simulation parameters
    particleCount: int
    particleSize: float
    brightness: float
    speed: float
    timeScale: float
    transitionSpeed: float
    pulse: float
    noiseScale: float
    noiseStrength: float
    flowDensity: float
    turbulence: float
    primaryColor: str
    secondaryColor: str

    # Legacy/qualitative parameters for UI effects
    clarity: float
    intensity: float
    coherence: float
    stability: float
    density: float
    sharpness: float
    quantity: float
    opacity: float
    pulsing: float
    flowPattern: str

class SentimentResponse(BaseModel):
    sentiment: float  # 0-1 scale
    sentiment_type: str  # "positive", "negative", "neutral"
    keywords: List[str]
    confidence: float
    parameters: ParticleParameterMapping
