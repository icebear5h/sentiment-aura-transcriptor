import { useCallback, useRef, Dispatch, SetStateAction } from 'react'
import { DeepgramClient } from '@/lib/deepgram'

interface DeepgramConnectionOptions {
  setConnectionStatus: Dispatch<SetStateAction<"disconnected" | "connecting" | "connected" | "error">>
  setError: Dispatch<SetStateAction<string | null>>
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: Error) => void
}

/**
 * Manages Deepgram client connection and lifecycle
 */
export function useDeepgramConnection(options: DeepgramConnectionOptions) {
  const { setConnectionStatus, setError, onTranscript, onError } = options
  
  // Track if we're currently connecting to prevent duplicate connections
  const isConnectingRef = useRef(false)
  // Store callbacks in refs to avoid dependency issues
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)
  
  // Keep refs up to date
  onTranscriptRef.current = onTranscript
  onErrorRef.current = onError

  const startDeepgramClient = useCallback(async (deepgramClientRef: React.MutableRefObject<DeepgramClient | null>) => {
    // Prevent duplicate connections
    if (isConnectingRef.current) {
      console.log('[WARN] Already connecting to Deepgram, skipping duplicate request')
      return
    }
    
    // Stop any existing connection first
    if (deepgramClientRef.current) {
      console.log('[INFO] Stopping existing Deepgram connection before starting new one')
      deepgramClientRef.current.stop()
      deepgramClientRef.current = null
    }
    
    if (!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY) {
      setError('Deepgram API key not configured')
      setConnectionStatus('error')
      return
    }

    isConnectingRef.current = true

    try {
      const client = new DeepgramClient({
        apiKey: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        interim_results: true,
      })

      deepgramClientRef.current = client

      client.onConnectionChange((status) => {
        setConnectionStatus(status)
      })

      client.onTranscript(async (transcript) => {
        onTranscriptRef.current(transcript.text, transcript.is_final)
      })

      client.onError((err) => {
        setError(err.message)
        setConnectionStatus('error')
        setTimeout(() => setError(null), 5000)
        onErrorRef.current(err)
      })

      await client.start()
    } finally {
      isConnectingRef.current = false
    }
  }, [setConnectionStatus, setError])

  const stopDeepgramClient = useCallback((deepgramClientRef: React.MutableRefObject<DeepgramClient | null>) => {
    isConnectingRef.current = false
    if (deepgramClientRef.current) {
      console.log('[INFO] Stopping Deepgram connection')
      deepgramClientRef.current.stop()
      deepgramClientRef.current = null
    }
  }, [])

  return { startDeepgramClient, stopDeepgramClient }
}
