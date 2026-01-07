from fastapi import APIRouter, HTTPException
from backend.models import TextProcessRequest, SentimentResponse
from backend.services import process_sentiment, translate_keywords_to_parameters

router = APIRouter()

@router.post("/process_text", response_model=SentimentResponse)
async def process_text(request: TextProcessRequest):
    """
    Process text and return sentiment analysis and keywords.
    This endpoint is called when Deepgram returns is_final=true transcripts.
    """
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Text is too short")

    try:
        result = await process_sentiment(request.text)

        # Validate response structure
        if not all(key in result for key in ["sentiment", "sentiment_type", "keywords", "confidence"]):
            raise HTTPException(status_code=500, detail="Invalid response structure from LLM")

        parameters = await translate_keywords_to_parameters(result.get("keywords", []), request.text)

        return SentimentResponse(**result, parameters=parameters)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")
