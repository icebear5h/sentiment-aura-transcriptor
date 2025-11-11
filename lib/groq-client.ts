import Groq from "groq-sdk"
import { getKeywordTranslationPrompt } from "./qualitative-prompt"

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage
})

export interface ParticleParameterMapping {
  // Direct simulation parameters (objective prompt)
  particleCount: number // 500-10000: Number of particles
  particleSize: number // 0.005-0.10: Size of each particle
  brightness: number // 0.2-1.0: Overall brightness
  speed: number // 0.1-5.0: Movement speed
  timeScale: number // 0.5-2.0: Global animation speed multiplier
  transitionSpeed: number // 0.1-3.0: Speed of parameter transitions
  pulse: number // 0.0-1.0: Breathing/pulsing animation intensity
  noiseScale: number // 0.1-2.0: Scale of Perlin noise patterns
  noiseStrength: number // 0.2-5.0: Push strength along flow direction
  flowDensity: number // 0.01-0.80: Concentration of flow patterns
  turbulence: number // 0.0-2.0: Particle wiggle/wobble intensity
  primaryColor: string // Hex color "#RRGGBB"
  secondaryColor: string // Hex color "#RRGGBB"
  
  // Legacy compatibility parameters (for qualitative prompt)
  clarity?: number // 0-1: How clear/defined vs hazy/uncertain
  intensity?: number // 0-1: Energy/brightness level
  coherence?: number // 0-1: How organized vs chaotic
  stability?: number // 0-1: How stable/steady vs dynamic/changing
  density?: number // 0-1: How dense/concentrated vs sparse/diffuse
  sharpness?: number // 0-1: How sharp/defined vs soft/blurred
  quantity?: number // 0-1: Number of particles
  opacity?: number // 0-1: Transparency/presence
  directionalStrength?: number // 0.2-1.0: Strength of directional flow
  pulsing?: number // 0.0-1.0: Legacy pulsing (maps to pulse)
  flowPattern?: string // Flow pattern type
}

export async function translateKeywordsToParameters(
  keywords: string[],
  processedText?: string
): Promise<ParticleParameterMapping> {
  if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    throw new Error("Groq API key not configured")
  }

  const prompt = getKeywordTranslationPrompt(keywords, processedText)

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content || ""
    
    console.log(" Raw Groq response:", content)
    
    // Multiple cleaning strategies
    let cleaned = content
      .replace(/```json\n?|\n?```/g, "") // Remove code blocks
      .replace(/```\n?/g, "") // Remove any other code block markers
      .trim()
    
    // Find the first { and last } to extract just the JSON object
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new SyntaxError("No JSON object found in response")
    }
    
    let jsonString = cleaned.substring(firstBrace, lastBrace + 1)
    
    // Try parsing, if it fails, try to find and remove trailing content
    let params: ParticleParameterMapping
    try {
      console.log(" Attempting to parse JSON (length: " + jsonString.length + ")")
      params = JSON.parse(jsonString) as ParticleParameterMapping
    } catch (parseError) {
      console.log(" First parse failed, trying to clean trailing content...")
      
      // Try to find where valid JSON ends by looking for the closing brace of the main object
      let braceCount = 0
      let validJsonEnd = -1
      
      for (let i = 0; i < jsonString.length; i++) {
        if (jsonString[i] === '{') braceCount++
        if (jsonString[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            validJsonEnd = i + 1
            break
          }
        }
      }
      
      if (validJsonEnd > 0) {
        jsonString = jsonString.substring(0, validJsonEnd)
        console.log(" Cleaned JSON string (length: " + jsonString.length + "):", jsonString)
        params = JSON.parse(jsonString) as ParticleParameterMapping
      } else {
        throw parseError
      }
    }
    
    // Validate and clamp qualitative values
    params.clarity = Math.max(0.0, Math.min(1.0, params.clarity ?? 0.5))
    params.intensity = Math.max(0.0, Math.min(1.0, params.intensity ?? 0.5))
    params.coherence = Math.max(0.0, Math.min(1.0, params.coherence ?? 0.5))
    params.stability = Math.max(0.0, Math.min(1.0, params.stability ?? 0.5))
    params.density = Math.max(0.0, Math.min(1.0, params.density ?? 0.5))
    params.flowDensity = Math.max(0.01, Math.min(0.80, params.flowDensity ?? 0.4))
    params.sharpness = Math.max(0.0, Math.min(1.0, params.sharpness ?? 0.5))
    params.quantity = Math.max(0.0, Math.min(1.0, params.quantity ?? 0.5))
    params.opacity = Math.max(0.0, Math.min(1.0, params.opacity ?? 0.8))
    params.pulsing = Math.max(0.0, Math.min(1.0, params.pulsing ?? 0.75))
    
    // Validate required fields (objective prompt doesn't use flowPattern)
    if (!params.primaryColor || !params.secondaryColor) {
      throw new Error("Missing required fields in Groq response")
    }
    
    // For objective prompt: parameters are already direct simulation values
    // Just need to ensure they're properly clamped and add missing technical parameters
    
    // Add timeScale and transitionSpeed if not present (objective prompt specific)
    if (!params.timeScale) params.timeScale = 1.0
    if (!params.transitionSpeed) params.transitionSpeed = 1.0
    
    // Map pulse to pulsing for compatibility
    if (params.pulse !== undefined && params.pulsing === undefined) {
      params.pulsing = params.pulse
    } else if (params.pulse === undefined && params.pulsing === undefined) {
      params.pulsing = 0.75 // default
    }
    
    // Clamp final technical values (objective prompt ranges)
    params.particleCount = Math.max(500, Math.min(10000, params.particleCount ?? 5000))
    params.particleSize = Math.max(0.005, Math.min(0.10, params.particleSize ?? 0.03))
    params.brightness = Math.max(0.2, Math.min(1.0, params.brightness ?? 0.7))
    params.speed = Math.max(0.1, Math.min(5.0, params.speed ?? 1.0))
    params.timeScale = Math.max(0.5, Math.min(2.0, params.timeScale ?? 1.0))
    params.transitionSpeed = Math.max(0.1, Math.min(3.0, params.transitionSpeed ?? 1.0))
    params.noiseScale = Math.max(0.1, Math.min(2.0, params.noiseScale ?? 1.0))
    params.noiseStrength = Math.max(0.2, Math.min(5.0, params.noiseStrength ?? 0.5))
    params.flowDensity = Math.max(0.01, Math.min(0.80, params.flowDensity ?? 0.4))
    params.turbulence = Math.max(0.0, Math.min(2.0, params.turbulence ?? 0.5))
    params.pulsing = Math.max(0.0, Math.min(1.0, params.pulsing ?? 0.75))
    
    // COMPREHENSIVE LOGGING - All parameters returned by Groq
    console.log('═══════════════════════════════════════════════════════')
    console.log(' GROQ RESPONSE - COMPLETE PARAMETER BREAKDOWN')
    console.log('Keywords:', keywords)
    console.log('═══════════════════════════════════════════════════════')
    console.log(' DIRECT SIMULATION PARAMETERS:')
    console.log('  particleCount:', params.particleCount)
    console.log('  particleSize:', params.particleSize)
    console.log('  brightness:', params.brightness)
    console.log('  speed:', params.speed)
    console.log('  timeScale:', params.timeScale)
    console.log('  transitionSpeed:', params.transitionSpeed)
    console.log('  pulse:', params.pulse)
    console.log('  noiseScale:', params.noiseScale, ' CHECK THIS')
    console.log('  noiseStrength:', params.noiseStrength, ' CHECK THIS')
    console.log('  flowDensity:', params.flowDensity)
    console.log('  turbulence:', params.turbulence, ' CHECK THIS')
    console.log('  primaryColor:', params.primaryColor)
    console.log('  secondaryColor:', params.secondaryColor)
    console.log('───────────────────────────────────────────────────────')
    console.log(' QUALITATIVE PARAMETERS:')
    console.log('  clarity:', params.clarity)
    console.log('  intensity:', params.intensity)
    console.log('  coherence:', params.coherence)
    console.log('  stability:', params.stability)
    console.log('  density:', params.density)
    console.log('  sharpness:', params.sharpness)
    console.log('  quantity:', params.quantity)
    console.log('  opacity:', params.opacity)
    console.log('  pulsing:', params.pulsing)
    console.log('  flowPattern:', params.flowPattern)
    console.log('═══════════════════════════════════════════════════════')
    
    return params
  } catch (error) {
    console.error(" Groq API error:", error)
    if (error instanceof SyntaxError) {
      console.error("JSON parsing failed - using fallback parameters")
      
      // Fallback: Generate reasonable defaults based on keywords
      const keywordString = keywords.join(" ").toLowerCase()
      
      // Start with qualitative defaults
      let clarity = 0.5
      let intensity = 0.5
      let coherence = 0.5
      let stability = 0.5
      let density = 0.5
      let flowDensity = 0.4
      let sharpness = 0.5
      let pulsing = 0.75
      let primaryColor = "#88aaff"
      let secondaryColor = "#aa88ff"
      let flowPattern = "free"
      
      // Simple keyword matching for fallback with qualitative parameters
      if (keywordString.includes("calm") || keywordString.includes("peace") || keywordString.includes("serene") || keywordString.includes("meditat")) {
        clarity = 0.8
        intensity = 0.3
        coherence = 0.9
        stability = 0.9
        density = 0.6
        flowDensity = 0.45
        sharpness = 0.5
        pulsing = 0.2
        primaryColor = "#6699cc"
        secondaryColor = "#9999ff"
        flowPattern = "circular" // Cyclical, harmonious
      } else if (keywordString.includes("hopeful") || keywordString.includes("inspir") || keywordString.includes("optim") || keywordString.includes("uplift")) {
        clarity = 0.8
        intensity = 0.7
        coherence = 0.8
        stability = 0.65
        density = 0.7
        flowDensity = 0.6
        sharpness = 0.7
        pulsing = 0.25
        primaryColor = "#66ccff"
        secondaryColor = "#99ff99"
        flowPattern = "spiralOutward" // Expanding, growing
      } else if (keywordString.includes("energy") || keywordString.includes("excit") || keywordString.includes("vibrant") || keywordString.includes("lively")) {
        clarity = 0.7
        intensity = 0.85
        coherence = 0.6
        stability = 0.5
        density = 0.7
        flowDensity = 0.55
        sharpness = 0.6
        pulsing = 0.5
        primaryColor = "#ffaa00"
        secondaryColor = "#ff6600"
        flowPattern = "spiralOutward" // Radiating outward
      } else if (keywordString.includes("euphor") || keywordString.includes("ecstat") || keywordString.includes("jubilant") || keywordString.includes("exhilarat")) {
        clarity = 0.8
        intensity = 0.95
        coherence = 0.7
        stability = 0.6
        density = 0.8
        flowDensity = 0.65
        sharpness = 0.7
        pulsing = 0.6
        primaryColor = "#ffdd00"
        secondaryColor = "#ff0099"
        flowPattern = "outward" // Explosive burst outward
      } else if (keywordString.includes("anxious") || keywordString.includes("fear") || keywordString.includes("overwhelm") || keywordString.includes("panic")) {
        clarity = 0.2
        intensity = 0.5
        coherence = 0.4
        stability = 0.1
        density = 0.7
        flowDensity = 0.25
        sharpness = 0.4
        pulsing = 0.95
        primaryColor = "#9933cc"
        secondaryColor = "#cc3366"
        flowPattern = "inward" // Collapsing inward, being pulled in
      } else if (keywordString.includes("introspect") || keywordString.includes("contempl") || keywordString.includes("reflect") || keywordString.includes("focus")) {
        clarity = 0.75
        intensity = 0.35
        coherence = 0.7
        stability = 0.75
        density = 0.4
        flowDensity = 0.35
        sharpness = 0.6
        pulsing = 0.3
        primaryColor = "#5566aa"
        secondaryColor = "#334477"
        flowPattern = "spiralInward" // Converging, introspective
      } else if (keywordString.includes("lonely") || keywordString.includes("isolat") || keywordString.includes("abandon") || keywordString.includes("despair")) {
        clarity = 0.5
        intensity = 0.25
        coherence = 0.6
        stability = 0.5
        density = 0.3
        flowDensity = 0.2
        sharpness = 0.3
        pulsing = 0.5
        primaryColor = "#445566"
        secondaryColor = "#667788"
        flowPattern = "spiralInward" // Withdrawing inward
      } else if (keywordString.includes("chaos") || keywordString.includes("frantic") || keywordString.includes("wild") || keywordString.includes("erratic")) {
        clarity = 0.3
        intensity = 0.8
        coherence = 0.2
        stability = 0.2
        density = 0.6
        flowDensity = 0.3
        sharpness = 0.8
        pulsing = 0.8
        primaryColor = "#cc0066"
        secondaryColor = "#9933ff"
        flowPattern = "free" // Unstructured chaos
      } else if (keywordString.includes("warm") || keywordString.includes("loving") || keywordString.includes("tender") || keywordString.includes("affection")) {
        clarity = 0.75
        intensity = 0.65
        coherence = 0.75
        stability = 0.7
        density = 0.6
        flowDensity = 0.5
        sharpness = 0.4
        pulsing = 0.3
        primaryColor = "#ff9966"
        secondaryColor = "#ffcc66"
        flowPattern = "breathing" // Alive, rhythmic
      } else if (keywordString.includes("confident") || keywordString.includes("bold") || keywordString.includes("strong") || keywordString.includes("assertive")) {
        clarity = 0.95
        intensity = 0.75
        coherence = 0.85
        stability = 0.9
        density = 0.8
        flowDensity = 0.7
        sharpness = 0.8
        pulsing = 0.1
        primaryColor = "#ffcc00"
        secondaryColor = "#ffffff"
        flowPattern = "outward" // Bold, expansive
      } else if (keywordString.includes("sad") || keywordString.includes("melanchol") || keywordString.includes("somber") || keywordString.includes("mournful")) {
        clarity = 0.6
        intensity = 0.2 // Lower intensity for melancholy
        coherence = 0.75 // Higher coherence for directional flow
        stability = 0.8 // More stable
        density = 0.4
        flowDensity = 0.25 // More diffuse but directional
        sharpness = 0.3
        pulsing = 0.25 // Gentler pulsing
        primaryColor = "#4466aa"
        secondaryColor = "#6688cc"
        flowPattern = "spiralInward" // Directional, inward motion
      } else if (keywordString.includes("uncertain") || keywordString.includes("confus") || keywordString.includes("unclear") || keywordString.includes("nervous")) {
        clarity = 0.15
        intensity = 0.4
        coherence = 0.5
        stability = 0.3
        density = 0.5
        flowDensity = 0.35
        sharpness = 0.2
        pulsing = 0.95
        primaryColor = "#7788aa"
        secondaryColor = "#556688"
        flowPattern = "free" // Undefined, wandering
      }
      
      // Map qualitative to technical parameters (same logic as main flow)
      const particleSize = 0.005 + (1 - clarity) * 0.095
      const brightness = Math.max(0.2 + clarity * 0.8, 0.2 + intensity * 0.8)
      let speed = 0.1 + intensity * 2.9
      const turbulence = Math.min(2.0, (0.05 + (1 - coherence) * 0.75) * (1.0 + (1 - stability) * 0.3))
      const noiseStrength = 0.2 + (1 - coherence) * 0.8
      const directionalStrength = coherence * 0.8 + 0.2
      const quantity = density // Use density as fallback for quantity
      const particleCount = Math.floor(500 + quantity * 9500)
      const noiseScale = 0.1 + sharpness * 1.9
      
      return {
        // Required objective prompt parameters
        particleCount,
        particleSize,
        brightness,
        speed,
        timeScale: 1.0,
        transitionSpeed: 1.0,
        pulse: pulsing,
        noiseScale,
        noiseStrength,
        flowDensity,
        turbulence,
        primaryColor,
        secondaryColor,
        
        // Legacy parameters for compatibility
        clarity,
        intensity,
        coherence,
        stability,
        density,
        sharpness,
        quantity: density, // Use density as quantity for fallback
        opacity: 0.8, // Default moderate-high opacity for fallback
        directionalStrength,
        pulsing,
        flowPattern,
      }
    }
    throw error
  }
}

export async function translateKeywordsToParametersWithRetry(
  keywords: string[],
  processedText?: string,
  maxRetries = 2
): Promise<ParticleParameterMapping> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await translateKeywordsToParameters(keywords, processedText)
    } catch (error) {
      lastError = error as Error
      // If it's a SyntaxError, the fallback was already returned, so this won't happen
      // But for other errors, retry with delay
      if (i < maxRetries - 1 && !(error instanceof SyntaxError)) {
        console.log(`⏳ Retry ${i + 1}/${maxRetries} after error...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  // This should rarely happen now since SyntaxError returns fallback
  console.warn("⚠️ All retries failed, using default fallback")
  return {
    // Required objective prompt parameters
    particleCount: 5250, // Default mid-range particle count (500-10000 range)
    particleSize: 0.018,
    brightness: 0.7,
    speed: 1.0,
    timeScale: 1.0,
    transitionSpeed: 1.0,
    pulse: 0.75,
    noiseScale: 0.8,
    noiseStrength: 0.5, // Corrected range for objective prompt
    flowDensity: 0.4,
    turbulence: 0.5, // Corrected range for objective prompt
    primaryColor: "#88aaff",
    secondaryColor: "#aa88ff",
    
    // Legacy parameters for compatibility
    clarity: 0.5,
    intensity: 0.5,
    coherence: 0.5,
    stability: 0.5,
    density: 0.5,
    sharpness: 0.5,
    quantity: 0.5, // Default mid-range quantity
    opacity: 0.8, // Default moderate-high opacity
    directionalStrength: 0.6,
    pulsing: 0.75,
    flowPattern: "free",
  }
}
