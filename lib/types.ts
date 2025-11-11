export type FlowPattern = "free" | "circular" | "spiral" | "wave" | "turbulent" | 
  "left" | "right" | "up" | "down" | "outward" | "inward" | 
  "spiralInward" | "spiralOutward" | "breathing" | "flocking" | 
  "attractionWell" | "repulsionWell" | "shearHorizontal" | "shearVertical" | 
  "jittery" | "viscous" | "burst" | "orbitDrift" | "maze"

export interface SimulationParams {
  // Direct simulation parameters
  particleCount: number
  particleSize: number
  brightness: number
  speed: number
  timeScale: number
  transitionSpeed: number
  pulse: number
  noiseScale: number
  noiseStrength: number
  flowDensity: number
  turbulence: number
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  showVectorField: boolean
  
  // Legacy compatibility parameters
  opacity: number
  flowPattern: FlowPattern
  clarity: number
  intensity: number
  density: number
  stability: number
  coherence: number
  weight: number
  sharpness: number
  pulsing: number
  quantity?: number
}
