"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { ControlPanel } from "@/components/control-panel"
import { TranscriptDisplay } from "@/components/transcript-display"
import { KeywordsDisplay } from "@/components/keywords-display"
import { Controls } from "@/components/controls"
import { AlertCircle } from "lucide-react"
import { DeepgramClient } from "@/lib/deepgram"
import type { ParameterMapping } from "@/lib/api"
import type { SimulationParams, FlowPattern } from "@/lib/types"
import { keywordsStore } from "@/lib/keywords-store"
import { useParameterAnimation } from "@/hooks/useParameterAnimation"
import { useTranscriptHandler } from "@/hooks/useTranscriptHandler"
import { useDeepgramConnection } from "@/hooks/useDeepgramConnection"
import { useKeywordManagement } from "@/hooks/useKeywordManagement"

// Dynamically import Three.js components with no SSR
const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => mod.Canvas), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
})
const PerlinNoiseParticles = dynamic(() => import("@/components/perlin-noise-particles").then((mod) => mod.PerlinNoiseParticles), {
  ssr: false
})

interface KeywordWithTimestamp {
  keyword: string
  timestamp: number
}

// Toggle between mock and real mode
const USE_REAL_APIS = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ? true : false

export default function VisualRecordPage() {
  // Simulation params for Perlin Noise Particles
  const [params, setParams] = useState<SimulationParams>({
    particleCount: 2000,
    particleSize: 0.02,
    brightness: 0.8,
    speed: 0.4,
    timeScale: 0.3,
    transitionSpeed: 0.75,
    pulse: 0.75,
    noiseScale: 0.5,
    noiseStrength: 0.5,
    flowDensity: 0.4,
    turbulence: 0.15,
    primaryColor: "#00ffff",
    secondaryColor: "#ff00ff",
    backgroundColor: "#0a0a0a",
    showVectorField: false,
    opacity: 0.8,
    flowPattern: "free",
    clarity: 0.5,
    intensity: 0.5,
    density: 0.5,
    stability: 0.5,
    coherence: 0.5,
    weight: 0.5,
    sharpness: 0.5,
    pulsing: 0.75,
  })

  const [isRecording, setIsRecording] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [parameterDescription, setParameterDescription] = useState<string>('')
  const [transcript, setTranscript] = useState<string[]>([])
  const [keywordsWithTimestamp, setKeywordsWithTimestamp] = useState<KeywordWithTimestamp[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [sentiment, setSentiment] = useState(0.5)
  const [sentimentType, setSentimentType] = useState<"positive" | "negative" | "neutral">("neutral")
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected")

  const deepgramClientRef = useRef<DeepgramClient | null>(null)
  const processingQueueRef = useRef<Set<string>>(new Set())
  const destroyedRef = useRef(false)
  const paramsRef = useRef<SimulationParams>(params)

  // Animation refs
  const pulseTimeRef = useRef(0)
  const clarityBaseRef = useRef(0.5)
  const intensityBaseRef = useRef(0.5)
  const coherenceBaseRef = useRef(0.5)
  const pulsingAmplitudeRef = useRef(0.75)

  const currentPrimaryColorRef = useRef("#00ffff")
  const currentSecondaryColorRef = useRef("#ff00ff")
  const targetPrimaryColorRef = useRef("#00ffff")
  const targetSecondaryColorRef = useRef("#ff00ff")
  const colorTransitionProgressRef = useRef(1.0)

  const currentParticleCountRef = useRef(2000)
  const targetParticleCountRef = useRef(2000)
  const currentParticleSizeRef = useRef(0.02)
  const targetParticleSizeRef = useRef(0.02)
  const particleTransitionProgressRef = useRef(1.0)

  // Numeric parameter transition refs - each ref defined separately for stability
  const brightnessCurrentRef = useRef(0.8)
  const brightnessTargetRef = useRef(0.8)
  const speedCurrentRef = useRef(0.4)
  const speedTargetRef = useRef(0.4)
  const timeScaleCurrentRef = useRef(0.3)
  const timeScaleTargetRef = useRef(0.3)
  const pulseCurrentRef = useRef(0.75)
  const pulseTargetRef = useRef(0.75)
  const noiseScaleCurrentRef = useRef(0.5)
  const noiseScaleTargetRef = useRef(0.5)
  const noiseStrengthCurrentRef = useRef(0.5)
  const noiseStrengthTargetRef = useRef(0.5)
  const flowDensityCurrentRef = useRef(0.4)
  const flowDensityTargetRef = useRef(0.4)
  const turbulenceCurrentRef = useRef(0.15)
  const turbulenceTargetRef = useRef(0.15)
  const opacityCurrentRef = useRef(0.8)
  const opacityTargetRef = useRef(0.8)
  
  const numericParams = useMemo(() => ({
    brightness: { current: brightnessCurrentRef, target: brightnessTargetRef },
    speed: { current: speedCurrentRef, target: speedTargetRef },
    timeScale: { current: timeScaleCurrentRef, target: timeScaleTargetRef },
    pulse: { current: pulseCurrentRef, target: pulseTargetRef },
    noiseScale: { current: noiseScaleCurrentRef, target: noiseScaleTargetRef },
    noiseStrength: { current: noiseStrengthCurrentRef, target: noiseStrengthTargetRef },
    flowDensity: { current: flowDensityCurrentRef, target: flowDensityTargetRef },
    turbulence: { current: turbulenceCurrentRef, target: turbulenceTargetRef },
    opacity: { current: opacityCurrentRef, target: opacityTargetRef },
  }), [])
  const numericTransitionProgressRef = useRef(1.0)
  const transitionDurationRef = useRef(0.75)

  const applyParameterMapping = useCallback((mapping: ParameterMapping) => {
    const currentParams = paramsRef.current

    clarityBaseRef.current = mapping.clarity ?? 0.7
    intensityBaseRef.current = mapping.intensity ?? 0.6
    coherenceBaseRef.current = mapping.coherence ?? 0.7
    pulsingAmplitudeRef.current = mapping.pulse ?? mapping.pulsing ?? 0.75

    if (mapping.primaryColor !== targetPrimaryColorRef.current ||
        mapping.secondaryColor !== targetSecondaryColorRef.current) {
      currentPrimaryColorRef.current = currentParams.primaryColor
      currentSecondaryColorRef.current = currentParams.secondaryColor
      targetPrimaryColorRef.current = mapping.primaryColor
      targetSecondaryColorRef.current = mapping.secondaryColor
      colorTransitionProgressRef.current = 0.0
    }

    if (mapping.particleCount !== targetParticleCountRef.current ||
        Math.abs(mapping.particleSize - targetParticleSizeRef.current) > 0.001) {
      currentParticleCountRef.current = currentParams.particleCount
      currentParticleSizeRef.current = currentParams.particleSize
      targetParticleCountRef.current = mapping.particleCount
      targetParticleSizeRef.current = mapping.particleSize
      particleTransitionProgressRef.current = 0.0
    }

    // Set up numeric parameter transitions
    numericParams.brightness.current.current = currentParams.brightness
    numericParams.brightness.target.current = mapping.brightness
    numericParams.speed.current.current = currentParams.speed
    numericParams.speed.target.current = mapping.speed
    numericParams.timeScale.current.current = currentParams.timeScale
    numericParams.timeScale.target.current = mapping.timeScale
    numericParams.pulse.current.current = currentParams.pulse
    numericParams.pulse.target.current = mapping.pulse
    numericParams.noiseScale.current.current = currentParams.noiseScale
    numericParams.noiseScale.target.current = mapping.noiseScale
    numericParams.noiseStrength.current.current = currentParams.noiseStrength
    numericParams.noiseStrength.target.current = mapping.noiseStrength
    numericParams.flowDensity.current.current = currentParams.flowDensity
    numericParams.flowDensity.target.current = mapping.flowDensity
    numericParams.turbulence.current.current = currentParams.turbulence
    numericParams.turbulence.target.current = mapping.turbulence
    numericParams.opacity.current.current = currentParams.opacity ?? 0.8
    numericParams.opacity.target.current = mapping.opacity ?? 0.8
    
    // Set transition duration and trigger transition
    transitionDurationRef.current = mapping.transitionSpeed
    numericTransitionProgressRef.current = 0.0
    console.log('[applyParameterMapping] Triggered numeric transition, duration:', mapping.transitionSpeed)

    // Only set non-transitioning params immediately
    setParams(prev => {
      const updated = {
        ...prev,
        transitionSpeed: mapping.transitionSpeed,
        flowPattern: mapping.flowPattern as FlowPattern,
        stability: mapping.stability ?? prev.stability,
        sharpness: mapping.sharpness ?? prev.sharpness,
        quantity: mapping.quantity ?? prev.quantity,
        pulsing: mapping.pulsing ?? mapping.pulse ?? prev.pulsing,
      }
      paramsRef.current = updated
      return updated
    })

    // Colors will be transitioned by useParameterAnimation - don't set immediately

    const pulsingValue = mapping.pulse ?? mapping.pulsing ?? 0.75
    const pulsingLevel = pulsingValue < 0.3 ? 'minimal' : pulsingValue < 0.6 ? 'moderate' : 'strong'
    const description = `Speed: ${mapping.speed.toFixed(1)} | Pulsing: ${pulsingLevel} (${(pulsingValue * 100).toFixed(0)}%) | Turbulence: ${mapping.turbulence.toFixed(2)} | NoiseStrength: ${mapping.noiseStrength.toFixed(2)} | Pattern: ${mapping.flowPattern ?? 'free'} | Colors: ${mapping.primaryColor} → ${mapping.secondaryColor}`
    setParameterDescription(description)

    console.log('[OK] Applied backend parameters:', mapping)
  }, [])

  // Custom hooks
  useParameterAnimation(setParams, {
    pulseTimeRef,
    clarityBaseRef,
    intensityBaseRef,
    coherenceBaseRef,
    pulsingAmplitudeRef,
    currentPrimaryColorRef,
    currentSecondaryColorRef,
    targetPrimaryColorRef,
    targetSecondaryColorRef,
    colorTransitionProgressRef,
    currentParticleCountRef,
    targetParticleCountRef,
    currentParticleSizeRef,
    targetParticleSizeRef,
    particleTransitionProgressRef,
    numericParams,
    numericTransitionProgressRef,
    transitionDurationRef,
  })

  const { handleTranscript, cleanup: cleanupTranscriptHandler } = useTranscriptHandler({
    setTranscript,
    setIsProcessing,
    setError,
    setSentiment,
    setSentimentType,
    setKeywordsWithTimestamp,
    setKeywords,
    applyParameterMapping,
    processingQueueRef,
  })

  const { startDeepgramClient, stopDeepgramClient } = useDeepgramConnection({
    setConnectionStatus,
    setError,
    onTranscript: handleTranscript,
    onError: (err) => {
      console.error('[ERROR] Deepgram error:', err)
    },
  })

  useKeywordManagement({
    isSimulating,
    setKeywordsWithTimestamp,
    setKeywords,
  })

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Master cleanup on unmount
  useEffect(() => {
    return () => {
      destroyedRef.current = true
      console.log('[CLEANUP] Visual Record page unmounting - cleaning up all resources')

      if (deepgramClientRef.current) {
        try {
          deepgramClientRef.current.stop()
        } catch (e) {
          console.error('Error stopping Deepgram:', e)
        }
        deepgramClientRef.current = null
      }

      cleanupTranscriptHandler()
      processingQueueRef.current.clear()

      console.log('[OK] All resources cleaned up')
    }
  }, [cleanupTranscriptHandler])

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const startRealTranscription = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY) {
      setError('Deepgram API key not configured')
      setConnectionStatus('error')
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)

      await startDeepgramClient(deepgramClientRef)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      setConnectionStatus('error')
    }
  }, [startDeepgramClient])

  const simulateTranscription = useCallback(() => {
    setConnectionStatus("connecting")
    setError(null)

    setTimeout(() => {
      setConnectionStatus("connected")
    }, 500)

    const mockPhrases = [
      "I'm experiencing a profound sense of euphoria right now",
      "There's a gentle melancholy washing over me",
      "The serenity of this moment feels almost tangible",
      "I sense an underlying anxiety building within",
      "This brings me such deep joy and contentment",
    ]

    const mockKeywordSets = [
      ["ecstatic", "joyful", "radiant"],
      ["melancholy", "wistful", "somber"],
      ["serene", "peaceful", "tranquil"],
      ["anxious", "tense", "uneasy"],
      ["joyful", "blissful", "cheerful"],
    ]

    let phraseIndex = 0
    let keywordSetIndex = 0

    const transcriptInterval = setInterval(() => {
      if (!isRecording) {
        clearInterval(transcriptInterval)
        setConnectionStatus("disconnected")
        return
      }

      setIsProcessing(true)

      if (Math.random() < 0.05) {
        setError("Temporary processing delay detected")
        setTimeout(() => setError(null), 3000)
      }

      setTranscript((prev) => [...prev, mockPhrases[phraseIndex % mockPhrases.length]])
      phraseIndex++

      const sentimentVariation = Math.random()
      let newSentiment: number
      let newSentimentType: "positive" | "negative" | "neutral"

      if (sentimentVariation < 0.4) {
        newSentiment = 0.6 + Math.random() * 0.4
        newSentimentType = "positive"
      } else if (sentimentVariation < 0.7) {
        newSentiment = 0.2 + Math.random() * 0.3
        newSentimentType = "negative"
      } else {
        newSentiment = 0.4 + Math.random() * 0.3
        newSentimentType = "neutral"
      }

      setSentiment(newSentiment)
      setSentimentType(newSentimentType)

      if (phraseIndex % 2 === 0) {
        const newKeywords = mockKeywordSets[keywordSetIndex % mockKeywordSets.length]

        if (newKeywords.length > 0) {
          keywordsStore.addKeywords(newKeywords)

          const now = Date.now()
          const newKeywordsWithTimestamp = newKeywords.map((kw: string) => ({
            keyword: kw,
            timestamp: now
          }))
          setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
          setKeywords(prev => [...prev, ...newKeywords])
        }
        keywordSetIndex++
      }

      setTimeout(() => setIsProcessing(false), 300)
    }, 2500)

    return () => {
      clearInterval(transcriptInterval)
      setConnectionStatus("disconnected")
      setIsProcessing(false)
    }
  }, [isRecording])

  // Effect for starting/stopping recording - only depends on isRecording
  useEffect(() => {
    if (!isRecording) {
      return
    }
    
    if (USE_REAL_APIS) {
      startRealTranscription()
      return () => {
        stopDeepgramClient(deepgramClientRef)
        cleanupTranscriptHandler()
        processingQueueRef.current.clear()
      }
    } else {
      const cleanup = simulateTranscription()
      return cleanup
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      if (USE_REAL_APIS) {
        stopDeepgramClient(deepgramClientRef)
        cleanupTranscriptHandler()
      }
      setIsRecording(false)
      setConnectionStatus("disconnected")
      setError(null)
    } else {
      setTranscript([])
      setKeywords([])
      setKeywordsWithTimestamp([])
      keywordsStore.clear()
      setSentiment(0.5)
      setSentimentType("neutral")
      setError(null)
      processingQueueRef.current.clear()

      try {
        setIsRecording(true)
      } catch (err) {
        setError("Failed to start recording. Please check microphone permissions.")
        setConnectionStatus("error")
      }
    }
  }, [isRecording, stopDeepgramClient, cleanupTranscriptHandler])

  return (
    <div className="relative w-full min-h-screen overflow-y-auto">
      {/* Three.js Background */}
      <div className="fixed inset-x-0 top-20 bottom-0 -z-10">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} style={{ background: params.backgroundColor }}>
          <PerlinNoiseParticles params={params} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none pt-20">
        <div className="container mx-auto h-full flex flex-col p-6 gap-6 pointer-events-none">
          {/* Header */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-white/90">Visual Sentiment Recording</h1>
              {!USE_REAL_APIS && (
                <span className="text-xs px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-300">
                  MOCK MODE
                </span>
              )}
              {connectionStatus === "connected" && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Connected
                </span>
              )}
              {connectionStatus === "connecting" && (
                <span className="text-xs text-yellow-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  Connecting...
                </span>
              )}
              {isProcessing && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Processing...
                </span>
              )}
            </div>
            <Controls isRecording={isRecording} onToggle={handleStartStop} />
          </div>
          {/* Error Banner */}
          {error && (
            <div className="pointer-events-auto animate-in slide-in-from-top-5 duration-300">
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex justify-between gap-6 pointer-events-auto max-h-[600px]">
            <div className="w-full max-w-md h-full">
              <TranscriptDisplay
                transcript={transcript}
                isRecording={isRecording}
                className="w-full h-[40vh]"
              />
            </div>

            <div className="w-full max-w-md h-full">
              <KeywordsDisplay keywords={keywords} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
