import { NextResponse } from 'next/server'

export async function GET() {
  const provider = process.env.LLM_PROVIDER || 'openai'
  
  return NextResponse.json({
    status: 'healthy',
    provider,
    api_keys_configured: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      deepgram: !!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
    },
    timestamp: new Date().toISOString(),
  })
}
