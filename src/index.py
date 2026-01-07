from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
from typing import List, Optional
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file for local development
# Vercel automatically provides environment variables, so this is only for local
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Sentiment Aura API - Groq")

# CORS middleware for frontend connection
# Allow localhost for development and any Vercel deployment
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",  # All Vercel preview deployments
]

# Get production domain from environment if set
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Vercel (you can restrict this later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class TextProcessRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment: float  # 0-1 scale
    sentiment_type: str  # "positive", "negative", "neutral"
    keywords: List[str]
    confidence: float

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Debug: Print API key status at startup
if GROQ_API_KEY:
    print(f"✅ Groq API key loaded (starts with: {GROQ_API_KEY[:8]}...)")
else:
    print("❌ Groq API key not found! Check your .env file.")


async def process_with_groq(text: str) -> dict:
    """Process text using Groq API (non-streaming)"""
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    try:
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a sentiment analysis expert. Analyze the given text and return ONLY a valid JSON object with these exact fields:
{
  "sentiment": <float between 0 and 1, where 0 is most negative and 1 is most positive>,
  "sentiment_type": <"positive", "negative", or "neutral">,
  "keywords": <array of emotional/qualia descriptors - extract as many as are relevant>,
  "confidence": <float between 0 and 1>
}

CRITICAL: All numeric values MUST be valid decimal numbers (e.g., 0.75, 0.9, 0.35). DO NOT write out numbers as words.

IMPORTANT: Keywords MUST be ONLY emotional or qualitative descriptors similar to things in these categories (feel free to get more nuanced and use sophisticated vocabulary when it captures the feeling better):

CALM & PEACE: peaceful, serene, tranquil, gentle, soft, quiet, still, relaxed, calm, soothing, mellow, placid, contemplative, reflective, mindful, centered, balanced, meditative

ENERGY & EXCITEMENT: vibrant, dynamic, energetic, lively, spirited, electric, intense, powerful, active, vigorous, thrilled, exhilarated, animated, enthusiastic, eager, excited, euphoric, ecstatic, elated, jubilant

CHAOS & DISORDER: turbulent, chaotic, frantic, wild, unstable, erratic, volatile, scattered, hectic, confused, disoriented, frenzied, manic, feverish, desperate, panicked

HAPPINESS & JOY: joyful, happy, cheerful, bright, radiant, delighted, blissful, uplifting, pleasant, gleeful, playful, whimsical, lighthearted, mischievous

SADNESS & MELANCHOLY: melancholy, somber, wistful, pensive, subdued, muted, sad, gloomy, heavy, sorrowful, mournful, elegiac, plaintive, doleful, despairing, hopeless, desolate, forlorn

ANXIETY & FEAR: anxious, tense, nervous, uneasy, restless, agitated, jittery, worried, uncertain, uncomfortable, fearful, apprehensive, dreadful, terrified, alarmed, scared

ANGER & AGGRESSION: angry, furious, irate, enraged, livid, wrathful, indignant, hostile, fierce, irritated, annoyed, vexed, aggravated, exasperated, frustrated

MYSTERY & WONDER: mysterious, enigmatic, ethereal, cosmic, dreamy, surreal, otherworldly, mystical, strange, ambiguous, awestruck, amazed, wonderstruck, astonished, dazzled, spellbound

CONFIDENCE & STRENGTH: confident, certain, clear, assured, bold, strong, decisive, firm, resolute, determined, powerful, mighty, formidable, commanding, authoritative

LOVE & WARMTH: warm, cozy, comfortable, inviting, tender, affectionate, loving, caring, nurturing, compassionate, romantic, passionate, ardent, devoted, intimate

COLDNESS & DISTANCE: cold, distant, detached, aloof, remote, impersonal, frigid, icy, indifferent, withdrawn, lonely, isolated, solitary, abandoned

HOPE & OPTIMISM: hopeful, optimistic, promising, encouraging, inspiring, heartening, buoyant

NOSTALGIA & MEMORY: nostalgic, wistful, reminiscent, sentimental, bittersweet, longing, evocative

SOLEMNITY: solemn, grave, serious, austere, dignified, formal, reverent

CURIOSITY: curious, inquisitive, intrigued, fascinated, interested, exploring, wondering

Use expressive vocabulary that captures the FEELING. Do NOT use concrete nouns, verbs, or factual descriptors."""
                },
                {
                    "role": "user",
                    "content": f"Analyze this text: {text}"
                }
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content
        
        # Parse and validate JSON
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Invalid JSON from LLM: {str(e)}")
        
        # Validate required fields and types
        required_fields = ["sentiment", "sentiment_type", "keywords", "confidence"]
        for field in required_fields:
            if field not in result:
                raise HTTPException(status_code=500, detail=f"Missing field '{field}' in LLM response")
        
        # Ensure numeric fields are valid floats
        try:
            result["sentiment"] = float(result["sentiment"])
            result["confidence"] = float(result["confidence"])
        except (ValueError, TypeError) as e:
            raise HTTPException(status_code=500, detail=f"Invalid numeric value in LLM response: {str(e)}")
        
        # Ensure keywords is a list
        if not isinstance(result["keywords"], list):
            result["keywords"] = []
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")


def is_complete_sentence(text: str) -> bool:
    """Check if text contains a complete sentence (ends with . ! ? or has 10+ words)"""
    text = text.strip()
    if not text:
        return False
    
    # Check for sentence-ending punctuation
    if text[-1] in '.!?':
        return True
    
    # Check for reasonable length (10+ words suggests a complete thought)
    word_count = len(text.split())
    return word_count >= 10


@app.get("/")
async def root():
    return {"message": "Sentiment Aura API", "status": "running", "provider": "groq"}


@app.post("/process_text", response_model=SentimentResponse)
async def process_text(request: TextProcessRequest):
    """
    Process text and return sentiment analysis and keywords.
    This endpoint proxies requests to Groq API.
    """
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Text is too short")
    
    try:
        result = await process_with_groq(request.text)
        
        # Validate response structure
        if not all(key in result for key in ["sentiment", "sentiment_type", "keywords", "confidence"]):
            raise HTTPException(status_code=500, detail="Invalid response structure from LLM")
        
        return SentimentResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "provider": "groq",
        "api_key_configured": bool(GROQ_API_KEY)
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time sentiment analysis.
    Buffers incoming transcript text and processes complete sentences.
    """
    await websocket.accept()
    print("✅ WebSocket client connected")
    
    text_buffer = ""
    
    try:
        while True:
            # Receive message from frontend
            data = await websocket.receive_json()
            
            if data.get("type") == "transcript":
                text = data.get("text", "").strip()
                
                if not text:
                    continue
                
                # Add to buffer
                text_buffer += " " + text if text_buffer else text
                print(f"📝 Buffer: {text_buffer[:80]}...")
                
                # Echo back the transcript for display
                await websocket.send_json({
                    "type": "transcript_update",
                    "text": text_buffer
                })
                
                # Check if we have a complete sentence
                if is_complete_sentence(text_buffer):
                    print(f"🔍 Processing complete sentence: {text_buffer}")
                    
                    await websocket.send_json({
                        "type": "processing",
                        "message": "Analyzing sentiment..."
                    })
                    
                    try:
                        result = await process_with_groq(text_buffer)
                        
                        await websocket.send_json({
                            "type": "result",
                            "data": result
                        })
                        
                        print(f"✅ Sent result: sentiment={result.get('sentiment'):.2f}, type={result.get('sentiment_type')}, keywords={result.get('keywords')}")
                        
                        # Clear buffer after successful processing
                        text_buffer = ""
                        
                    except Exception as e:
                        print(f"❌ Processing error: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Processing error: {str(e)}"
                        })
                        # Keep buffer on error so user can try again
            
            elif data.get("type") == "clear_buffer":
                text_buffer = ""
                await websocket.send_json({"type": "buffer_cleared"})
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        print("🔌 WebSocket client disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
