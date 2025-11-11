/**
 * Deepgram Client using Official SDK
 * Real-time audio transcription with WebSocket
 */

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk"

interface DeepgramConfig {
  apiKey: string
  model?: string
  language?: string
  punctuate?: boolean
  interim_results?: boolean
}

interface TranscriptResult {
  text: string
  is_final: boolean
}

export class DeepgramClient {
  private client: any
  private connection: any
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private onTranscriptCallback: ((result: TranscriptResult) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null
  private onConnectionCallback: ((status: 'connecting' | 'connected' | 'disconnected') => void) | null = null

  constructor(private config: DeepgramConfig) {
    // Initialize Deepgram client
    this.client = createClient(config.apiKey)
  }

  /**
   * Start recording and transcription
   */
  async start(): Promise<void> {
    try {
      this.onConnectionCallback?.('connecting')

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      // Create live transcription connection
      this.connection = this.client.listen.live({
        model: this.config.model || 'nova-2',
        language: this.config.language || 'en-US',
        punctuate: this.config.punctuate ?? true,
        interim_results: this.config.interim_results ?? true,
        smart_format: true,
      })

      // Wait for connection to open before starting MediaRecorder
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'))
        }, 10000) // 10 second timeout

        // Set up event listeners
        this.connection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout)
          console.log('✅ Deepgram connection opened')
          this.onConnectionCallback?.('connected')
          resolve()
        })

        this.connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('🔌 Deepgram connection closed')
          this.onConnectionCallback?.('disconnected')
        })

        this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript
          const isFinal = data.is_final

          if (transcript && transcript.trim()) {
            this.onTranscriptCallback?.({
              text: transcript,
              is_final: isFinal,
            })
          }
        })

        this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
          clearTimeout(timeout)
          console.error('❌ Deepgram error:', error)
          this.onErrorCallback?.(new Error(error.message || 'Deepgram error'))
          reject(error)
        })
      })

      // Now that connection is open, set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      this.mediaRecorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0 && this.connection.getReadyState() === 1) {
          this.connection.send(event.data)
        }
      })

      this.mediaRecorder.start(250) // Send data every 250ms

      console.log('🎤 Recording started')
    } catch (error) {
      console.error('Failed to start Deepgram:', error)
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  /**
   * Stop recording and close connection
   */
  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
    }

    if (this.connection) {
      this.connection.finish()
    }

    if (this.audioContext) {
      this.audioContext.close()
    }

    this.onConnectionCallback?.('disconnected')
    console.log('⏹️  Recording stopped')
  }

  /**
   * Set transcript callback
   */
  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.onTranscriptCallback = callback
  }

  /**
   * Set error callback
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  /**
   * Set connection status callback
   */
  onConnectionChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.onConnectionCallback = callback
  }
}
