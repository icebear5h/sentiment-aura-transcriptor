import json
from fastapi import HTTPException
from groq import AsyncGroq
from backend.config import GROQ_API_KEY, SENTIMENT_MODEL
from backend.prompts import SENTIMENT_ANALYSIS_PROMPT

# Initialize async Groq client
client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

async def process_sentiment(text: str) -> dict:
    """Process text using Groq API for sentiment analysis."""
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    try:
        chat_completion = await client.chat.completions.create(
            model=SENTIMENT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": SENTIMENT_ANALYSIS_PROMPT
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
