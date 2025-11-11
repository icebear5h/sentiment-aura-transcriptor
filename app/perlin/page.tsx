"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { ControlPanel } from "@/components/control-panel"
import { TranscriptDisplay } from "@/components/transcript-display"
import { KeywordsDisplay } from "@/components/keywords-display"
import { Controls } from "@/components/controls"
import { AlertCircle } from "lucide-react"
import { DeepgramClient } from "@/lib/deepgram"
import { processText, withRetry } from "@/lib/api"
import { BackendWebSocket, type StreamMessage } from "@/lib/backend-ws"
import { translateKeywordsToParametersWithRetry } from "@/lib/groq-client"
import type { SimulationParams, FlowPattern } from "@/lib/types"

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

const KEYWORD_DECAY_TIME = 50000 // 50 seconds

// Toggle between mock and real mode
const USE_REAL_APIS = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ? true : false
const USE_FASTAPI_BACKEND = process.env.NEXT_PUBLIC_USE_FASTAPI === 'true'

export default function VisualRecordPage() {
  // Simulation params for Perlin Noise Particles
  const [params, setParams] = useState<SimulationParams>({
    // Direct simulation parameters
    particleCount: 2000,
    particleSize: 0.02,
    brightness: 0.8,
    speed: 0.4,
    timeScale: 0.3,
    transitionSpeed: 1.0,
    pulse: 0.75,
    noiseScale: 0.5,
    noiseStrength: 0.5,
    flowDensity: 0.4,
    turbulence: 0.15,
    primaryColor: "#00ffff",
    secondaryColor: "#ff00ff",
    backgroundColor: "#0a0a0a",
    showVectorField: false,
    
    // Legacy compatibility parameters
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
  const backendWsRef = useRef<BackendWebSocket | null>(null)
  const processingQueueRef = useRef<Set<string>>(new Set())
  const streamingContentRef = useRef<string>("")
  const backendThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const pendingTranscriptRef = useRef<string>("")
  const groqThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedKeywordCount = useRef<number>(0)
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pulseTimeRef = useRef(0)
  const clarityBaseRef = useRef(0.5)
  const intensityBaseRef = useRef(0.5)
  const coherenceBaseRef = useRef(0.5)
  const pulsingAmplitudeRef = useRef(0.75) // Controls pulsing intensity (0-1)
  
  // Color transition refs (initialize with starting state colors)
  const currentPrimaryColorRef = useRef("#00ffff")
  const currentSecondaryColorRef = useRef("#ff00ff")
  const targetPrimaryColorRef = useRef("#00ffff")
  const targetSecondaryColorRef = useRef("#ff00ff")
  const colorTransitionProgressRef = useRef(1.0) // 1.0 = transition complete
  const colorTransitionDuration = 4.0 // seconds

  // Particle count and size transition refs
  const currentParticleCountRef = useRef(2000)
  const targetParticleCountRef = useRef(2000)
  const currentParticleSizeRef = useRef(0.02)
  const targetParticleSizeRef = useRef(0.02)
  const particleTransitionProgressRef = useRef(1.0)
  const particleTransitionDuration = 3.0 // seconds

  // Helper function to interpolate between two hex colors
  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const c1 = parseInt(color1.substring(1), 16)
    const c2 = parseInt(color2.substring(1), 16)
    
    const r1 = (c1 >> 16) & 0xff
    const g1 = (c1 >> 8) & 0xff
    const b1 = c1 & 0xff
    
    const r2 = (c2 >> 16) & 0xff
    const g2 = (c2 >> 8) & 0xff
    const b2 = c2 & 0xff
    
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }

  // Helper function to interpolate between two numbers
  const interpolateNumber = (start: number, end: number, t: number): number => {
    return start + (end - start) * t
  }

  // Pulsing effect for turbulence, noise strength, clarity, and color transitions
  useEffect(() => {
    let frameCount = 0
    const animate = () => {
      pulseTimeRef.current += 0.016 // ~60fps
      frameCount++
      
      // Get pulsing amplitude (0-1 controls oscillation strength)
      const pulsingAmp = pulsingAmplitudeRef.current
      
      // Handle color transitions
      if (colorTransitionProgressRef.current < 1.0) {
        colorTransitionProgressRef.current = Math.min(1.0, colorTransitionProgressRef.current + 0.016 / colorTransitionDuration)
        
        // Ease-in-out function for smooth transition
        const t = colorTransitionProgressRef.current
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        
        // Interpolate colors
        const interpolatedPrimary = interpolateColor(
          currentPrimaryColorRef.current,
          targetPrimaryColorRef.current,
          easedT
        )
        const interpolatedSecondary = interpolateColor(
          currentSecondaryColorRef.current,
          targetSecondaryColorRef.current,
          easedT
        )
        
        
        // Update params with interpolated colors
        setParams(prev => {
          // Only update if colors actually changed
          if (prev.primaryColor !== interpolatedPrimary || prev.secondaryColor !== interpolatedSecondary) {
            return {
              ...prev,
              primaryColor: interpolatedPrimary,
              secondaryColor: interpolatedSecondary
            }
          }
          return prev
        })
        
        // When transition completes, lock in the target colors
        if (colorTransitionProgressRef.current >= 1.0) {
          currentPrimaryColorRef.current = targetPrimaryColorRef.current
          currentSecondaryColorRef.current = targetSecondaryColorRef.current
          console.log('🎨 Color transition complete:', {
            primary: currentPrimaryColorRef.current,
            secondary: currentSecondaryColorRef.current
          })
        }
      }
      
      // Handle particle count and size transitions
      if (particleTransitionProgressRef.current < 1.0) {
        particleTransitionProgressRef.current = Math.min(1.0, particleTransitionProgressRef.current + 0.016 / particleTransitionDuration)
        
        // Ease-in-out function for smooth transition
        const t = particleTransitionProgressRef.current
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        
        // Interpolate particle count and size
        const interpolatedCount = Math.round(interpolateNumber(
          currentParticleCountRef.current,
          targetParticleCountRef.current,
          easedT
        ))
        const interpolatedSize = interpolateNumber(
          currentParticleSizeRef.current,
          targetParticleSizeRef.current,
          easedT
        )
        
        // Update params with interpolated values
        setParams(prev => {
          // Only update if values actually changed
          if (prev.particleCount !== interpolatedCount || Math.abs(prev.particleSize - interpolatedSize) > 0.001) {
            return {
              ...prev,
              particleCount: interpolatedCount,
              particleSize: interpolatedSize
            }
          }
          return prev
        })
        
        // When transition completes, lock in the target values
        if (particleTransitionProgressRef.current >= 1.0) {
          currentParticleCountRef.current = targetParticleCountRef.current
          currentParticleSizeRef.current = targetParticleSizeRef.current
          console.log('🔢 Particle transition complete:', {
            count: currentParticleCountRef.current,
            size: currentParticleSizeRef.current
          })
        }
      }
      
      // Debug log every 5 seconds (300 frames at 60fps)
      if (frameCount % 300 === 0) {
        console.log('🌊 Animation state:', {
          pulsingAmplitude: pulsingAmp,
          clarityBase: clarityBaseRef.current,
          intensityBase: intensityBaseRef.current,
          coherenceBase: coherenceBaseRef.current,
          colorTransitionProgress: colorTransitionProgressRef.current.toFixed(2),
          currentColors: [currentPrimaryColorRef.current, currentSecondaryColorRef.current],
          targetColors: [targetPrimaryColorRef.current, targetSecondaryColorRef.current],
          isColorTransitioning: colorTransitionProgressRef.current < 1.0,
          particleTransitionProgress: particleTransitionProgressRef.current.toFixed(2),
          currentParticleCount: currentParticleCountRef.current,
          targetParticleCount: targetParticleCountRef.current,
          currentParticleSize: currentParticleSizeRef.current.toFixed(4),
          targetParticleSize: targetParticleSizeRef.current.toFixed(4),
          isParticleTransitioning: particleTransitionProgressRef.current < 1.0
        })
      }
      
      // Pulse qualitative parameters (matching three-fiber-playground approach)
      // Let perlin-noise-particles.tsx handle mapping to technical parameters
      
      // Clarity pulsing - 0.25-0.75 sine wave, blended with base
      const clarityPulse = Math.sin(pulseTimeRef.current * 2.0) * 0.25 + 0.5
      const clarityValue = clarityBaseRef.current * 0.5 + clarityPulse * 0.5
      
      // Intensity pulsing - subtle variation around
      
      
      setParams((prev) => ({
        ...prev,
        clarity: clarityValue,
      }))
      
      requestAnimationFrame(animate)
    }
    
    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  // Simulation keyword pools organized by emotion - Rich variety for testing
  const emotionKeywordPools = {
    // Calm & Peace
    calm: ['peaceful', 'serene', 'tranquil', 'gentle', 'soft', 'quiet', 'still', 'relaxed', 'calm', 'soothing', 'mellow', 'placid'],
    meditative: ['contemplative', 'reflective', 'mindful', 'centered', 'balanced', 'focused', 'present', 'aware', 'grounded'],
    
    // Energy & Excitement
    energetic: ['vibrant', 'dynamic', 'energetic', 'lively', 'spirited', 'electric', 'intense', 'powerful', 'active', 'vigorous'],
    excited: ['thrilled', 'exhilarated', 'animated', 'enthusiastic', 'eager', 'zealous', 'pumped', 'hyped', 'stimulated'],
    euphoric: ['euphoric', 'ecstatic', 'elated', 'rapturous', 'overjoyed', 'exultant', 'jubilant', 'triumphant', 'blissful'],
    
    // Chaos & Disorder
    chaotic: ['turbulent', 'chaotic', 'frantic', 'wild', 'unstable', 'erratic', 'volatile', 'scattered', 'hectic', 'confused', 'disoriented'],
    frantic: ['frenzied', 'manic', 'feverish', 'desperate', 'panicked', 'rushed', 'harried', 'agitated', 'flustered'],
    
    // Joy & Happiness
    happy: ['joyful', 'happy', 'cheerful', 'bright', 'radiant', 'delighted', 'blissful', 'uplifting', 'pleasant', 'gleeful'],
    playful: ['playful', 'whimsical', 'lighthearted', 'mischievous', 'spirited', 'fun', 'amusing', 'entertaining', 'jovial'],
    
    // Sadness & Melancholy
    sad: ['melancholy', 'somber', 'wistful', 'pensive', 'subdued', 'muted', 'sad', 'gloomy', 'heavy', 'sorrowful'],
    melancholic: ['melancholic', 'mournful', 'elegiac', 'plaintive', 'doleful', 'lugubrious', 'wistful', 'nostalgic', 'yearning'],
    despairing: ['despairing', 'hopeless', 'desolate', 'forlorn', 'dejected', 'disheartened', 'disconsolate', 'woeful'],
    
    // Anxiety & Fear
    anxious: ['anxious', 'tense', 'nervous', 'uneasy', 'restless', 'agitated', 'jittery', 'worried', 'uncertain', 'uncomfortable'],
    fearful: ['fearful', 'apprehensive', 'dreadful', 'terrified', 'alarmed', 'intimidated', 'timid', 'tremulous', 'scared'],
    
    // Anger & Aggression
    angry: ['angry', 'furious', 'irate', 'enraged', 'livid', 'incensed', 'wrathful', 'indignant', 'hostile', 'fierce'],
    irritated: ['irritated', 'annoyed', 'vexed', 'aggravated', 'exasperated', 'frustrated', 'perturbed', 'irked'],
    
    // Mystery & Wonder
    mysterious: ['mysterious', 'enigmatic', 'ethereal', 'cosmic', 'dreamy', 'surreal', 'otherworldly', 'mystical', 'strange', 'ambiguous'],
    awe: ['awestruck', 'amazed', 'wonderstruck', 'astonished', 'dazzled', 'stupefied', 'spellbound', 'entranced'],
    
    // Confidence & Strength
    confident: ['confident', 'certain', 'clear', 'assured', 'bold', 'strong', 'decisive', 'firm', 'resolute', 'determined'],
    powerful: ['powerful', 'mighty', 'formidable', 'commanding', 'authoritative', 'dominant', 'imposing', 'robust'],
    
    // Love & Warmth
    warm: ['warm', 'cozy', 'comfortable', 'inviting', 'tender', 'affectionate', 'loving', 'caring', 'nurturing', 'compassionate'],
    romantic: ['romantic', 'passionate', 'ardent', 'amorous', 'enamored', 'devoted', 'intimate', 'fervent', 'swooning'],
    
    // Cold & Distance
    cold: ['cold', 'distant', 'detached', 'aloof', 'remote', 'impersonal', 'frigid', 'icy', 'indifferent', 'withdrawn'],
    lonely: ['lonely', 'isolated', 'solitary', 'abandoned', 'forsaken', 'estranged', 'disconnected', 'alienated'],
    
    // Hope & Optimism
    hopeful: ['hopeful', 'optimistic', 'promising', 'encouraging', 'uplifting', 'inspiring', 'heartening', 'buoyant'],
    
    // Nostalgia & Memory
    nostalgic: ['nostalgic', 'wistful', 'reminiscent', 'sentimental', 'bittersweet', 'longing', 'remembering', 'evocative'],
    
    // Solemn & Serious
    solemn: ['solemn', 'grave', 'serious', 'austere', 'dignified', 'formal', 'ceremonial', 'reverent', 'somber'],
    
    // Curious & Inquisitive
    curious: ['curious', 'inquisitive', 'intrigued', 'fascinated', 'interested', 'exploring', 'wondering', 'questioning']
  }

  // Backend already extracts only emotional/qualia keywords
  // No filtering needed on frontend

  // Simulation mode - generates keywords periodically
  useEffect(() => {
    if (!isSimulating) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
      return
    }

    let emotionIndex = 0
    const emotions = Object.keys(emotionKeywordPools) as Array<keyof typeof emotionKeywordPools>
    
    // Add keywords every 20 seconds
    simulationIntervalRef.current = setInterval(() => {
      const currentEmotion = emotions[emotionIndex % emotions.length]
      const pool = emotionKeywordPools[currentEmotion]
      
      // Pick 2-4 random keywords from the pool
      const count = Math.floor(Math.random() * 3) + 2
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const selectedKeywords = shuffled.slice(0, count)
      
      const now = Date.now()
      const newKeywordsWithTimestamp = selectedKeywords.map((kw: string) => ({
        keyword: kw,
        timestamp: now
      }))
      
      console.log(`🎭 Simulation: Adding ${currentEmotion} keywords:`, selectedKeywords)
      console.log(`📊 Total keywords before add: ${keywords.length}, after will be: ${keywords.length + selectedKeywords.length}`)
      
      setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
      setKeywords(prev => {
        const updated = [...prev, ...selectedKeywords]
        console.log(`✅ Keywords state updated: ${updated.length} total keywords`)
        return updated
      })
      
      emotionIndex++
    }, 10000) // Generate new keywords every 10 seconds

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [isSimulating])

  // Keyword decay mechanism - removes keywords older than 50 seconds
  useEffect(() => {
    const decayInterval = setInterval(() => {
      const now = Date.now()
      setKeywordsWithTimestamp(prev => {
        const filtered = prev.filter(kw => now - kw.timestamp < KEYWORD_DECAY_TIME)
        if (filtered.length !== prev.length) {
          setKeywords(filtered.map(kw => kw.keyword))
        }
        return filtered
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(decayInterval)
  }, [])

  // CRITICAL: Master cleanup when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      console.log('🧹 Visual Record page unmounting - cleaning up all resources')
      
      // Stop recording if active
      if (deepgramClientRef.current) {
        try {
          deepgramClientRef.current.stop()
        } catch (e) {
          console.error('Error stopping Deepgram:', e)
        }
        deepgramClientRef.current = null
      }
      
      // Close backend WebSocket
      if (backendWsRef.current) {
        try {
          backendWsRef.current.close()
        } catch (e) {
          console.error('Error closing backend WS:', e)
        }
        backendWsRef.current = null
      }
      
      // Clear all timeouts and intervals
      if (backendThrottleRef.current) {
        clearTimeout(backendThrottleRef.current)
        backendThrottleRef.current = null
      }
      
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
        simulationIntervalRef.current = null
      }
      
      // Clear processing queue
      processingQueueRef.current.clear()
      
      console.log('✅ All resources cleaned up')
    }
  }, [])

  // Call Groq to translate keywords to parameters
  // Backend extracts emotional/qualia keywords → Send NEW keywords to Frontend Groq for parameter translation
  useEffect(() => {
    let isMounted = true // Track if component is still mounted
    
    console.log(`🔄 Keywords effect triggered. Total keywords: ${keywords.length}, Last processed: ${lastProcessedKeywordCount.current}`)
    
    if (keywords.length === 0) {
      lastProcessedKeywordCount.current = 0
      console.log('⏸️ No keywords, skipping processing')
      return
    }

    // Check if there are new keywords since last processing
    const newKeywordCount = keywords.length - lastProcessedKeywordCount.current
    console.log(`📈 New keyword count: ${newKeywordCount}`)
    
    if (newKeywordCount === 0) {
      console.log('⏸️ No new keywords since last processing')
      return // No new keywords
    }

    // Process immediately when new keywords arrive
    const processKeywords = async () => {
      // Get only the NEW keywords since last processing
      const newKeywords = keywords.slice(lastProcessedKeywordCount.current)
      const uniqueNewKeywords = Array.from(new Set(newKeywords))
      
      console.log(`📥 New keywords (${uniqueNewKeywords.length}):`, uniqueNewKeywords)
      
      if (uniqueNewKeywords.length < 1) {
        return // Need at least 1 new keyword to process
      }

      try {
        console.log('🤖 Translating NEW keywords to parameters:', uniqueNewKeywords)
        // Pass the full transcript as context for better understanding
        const fullTranscriptText = transcript.join(' ')
        const mapping = await translateKeywordsToParametersWithRetry(uniqueNewKeywords, fullTranscriptText)
        
        // Mark these keywords as processed ONLY AFTER successful Groq call
        lastProcessedKeywordCount.current = keywords.length
        
        // Check if component is still mounted before updating state
        if (!isMounted) {
          console.log('⚠️ Component unmounted, skipping state updates')
          return
        }
        
        // Groq response logging happens in groq-client.ts
        
        // Update base values for qualitative pulsing (matching three-fiber-playground approach)
        clarityBaseRef.current = mapping.clarity ?? 0.7
        intensityBaseRef.current = mapping.intensity ?? 0.6
        coherenceBaseRef.current = mapping.coherence ?? 0.7
        pulsingAmplitudeRef.current = mapping.pulse ?? mapping.pulsing ?? 0.75
        
        console.log('🌊 Qualitative pulsing updated:', {
          pulse: mapping.pulse,
          pulsing: mapping.pulsing,
          pulsingAmplitude: mapping.pulse ?? mapping.pulsing ?? 0.75,
          clarityBase: mapping.clarity,
          intensityBase: mapping.intensity,
          coherenceBase: mapping.coherence
        })
        
        // Trigger color transition
        console.log('🔍 Checking color change:', {
          newPrimary: mapping.primaryColor,
          targetPrimary: targetPrimaryColorRef.current,
          newSecondary: mapping.secondaryColor,
          targetSecondary: targetSecondaryColorRef.current,
          isDifferent: mapping.primaryColor !== targetPrimaryColorRef.current || 
                      mapping.secondaryColor !== targetSecondaryColorRef.current
        })
        
        if (mapping.primaryColor !== targetPrimaryColorRef.current || 
            mapping.secondaryColor !== targetSecondaryColorRef.current) {
          // Store current colors as starting point (from actual params state)
          currentPrimaryColorRef.current = params.primaryColor
          currentSecondaryColorRef.current = params.secondaryColor
          
          // Set new target colors
          targetPrimaryColorRef.current = mapping.primaryColor
          targetSecondaryColorRef.current = mapping.secondaryColor
          
          // Reset transition progress
          colorTransitionProgressRef.current = 0.0
          
          console.log('🎨 Starting color transition:', {
            from: [currentPrimaryColorRef.current, currentSecondaryColorRef.current],
            to: [targetPrimaryColorRef.current, targetSecondaryColorRef.current],
            duration: `${colorTransitionDuration}s`,
            progress: colorTransitionProgressRef.current
          })
        } else {
          console.log('⏭️ Colors unchanged, skipping transition')
        }
        
        // Trigger particle count and size transitions if changed
        if (mapping.particleCount !== targetParticleCountRef.current || 
            Math.abs(mapping.particleSize - targetParticleSizeRef.current) > 0.001) {
          // Store current values as starting point
          currentParticleCountRef.current = params.particleCount
          currentParticleSizeRef.current = params.particleSize
          
          // Set new target values
          targetParticleCountRef.current = mapping.particleCount
          targetParticleSizeRef.current = mapping.particleSize
          
          // Reset transition progress
          particleTransitionProgressRef.current = 0.0
          
          console.log('🔢 Starting particle transition:', {
            fromCount: currentParticleCountRef.current,
            toCount: targetParticleCountRef.current,
            fromSize: currentParticleSizeRef.current.toFixed(4),
            toSize: targetParticleSizeRef.current.toFixed(4),
            duration: `${particleTransitionDuration}s`,
            progress: particleTransitionProgressRef.current
          })
        } else {
          console.log('⏭️ Particles unchanged, skipping transition')
        }
        
        // Apply objective prompt parameters immediately
        // Note: clarity, intensity, coherence are handled by pulsing animation
        // Colors, particleCount, and particleSize are handled by animation loop transitions
        setParams(prev => ({
          ...prev,
          // Direct simulation parameters from objective prompt (excluding transitioned values)
          brightness: mapping.brightness,
          speed: mapping.speed,
          timeScale: mapping.timeScale,
          transitionSpeed: mapping.transitionSpeed,
          pulse: mapping.pulse,
          noiseScale: mapping.noiseScale,
          noiseStrength: mapping.noiseStrength,
          flowDensity: mapping.flowDensity,
          turbulence: mapping.turbulence,
          
          // Static qualitative parameters (not pulsed)
          flowPattern: mapping.flowPattern as FlowPattern,
          stability: mapping.stability ?? 0.5,
          sharpness: mapping.sharpness ?? 0.5,
          quantity: mapping.quantity ?? 0.5,
          opacity: mapping.opacity ?? 0.8,
          pulsing: mapping.pulsing ?? 0.75,

        }))
        
        // Force immediate visual feedback by starting the first frame of color transition
        if (colorTransitionProgressRef.current === 0.0) {
          setParams(prev => ({
            ...prev,
            primaryColor: currentPrimaryColorRef.current,
            secondaryColor: currentSecondaryColorRef.current
          }))
          console.log('🎨 Set initial transition colors:', {
            primary: currentPrimaryColorRef.current,
            secondary: currentSecondaryColorRef.current
          })
        }
        
        // Create human-readable description
        const pulsingValue = mapping.pulse ?? mapping.pulsing ?? 0.75
        const pulsingLevel = pulsingValue < 0.3 ? 'minimal' : pulsingValue < 0.6 ? 'moderate' : 'strong'
        const description = `Speed: ${mapping.speed.toFixed(1)} | Pulsing: ${pulsingLevel} (${(pulsingValue * 100).toFixed(0)}%) | Turbulence: ${mapping.turbulence.toFixed(2)} | NoiseStrength: ${mapping.noiseStrength.toFixed(2)} | Pattern: ${mapping.flowPattern ?? 'free'} | Colors: ${mapping.primaryColor} → ${mapping.secondaryColor}`
        setParameterDescription(description)
        
        console.log('✅ Applied Groq parameters:', mapping)
      } catch (err) {
        console.error('❌ Failed to translate keywords (using fallback):', err)
        // Don't show error to user since we have fallback parameters
      }
    }

    processKeywords()
    
    // Cleanup: mark component as unmounted
    return () => {
      isMounted = false
    }
  }, [keywords])

  // Sentiment values are still tracked but no longer directly control parameters
  // Parameters are now controlled by Groq keyword translation only
  // This prevents conflicts between sentiment-based and keyword-based parameter updates

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }
  /**
   * Handle streamed LLM responses from backend
   */
  const handleBackendMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'transcript_update':
        console.log('📝 Backend buffer:', message.text)
        break
      
      case 'result':
        const { sentiment, sentiment_type, keywords, confidence } = message.data
        setSentiment(sentiment)
        setSentimentType(sentiment_type)
        
        // Backend already extracts only emotional/qualia keywords
        console.log('📥 Received keywords from backend:', keywords)
        
        if (keywords.length > 0) {
          // Add keywords with timestamps
          const now = Date.now()
          const newKeywordsWithTimestamp = keywords.map((kw: string) => ({
            keyword: kw,
            timestamp: now
          }))
          setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
          setKeywords(prev => [...prev, ...keywords])
        }
        
        setIsProcessing(false)
        streamingContentRef.current = ""
        setError(null)
        console.log('✅ Received result:', message.data)
        break
      
      case 'error':
        setError(message.message)
        setIsProcessing(false)
        setTimeout(() => setError(null), 5000)
        break
      
      case 'processing':
        setIsProcessing(true)
        break
    }
  }, [])

  /**
   * Real transcription with Deepgram + FastAPI streaming
   */
  const startRealTranscription = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY) {
      setError('Deepgram API key not configured')
      setConnectionStatus('error')
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)

      if (USE_FASTAPI_BACKEND) {
        const backendWs = new BackendWebSocket(process.env.NEXT_PUBLIC_FASTAPI_URL || 'ws://localhost:8000/ws')
        backendWsRef.current = backendWs
        
        backendWs.onMessage(handleBackendMessage)
        backendWs.onConnectionChange((status) => {
          console.log('Backend WebSocket status:', status)
        })
        
        try {
          await backendWs.connect()
          console.log('✅ Connected to FastAPI backend')
        } catch (err) {
          console.warn('Failed to connect to FastAPI backend, using Next.js API routes')
        }
      }

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
        if (!transcript.is_final) {
          return
        }

        setTranscript((prev) => [...prev, transcript.text])

        pendingTranscriptRef.current = pendingTranscriptRef.current 
          ? pendingTranscriptRef.current + " " + transcript.text 
          : transcript.text

        if (backendThrottleRef.current) {
          clearTimeout(backendThrottleRef.current)
        }

        backendThrottleRef.current = setTimeout(async () => {
          const textToProcess = pendingTranscriptRef.current
          
          if (!textToProcess || textToProcess.trim().length < 3) {
            return
          }

          if (processingQueueRef.current.has(textToProcess)) {
            return
          }
          processingQueueRef.current.add(textToProcess)

          setIsProcessing(true)
          
          try {
            if (USE_FASTAPI_BACKEND && backendWsRef.current?.isConnected()) {
              console.log('📤 Sending to FastAPI:', textToProcess.substring(0, 50) + '...')
              backendWsRef.current.sendTranscript(textToProcess)
              pendingTranscriptRef.current = ""
            } else {
              const result = await withRetry(() => processText(textToProcess), 2, 500)
              setSentiment(result.sentiment)
              setSentimentType(result.sentiment_type)
              
              // Backend already extracts only emotional/qualia keywords
              console.log('📥 Received keywords from backend:', result.keywords)
              
              if (result.keywords.length > 0) {
                // Add keywords with timestamps
                const now = Date.now()
                const newKeywordsWithTimestamp = result.keywords.map((kw: string) => ({
                  keyword: kw,
                  timestamp: now
                }))
                setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
                setKeywords(prev => [...prev, ...result.keywords])
              }
              
              setIsProcessing(false)
              setError(null)
              pendingTranscriptRef.current = ""
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process text'
            setError(`Processing error: ${errorMessage}`)
            setTimeout(() => setError(null), 5000)
            setIsProcessing(false)
          } finally {
            processingQueueRef.current.delete(textToProcess)
          }
        }, 1500)
      })

      client.onError((err) => {
        setError(err.message)
        setConnectionStatus('error')
        setTimeout(() => setError(null), 5000)
      })

      await client.start()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      setConnectionStatus('error')
    }
  }, [handleBackendMessage])

  /**
   * Mock transcription for testing
   */
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
        
        // Mock keywords are already emotional/qualia words
        if (newKeywords.length > 0) {
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

  useEffect(() => {
    if (isRecording) {
      if (USE_REAL_APIS) {
        startRealTranscription()
        return () => {
          if (deepgramClientRef.current) {
            deepgramClientRef.current.stop()
            deepgramClientRef.current = null
          }
          if (backendWsRef.current) {
            backendWsRef.current.close()
            backendWsRef.current = null
          }
          if (backendThrottleRef.current) {
            clearTimeout(backendThrottleRef.current)
            backendThrottleRef.current = null
          }
          processingQueueRef.current.clear()
          pendingTranscriptRef.current = ""
        }
      } else {
        const cleanup = simulateTranscription()
        return cleanup
      }
    }
  }, [isRecording, startRealTranscription, simulateTranscription])

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      if (USE_REAL_APIS) {
        if (deepgramClientRef.current) {
          deepgramClientRef.current.stop()
          deepgramClientRef.current = null
        }
        if (backendWsRef.current) {
          backendWsRef.current.close()
          backendWsRef.current = null
        }
        if (backendThrottleRef.current) {
          clearTimeout(backendThrottleRef.current)
          backendThrottleRef.current = null
        }
      }
      pendingTranscriptRef.current = ""
      setIsRecording(false)
      setConnectionStatus("disconnected")
      setError(null)
    } else {
      setTranscript([])
      setKeywords([])
      setKeywordsWithTimestamp([])
      setSentiment(0.5)
      setSentimentType("neutral")
      setError(null)
      processingQueueRef.current.clear()
      lastProcessedKeywordCount.current = 0
      
      try {
        setIsRecording(true)
      } catch (err) {
        setError("Failed to start recording. Please check microphone permissions.")
        setConnectionStatus("error")
      }
    }
  }, [isRecording])

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
              {USE_REAL_APIS && USE_FASTAPI_BACKEND && (
                <span className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-blue-300">
                  STREAMING
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
          
          {/* Parameter Description Banner */}
          {parameterDescription && (
            <div className="pointer-events-auto animate-in slide-in-from-top-5 duration-300">
              <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-4 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="text-purple-300 text-xs font-mono leading-relaxed">
                    <div className="font-bold mb-1 text-purple-200">🤖 Groq Parameter Translation:</div>
                    {parameterDescription}
                  </div>
                </div>
              </div>
            </div>
          )}

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
