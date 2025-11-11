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

// Get LLM provider from environment
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

async function processWithOpenAI(text: string): Promise<SentimentResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.choices[0].message.content
  return JSON.parse(content)
}

async function processWithAnthropic(text: string): Promise<SentimentResponse> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze the sentiment of this text and return ONLY a valid JSON object with these exact fields:
{
  "sentiment": <float between 0 and 1, where 0 is most negative and 1 is most positive>,
  "sentiment_type": <"positive", "negative", or "neutral">,
  "keywords": <array of 3-5 key emotional/thematic words or short phrases>,
  "confidence": <float between 0 and 1>
}

Be creative with keywords - include emotional descriptors, visual metaphors, and abstract concepts.

Text to analyze: ${text}`
        }
      ]
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const result = await response.json()
  let content = result.content[0].text
  
  // Extract JSON from markdown if present
  if (content.includes('```json')) {
    content = content.split('```json')[1].split('```')[0].trim()
  } else if (content.includes('```')) {
    content = content.split('```')[1].split('```')[0].trim()
  }
  
  return JSON.parse(content)
}

async function processWithGemini(text: string): Promise<SentimentResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze the sentiment of this text and return ONLY a valid JSON object with these exact fields:
{
  "sentiment": <float between 0 and 1, where 0 is most negative and 1 is most positive>,
  "sentiment_type": <"positive", "negative", or "neutral">,
  "keywords": <array of 3-5 key emotional/thematic words or short phrases>,
  "confidence": <float between 0 and 1>
}

Be creative with keywords - include emotional descriptors, visual metaphors, and abstract concepts.

Text to analyze: ${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.candidates[0].content.parts[0].text
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

    // Route to appropriate LLM provider
    let result: SentimentResponse
    
    if (LLM_PROVIDER === 'openai') {
      result = await processWithOpenAI(body.text)
    } else if (LLM_PROVIDER === 'anthropic') {
      result = await processWithAnthropic(body.text)
    } else if (LLM_PROVIDER === 'gemini') {
      result = await processWithGemini(body.text)
    } else {
      return NextResponse.json(
        { error: `Unknown LLM provider: ${LLM_PROVIDER}` },
        { status: 500 }
      )
    }

    // Validate response structure
    if (!result.sentiment || !result.sentiment_type || !result.keywords || !result.confidence) {
      return NextResponse.json(
        { error: 'Invalid response structure from LLM' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
