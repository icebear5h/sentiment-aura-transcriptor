import { NextRequest, NextResponse } from 'next/server'

interface ProcessTextRequest {
  text: string
}

function getFastApiUrl(): string {
  const envUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL

  // In production on Vercel, FastAPI runs on same domain - use empty base URL
  if (!envUrl && process.env.VERCEL) {
    return ''
  }

  // Local development fallback
  if (!envUrl) {
    return 'http://localhost:8000'
  }

  let url = envUrl.trim()

  // Convert WebSocket URLs to HTTP
  if (url.startsWith('ws://')) {
    url = `http://${url.slice(5)}`
  } else if (url.startsWith('wss://')) {
    url = `https://${url.slice(6)}`
  }

  // Add scheme if missing
  if (!/^https?:\/\//.test(url)) {
    url = `http://${url}`
  }

  // Strip /ws path if present
  url = url.replace(/\/ws\/?$/, '')

  return url.replace(/\/$/, '')
}

const FASTAPI_URL = getFastApiUrl()

export async function POST(request: NextRequest) {
  try {
    const body: ProcessTextRequest = await request.json()

    if (!body.text || body.text.trim().length < 3) {
      return NextResponse.json(
        { error: 'Text is too short' },
        { status: 400 }
      )
    }

    const response = await fetch(`${FASTAPI_URL}/process_text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: body.text }),
    })

    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({}))
      const errorMessage = (errPayload.detail as string) || `FastAPI error: ${response.status} ${response.statusText}`
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process text' },
      { status: 500 }
    )
  }
}
