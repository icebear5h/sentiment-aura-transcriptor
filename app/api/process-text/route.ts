import { NextRequest, NextResponse } from 'next/server'

interface ProcessTextRequest {
  text: string
}

interface SentimentResponse {
  sentiment: number
  sentiment_type: 'positive' | 'negative' | 'neutral'
  keywords: string[]
  confidence: number
}

// Get Groq API key from environment
const GROQ_API_KEY = process.env.GROQ_API_KEY

async function processWithGroq(text: string): Promise<SentimentResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a sentiment analysis expert. Analyze the given text and return ONLY a valid JSON object with these exact fields:
{
  "sentiment": <float between 0 and 1, where 0 is most negative and 1 is most positive>,
  "sentiment_type": <"positive", "negative", or "neutral">,
  "keywords": <array of 3-5 key emotional/thematic words or short phrases>,
  "confidence": <float between 0 and 1>
}

Be creative with keywords - include emotional descriptors, visual metaphors, and abstract concepts that capture the essence of the text.`
        },
        {
          role: 'user',
          content: `Analyze this text: ${text}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  const content = result.choices[0].message.content
  return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessTextRequest = await request.json()

    if (!body.text || body.text.trim().length < 3) {
      return NextResponse.json(
        { error: 'Text is too short' },
        { status: 400 }
      )
    }

    const result = await processWithGroq(body.text)

    // Validate response structure
    if (!result.sentiment || !result.sentiment_type || !result.keywords || result.confidence === undefined) {
      throw new Error('Invalid response structure from LLM')
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process text' },
      { status: 500 }
    )
  }
}
