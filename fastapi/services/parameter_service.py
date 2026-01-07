import json
from typing import List, Optional
from fastapi import HTTPException
from groq import AsyncGroq
from backend.config import GROQ_API_KEY, PARAMETER_MODEL
from backend.prompts import KEYWORD_TRANSLATION_PROMPT
from backend.models import ParticleParameterMapping

# Initialize async Groq client
client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Sensible mid-range defaults in case parsing fails
DEFAULT_PARAMS = {
    "particleCount": 5250,
    "particleSize": 0.018,
    "brightness": 0.7,
    "speed": 1.0,
    "timeScale": 1.0,
    "transitionSpeed": 0.75,
    "pulse": 0.75,
    "noiseScale": 0.8,
    "noiseStrength": 0.5,
    "flowDensity": 0.4,
    "turbulence": 0.5,
    "primaryColor": "#88aaff",
    "secondaryColor": "#aa88ff",
    "clarity": 0.5,
    "intensity": 0.5,
    "coherence": 0.5,
    "stability": 0.5,
    "density": 0.5,
    "sharpness": 0.5,
    "quantity": 0.5,
    "opacity": 0.8,
    "pulsing": 0.75,
    "flowPattern": "free",
}

def clamp_value(value: Optional[float], default: float, min_value: float, max_value: float) -> float:
    """Clamp a value between min and max, with a default fallback."""
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = default
    return max(min_value, min(max_value, numeric))

def build_keyword_translation_prompt(keywords: List[str], processed_text: Optional[str]) -> str:
    """Build the keyword translation prompt with context."""
    context_line = f'Full processed text context: "{processed_text}"' if processed_text else ""
    prompt = KEYWORD_TRANSLATION_PROMPT.replace("{KEYWORDS}", ", ".join(keywords))
    return prompt.replace("{PROCESSED_TEXT}", context_line)

async def translate_keywords_to_parameters(keywords: List[str], processed_text: Optional[str]) -> ParticleParameterMapping:
    """Translate emotional keywords into simulation parameters using Groq."""
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    if not keywords:
        keywords = ["neutral"]

    prompt = build_keyword_translation_prompt(keywords, processed_text)

    try:
        completion = await client.chat.completions.create(
            model=PARAMETER_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.5,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        content = completion.choices[0].message.content if completion.choices else "{}"
        raw_params = json.loads(content) if content else {}
    except Exception as e:
        print(f"[ERROR] Groq parameter translation failed: {e}")
        raw_params = {}

    params = {**DEFAULT_PARAMS, **(raw_params if isinstance(raw_params, dict) else {})}

    return ParticleParameterMapping(
        particleCount=int(clamp_value(params.get("particleCount"), DEFAULT_PARAMS["particleCount"], 500, 10000)),
        particleSize=clamp_value(params.get("particleSize"), DEFAULT_PARAMS["particleSize"], 0.005, 0.10),
        brightness=clamp_value(params.get("brightness"), DEFAULT_PARAMS["brightness"], 0.2, 1.0),
        speed=clamp_value(params.get("speed"), DEFAULT_PARAMS["speed"], 0.1, 5.0),
        timeScale=clamp_value(params.get("timeScale"), DEFAULT_PARAMS["timeScale"], 0.5, 2.0),
        transitionSpeed=clamp_value(params.get("transitionSpeed"), DEFAULT_PARAMS["transitionSpeed"], 0.1, 3.0),
        pulse=clamp_value(params.get("pulse"), DEFAULT_PARAMS["pulse"], 0.0, 1.0),
        noiseScale=clamp_value(params.get("noiseScale"), DEFAULT_PARAMS["noiseScale"], 0.1, 2.0),
        noiseStrength=clamp_value(params.get("noiseStrength"), DEFAULT_PARAMS["noiseStrength"], 0.2, 5.0),
        flowDensity=clamp_value(params.get("flowDensity"), DEFAULT_PARAMS["flowDensity"], 0.01, 0.80),
        turbulence=clamp_value(params.get("turbulence"), DEFAULT_PARAMS["turbulence"], 0.0, 2.0),
        primaryColor=params.get("primaryColor", DEFAULT_PARAMS["primaryColor"]),
        secondaryColor=params.get("secondaryColor", DEFAULT_PARAMS["secondaryColor"]),
        clarity=clamp_value(params.get("clarity"), DEFAULT_PARAMS["clarity"], 0.0, 1.0),
        intensity=clamp_value(params.get("intensity"), DEFAULT_PARAMS["intensity"], 0.0, 1.0),
        coherence=clamp_value(params.get("coherence"), DEFAULT_PARAMS["coherence"], 0.0, 1.0),
        stability=clamp_value(params.get("stability"), DEFAULT_PARAMS["stability"], 0.0, 1.0),
        density=clamp_value(params.get("density"), DEFAULT_PARAMS["density"], 0.0, 1.0),
        sharpness=clamp_value(params.get("sharpness"), DEFAULT_PARAMS["sharpness"], 0.0, 1.0),
        quantity=clamp_value(params.get("quantity"), DEFAULT_PARAMS["quantity"], 0.0, 1.0),
        opacity=clamp_value(params.get("opacity"), DEFAULT_PARAMS["opacity"], 0.0, 1.0),
        pulsing=clamp_value(params.get("pulsing", params.get("pulse")), DEFAULT_PARAMS["pulsing"], 0.0, 1.0),
        flowPattern=str(params.get("flowPattern", DEFAULT_PARAMS["flowPattern"])),
    )
