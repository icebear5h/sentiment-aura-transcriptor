import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file for local development
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",
]

if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

# LLM Models
SENTIMENT_MODEL = "llama-3.3-70b-versatile"
PARAMETER_MODEL = "llama-3.1-8b-instant"

# Debug: Print API key status at startup
if GROQ_API_KEY:
    print(f"[OK] Groq API key loaded (starts with: {GROQ_API_KEY[:8]}...)")
else:
    print("[ERROR] Groq API key not found! Check your .env file.")
