/**
 * WebSocket client for FastAPI backend streaming
 */

export interface StreamToken {
  type: 'token'
  content: string
}

export interface StreamResult {
  type: 'result'
  data: {
    sentiment: number
    sentiment_type: 'positive' | 'negative' | 'neutral'
    keywords: string[]
    confidence: number
  }
}

export interface StreamError {
  type: 'error'
  message: string
}

export interface StreamProcessing {
  type: 'processing'
  message: string
}

export type StreamMessage = StreamToken | StreamResult | StreamError | StreamProcessing

export class BackendWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private onMessageCallback: ((message: StreamMessage) => void) | null = null
  private onConnectionCallback: ((status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) | null = null
  private pingInterval: NodeJS.Timeout | null = null

  constructor(private url: string = 'ws://localhost:8000/ws') {}

  /**
   * Connect to FastAPI WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onConnectionCallback?.('connecting')

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('✅ Connected to backend WebSocket')
          this.onConnectionCallback?.('connected')
          this.reconnectAttempts = 0
          
          // Start ping interval to keep connection alive
          this.pingInterval = setInterval(() => {
            this.send({ type: 'ping' })
          }, 30000) // Ping every 30s
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as StreamMessage
            this.onMessageCallback?.(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ Backend WebSocket error:', error)
          this.onConnectionCallback?.('error')
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 Backend WebSocket closed')
          this.onConnectionCallback?.('disconnected')
          
          if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
          }

          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)
            setTimeout(() => this.connect(), delay)
          }
        }
      } catch (error) {
        this.onConnectionCallback?.('error')
        reject(error)
      }
    })
  }

  /**
   * Send transcript to backend for processing
   */
  sendTranscript(text: string): void {
    this.send({
      type: 'transcript',
      text,
    })
  }

  /**
   * Send data to backend
   */
  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, cannot send:', data)
    }
  }

  /**
   * Set message callback
   */
  onMessage(callback: (message: StreamMessage) => void): void {
    this.onMessageCallback = callback
  }

  /**
   * Set connection status callback
   */
  onConnectionChange(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): void {
    this.onConnectionCallback = callback
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
