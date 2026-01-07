import { useEffect, Dispatch, SetStateAction } from 'react'
import type { SimulationParams } from '@/lib/types'
import { interpolateColor, interpolateNumber, easeInOut } from '@/utils/interpolation'

interface NumericParamRefs {
  current: React.MutableRefObject<number>
  target: React.MutableRefObject<number>
}

interface AnimationRefs {
  pulseTimeRef: React.MutableRefObject<number>
  clarityBaseRef: React.MutableRefObject<number>
  intensityBaseRef: React.MutableRefObject<number>
  coherenceBaseRef: React.MutableRefObject<number>
  pulsingAmplitudeRef: React.MutableRefObject<number>
  currentPrimaryColorRef: React.MutableRefObject<string>
  currentSecondaryColorRef: React.MutableRefObject<string>
  targetPrimaryColorRef: React.MutableRefObject<string>
  targetSecondaryColorRef: React.MutableRefObject<string>
  colorTransitionProgressRef: React.MutableRefObject<number>
  currentParticleCountRef: React.MutableRefObject<number>
  targetParticleCountRef: React.MutableRefObject<number>
  currentParticleSizeRef: React.MutableRefObject<number>
  targetParticleSizeRef: React.MutableRefObject<number>
  particleTransitionProgressRef: React.MutableRefObject<number>
  // New: numeric parameter transitions
  numericParams: {
    brightness: NumericParamRefs
    speed: NumericParamRefs
    timeScale: NumericParamRefs
    pulse: NumericParamRefs
    noiseScale: NumericParamRefs
    noiseStrength: NumericParamRefs
    flowDensity: NumericParamRefs
    turbulence: NumericParamRefs
    opacity: NumericParamRefs
  }
  numericTransitionProgressRef: React.MutableRefObject<number>
  transitionDurationRef: React.MutableRefObject<number>
}

const COLOR_TRANSITION_DURATION = 4.0 // seconds
const PARTICLE_TRANSITION_DURATION = 3.0 // seconds
const DEFAULT_TRANSITION_DURATION = 0.75 // seconds

/**
 * Manages smooth parameter animations including:
 * - Color transitions
 * - Particle count/size transitions
 * - Pulsing effects
 */
export function useParameterAnimation(
  setParams: Dispatch<SetStateAction<SimulationParams>>,
  refs: AnimationRefs
) {
  useEffect(() => {
    let frameCount = 0
    const animate = () => {
      refs.pulseTimeRef.current += 0.016 // ~60fps
      frameCount++

      // Build a single update object for all changes this frame
      const updates: Partial<SimulationParams> = {}
      let hasUpdates = false

      // Handle color transitions
      if (refs.colorTransitionProgressRef.current < 1.0) {
        refs.colorTransitionProgressRef.current = Math.min(
          1.0,
          refs.colorTransitionProgressRef.current + 0.016 / COLOR_TRANSITION_DURATION
        )

        const easedT = easeInOut(refs.colorTransitionProgressRef.current)
        updates.primaryColor = interpolateColor(
          refs.currentPrimaryColorRef.current,
          refs.targetPrimaryColorRef.current,
          easedT
        )
        updates.secondaryColor = interpolateColor(
          refs.currentSecondaryColorRef.current,
          refs.targetSecondaryColorRef.current,
          easedT
        )
        hasUpdates = true

        if (refs.colorTransitionProgressRef.current >= 1.0) {
          refs.currentPrimaryColorRef.current = refs.targetPrimaryColorRef.current
          refs.currentSecondaryColorRef.current = refs.targetSecondaryColorRef.current
        }
      }

      // Handle particle count and size transitions
      if (refs.particleTransitionProgressRef.current < 1.0) {
        refs.particleTransitionProgressRef.current = Math.min(
          1.0,
          refs.particleTransitionProgressRef.current + 0.016 / PARTICLE_TRANSITION_DURATION
        )

        const easedT = easeInOut(refs.particleTransitionProgressRef.current)
        updates.particleCount = Math.round(interpolateNumber(
          refs.currentParticleCountRef.current,
          refs.targetParticleCountRef.current,
          easedT
        ))
        updates.particleSize = interpolateNumber(
          refs.currentParticleSizeRef.current,
          refs.targetParticleSizeRef.current,
          easedT
        )
        hasUpdates = true

        if (refs.particleTransitionProgressRef.current >= 1.0) {
          refs.currentParticleCountRef.current = refs.targetParticleCountRef.current
          refs.currentParticleSizeRef.current = refs.targetParticleSizeRef.current
        }
      }

      // Handle numeric parameter transitions (brightness, speed, etc.)
      if (refs.numericTransitionProgressRef.current < 1.0) {
        const duration = refs.transitionDurationRef.current || DEFAULT_TRANSITION_DURATION
        refs.numericTransitionProgressRef.current = Math.min(
          1.0,
          refs.numericTransitionProgressRef.current + 0.016 / duration
        )

        const easedT = easeInOut(refs.numericTransitionProgressRef.current)
        const np = refs.numericParams
        
        updates.brightness = interpolateNumber(np.brightness.current.current, np.brightness.target.current, easedT)
        updates.speed = interpolateNumber(np.speed.current.current, np.speed.target.current, easedT)
        updates.timeScale = interpolateNumber(np.timeScale.current.current, np.timeScale.target.current, easedT)
        updates.pulse = interpolateNumber(np.pulse.current.current, np.pulse.target.current, easedT)
        updates.noiseScale = interpolateNumber(np.noiseScale.current.current, np.noiseScale.target.current, easedT)
        updates.noiseStrength = interpolateNumber(np.noiseStrength.current.current, np.noiseStrength.target.current, easedT)
        updates.flowDensity = interpolateNumber(np.flowDensity.current.current, np.flowDensity.target.current, easedT)
        updates.turbulence = interpolateNumber(np.turbulence.current.current, np.turbulence.target.current, easedT)
        updates.opacity = interpolateNumber(np.opacity.current.current, np.opacity.target.current, easedT)
        hasUpdates = true

        if (refs.numericTransitionProgressRef.current >= 1.0) {
          Object.keys(np).forEach(key => {
            const k = key as keyof typeof np
            np[k].current.current = np[k].target.current
          })
        }
      }

      // Clarity pulsing - only update every 3rd frame to reduce overhead
      if (frameCount % 3 === 0) {
        const clarityPulse = Math.sin(refs.pulseTimeRef.current * 2.0) * 0.25 + 0.5
        updates.clarity = refs.clarityBaseRef.current * 0.5 + clarityPulse * 0.5
        hasUpdates = true
      }

      // Single setParams call per frame (only if there are updates)
      if (hasUpdates) {
        setParams(prev => ({ ...prev, ...updates }))
      }

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams]) // refs are stable (useRef), don't include in deps
}
