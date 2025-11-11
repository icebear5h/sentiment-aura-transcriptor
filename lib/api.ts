/**
 * API Client for Next.js API routes
 */

export interface SentimentResponse {
  sentiment: number // 0-1
  sentiment_type: 'positive' | 'negative' | 'neutral'
  keywords: string[]
  confidence: number
}

/**
 * Process text and get sentiment analysis
 */
export async function processText(text: string): Promise<SentimentResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const response = await fetch('/api/process-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data as SentimentResponse
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - API took too long to respond')
      }
      throw error
    }
    throw new Error('Unknown error processing text')
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
