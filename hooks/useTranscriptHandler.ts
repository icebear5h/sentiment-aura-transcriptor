import { useRef, useCallback, Dispatch, SetStateAction } from 'react'
import { processText, withRetry } from '@/lib/api'
import type { ParameterMapping } from '@/lib/api'
import { keywordsStore } from '@/lib/keywords-store'

interface KeywordWithTimestamp {
  keyword: string
  timestamp: number
}

interface TranscriptHandlerOptions {
  setTranscript: Dispatch<SetStateAction<string[]>>
  setIsProcessing: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setSentiment: Dispatch<SetStateAction<number>>
  setSentimentType: Dispatch<SetStateAction<"positive" | "negative" | "neutral">>
  setKeywordsWithTimestamp: Dispatch<SetStateAction<KeywordWithTimestamp[]>>
  setKeywords: Dispatch<SetStateAction<string[]>>
  applyParameterMapping: (mapping: ParameterMapping) => void
  processingQueueRef: React.MutableRefObject<Set<string>>
}

/**
 * Handles transcript processing - POSTs to backend on each is_final: true
 */
export function useTranscriptHandler(options: TranscriptHandlerOptions) {
  const {
    setTranscript,
    setIsProcessing,
    setError,
    setSentiment,
    setSentimentType,
    setKeywordsWithTimestamp,
    setKeywords,
    applyParameterMapping,
    processingQueueRef,
  } = options

  const handleTranscript = useCallback(async (transcriptText: string, isFinal: boolean) => {
    // Step 5: Only process when is_final: true
    if (!isFinal) {
      return
    }

    const trimmedText = transcriptText.trim()
    if (!trimmedText || trimmedText.length < 3) {
      return
    }

    // Step 4: Immediately display in TranscriptDisplay
    setTranscript((prev) => [...prev, trimmedText])

    // Prevent duplicate processing of same text
    if (processingQueueRef.current.has(trimmedText)) {
      return
    }
    processingQueueRef.current.add(trimmedText)

    // Step 5: POST to /process_text immediately
    setIsProcessing(true)

    try {
      const result = await withRetry(() => processText(trimmedText), 2, 500)
      
      // Step 9: Update state from response
      setSentiment(result.sentiment)
      setSentimentType(result.sentiment_type)

      const keywordsArray = Array.isArray(result.keywords) ? result.keywords : []

      if (keywordsArray.length > 0) {
        keywordsStore.addKeywords(keywordsArray)

        const now = Date.now()
        const newKeywordsWithTimestamp = keywordsArray.map((kw: string) => ({
          keyword: kw,
          timestamp: now
        }))
        setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
        setKeywords(prev => [...prev, ...keywordsArray])
      }

      if (result.parameters) {
        applyParameterMapping(result.parameters)
      }

      setIsProcessing(false)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process text'
      setError(`Processing error: ${errorMessage}`)
      setTimeout(() => setError(null), 5000)
      setIsProcessing(false)
    } finally {
      processingQueueRef.current.delete(trimmedText)
    }
  }, [
    setTranscript,
    setIsProcessing,
    setError,
    setSentiment,
    setSentimentType,
    setKeywordsWithTimestamp,
    setKeywords,
    applyParameterMapping,
    processingQueueRef,
  ])

  const cleanup = useCallback(() => {
    // No throttle timer to clean up anymore
  }, [])

  return { handleTranscript, cleanup }
}
