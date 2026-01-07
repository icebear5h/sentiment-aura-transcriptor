from fastapi import APIRouter
from backend.config import GROQ_API_KEY

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Sentiment Aura API", "status": "running", "provider": "groq"}

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "provider": "groq",
        "api_key_configured": bool(GROQ_API_KEY)
    }
