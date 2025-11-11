"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SimulationParams, FlowPattern } from "@/lib/types"

// Simple 3D Perlin-like noise implementation
class SimplexNoise {
  private perm: number[]

  constructor(seed = Math.random()) {
    this.perm = []
    for (let i = 0; i < 256; i++) {
      this.perm[i] = i
    }
    // Shuffle based on seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed * (i + 1)) % (i + 1))
      ;[this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]]
    }
    // Duplicate
    for (let i = 0; i < 256; i++) {
      this.perm[256 + i] = this.perm[i]
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    const A = this.perm[X] + Y
    const AA = this.perm[A] + Z
    const AB = this.perm[A + 1] + Z
    const B = this.perm[X + 1] + Y
    const BA = this.perm[B] + Z
    const BB = this.perm[B + 1] + Z

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z)),
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1)),
      ),
    )
  }
}

function VectorField({ params, noise }: { params: SimulationParams; noise: SimplexNoise }) {
  const arrowsRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)

  const gridSize = 7 // 7x7x7 grid of arrows
  const spacing = 1.2 // Space between arrows

  useFrame((state, delta) => {
    if (!arrowsRef.current) return
    timeRef.current += delta * params.speed * params.timeScale

    let arrowIndex = 0
    const offset = ((gridSize - 1) * spacing) / 2

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const posX = x * spacing - offset
          const posY = y * spacing - offset
          const posZ = z * spacing - offset

          // Sample noise
          const noiseValue1 = noise.noise(
            posX * params.noiseScale * params.flowDensity,
            posY * params.noiseScale * params.flowDensity,
            posZ * params.noiseScale * params.flowDensity + timeRef.current,
          )
          const noiseValue2 = noise.noise(
            posX * params.noiseScale * params.flowDensity * 2 + 100,
            posY * params.noiseScale * params.flowDensity * 2 + 100,
            posZ * params.noiseScale * params.flowDensity * 2 + 100 + timeRef.current,
          )
          const noiseValue3 = noise.noise(
            posX * params.noiseScale * params.flowDensity * 0.5 + 200,
            posY * params.noiseScale * params.flowDensity * 0.5 + 200,
            posZ * params.noiseScale * params.flowDensity * 0.5 + 200 + timeRef.current,
          )

          let dirX = 0
          let dirY = 0
          let dirZ = 0

          // Calculate direction based on flow pattern
          switch (params.flowPattern) {
            case "circular":
              const radiusXY = Math.sqrt(posX * posX + posY * posY)
              const minCircularRadius = 0.5
              const targetRadius = 2.5
              const centripetalStrength = 0.3

              if (radiusXY < minCircularRadius) {
                dirX = (posX / (radiusXY + 0.01)) * 2
                dirY = (posY / (radiusXY + 0.01)) * 2
                dirZ = 0
              } else {
                const tangentX = -posY / (radiusXY + 0.01)
                const tangentY = posX / (radiusXY + 0.01)
                const radiusError = radiusXY - targetRadius
                const centripetalX = -(posX / radiusXY) * radiusError * centripetalStrength
                const centripetalY = -(posY / radiusXY) * radiusError * centripetalStrength
                dirX = tangentX + centripetalX
                dirY = tangentY + centripetalY
                dirZ = 0
              }
              break
            case "left":
              dirX = -1
              dirY = 0
              dirZ = 0
              break
            case "right":
              dirX = 1
              dirY = 0
              dirZ = 0
              break
            case "up":
              dirX = 0
              dirY = 1
              dirZ = 0
              break
            case "down":
              dirX = 0
              dirY = -1
              dirZ = 0
              break
            case "outward":
              const distFromCenterOut = Math.sqrt(posX * posX + posY * posY + posZ * posZ)
              if (distFromCenterOut > 0.01) {
                dirX = posX / distFromCenterOut
                dirY = posY / distFromCenterOut
                dirZ = posZ / distFromCenterOut
              }
              break
            case "inward":
              const distFromCenter = Math.sqrt(posX * posX + posY * posY + posZ * posZ)
              if (distFromCenter > 0.01) {
                dirX = -posX / distFromCenter
                dirY = -posY / distFromCenter
                dirZ = -posZ / distFromCenter
              }
              break
            case "free":
            default:
              dirX = noiseValue1
              dirY = noiseValue2
              dirZ = noiseValue3
              break
          }

          const noiseMagnitude = (Math.abs(noiseValue1) + Math.abs(noiseValue2) + Math.abs(noiseValue3)) / 3

          let finalDirX, finalDirY, finalDirZ
          if (params.flowPattern === "free") {
            // In free mode, noise defines the direction; strength scales the push
            finalDirX = dirX * params.noiseStrength
            finalDirY = dirY * params.noiseStrength
            finalDirZ = dirZ * params.noiseStrength
          } else {
            // In directed modes, push strictly along the flow direction; randomness comes from turbulence
            finalDirX = dirX * params.noiseStrength
            finalDirY = dirY * params.noiseStrength
            finalDirZ = dirZ * params.noiseStrength
          }

          // Normalize and scale for visualization
          const magnitude = Math.sqrt(finalDirX * finalDirX + finalDirY * finalDirY + finalDirZ * finalDirZ)
          if (magnitude > 0.01) {
            const scale = Math.min(magnitude * 0.3, 0.8)
            finalDirX = (finalDirX / magnitude) * scale
            finalDirY = (finalDirY / magnitude) * scale
            finalDirZ = (finalDirZ / magnitude) * scale
          }

          const arrow = arrowsRef.current.children[arrowIndex] as THREE.ArrowHelper
          if (arrow) {
            arrow.position.set(posX, posY, posZ)
            const direction = new THREE.Vector3(finalDirX, finalDirY, finalDirZ)
            if (direction.length() > 0.01) {
              arrow.setDirection(direction.normalize())
              arrow.setLength(direction.length() * 1.5, direction.length() * 0.3, direction.length() * 0.2)

              // Color based on magnitude
              const color = new THREE.Color().setHSL(0.6 - magnitude * 0.3, 1.0, 0.5)
              arrow.setColor(color)
            }
          }
          arrowIndex++
        }
      }
    }
  })

  // Create arrows
  const arrows = useMemo(() => {
    const arrowArray = []
    const totalArrows = gridSize * gridSize * gridSize

    for (let i = 0; i < totalArrows; i++) {
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        0.5,
        0x00ffff,
        0.2,
        0.15,
      )
      arrowArray.push(arrow)
    }
    return arrowArray
  }, [])

  return (
    <group ref={arrowsRef}>
      {arrows.map((arrow, i) => (
        <primitive key={i} object={arrow} />
      ))}
    </group>
  )
}

export function PerlinNoiseParticles({ params }: { params: SimulationParams }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const timeRef = useRef(0)
  const previousPatternRef = useRef<FlowPattern>(params.flowPattern)
  const transitionProgressRef = useRef(1)
  const breathingPhaseRef = useRef(0)
  const burstTimerRef = useRef(0)

  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const colorsRef = useRef<Float32Array | null>(null)
  const gridPositionsRef = useRef<Float32Array | null>(null)
  const previousCountRef = useRef(params.particleCount)

  const noise = useMemo(() => new SimplexNoise(), [])

  useEffect(() => {
    if (previousPatternRef.current !== params.flowPattern) {
      console.log(`[v0] Pattern transition started: ${previousPatternRef.current} → ${params.flowPattern}`)
      transitionProgressRef.current = 0 // Start new transition
    }
  }, [params.flowPattern])

  useEffect(() => {
    const primaryColor = new THREE.Color(params.primaryColor)
    const secondaryColor = new THREE.Color(params.secondaryColor)
    const gridSize = Math.ceil(Math.cbrt(params.particleCount))
    const spacing = 0.3
    const offset = (gridSize * spacing) / 2

    const currentCount = positionsRef.current ? positionsRef.current.length / 3 : 0
    const countDiff = Math.abs(currentCount - params.particleCount)

    if (!positionsRef.current || countDiff > 10) {
      const oldPositions = positionsRef.current
      const oldVelocities = velocitiesRef.current
      const oldCount = currentCount

      // Create new arrays
      const newPositions = new Float32Array(params.particleCount * 3)
      const newVelocities = new Float32Array(params.particleCount * 3)
      const newColors = new Float32Array(params.particleCount * 3)
      const newGridPositions = new Float32Array(params.particleCount * 3)

      // Copy existing particle data if we had particles before
      if (oldPositions && oldVelocities) {
        const copyCount = Math.min(oldCount, params.particleCount)
        for (let i = 0; i < copyCount * 3; i++) {
          newPositions[i] = oldPositions[i]
          newVelocities[i] = oldVelocities[i]
        }
      }

      const startIndex = oldPositions ? oldCount : 0

      // First, generate all grid positions with their distances
      const gridPoints: Array<{ x: number; y: number; z: number; distance: number }> = []
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          for (let z = 0; z < gridSize; z++) {
            const gridX = x * spacing - offset
            const gridY = y * spacing - offset
            const gridZ = z * spacing - offset
            const distance = Math.sqrt(gridX * gridX + gridY * gridY + gridZ * gridZ)
            gridPoints.push({ x: gridX, y: gridY, z: gridZ, distance })
          }
        }
      }

      // Sort by distance from center (closest first)
      gridPoints.sort((a, b) => a.distance - b.distance)

      // Now assign positions in sorted order
      for (
        let particleIndex = 0;
        particleIndex < params.particleCount && particleIndex < gridPoints.length;
        particleIndex++
      ) {
        const i3 = particleIndex * 3
        const point = gridPoints[particleIndex]

        // Only initialize position if this is a new particle
        if (particleIndex >= startIndex) {
          newPositions[i3] = point.x
          newPositions[i3 + 1] = point.y
          newPositions[i3 + 2] = point.z
          newVelocities[i3] = 0
          newVelocities[i3 + 1] = 0
          newVelocities[i3 + 2] = 0
        }

        // Store grid positions for all particles
        newGridPositions[i3] = point.x
        newGridPositions[i3 + 1] = point.y
        newGridPositions[i3 + 2] = point.z

        // Update colors for all particles
        const t = particleIndex / params.particleCount
        const color = primaryColor.clone().lerp(secondaryColor, t)
        newColors[i3] = color.r
        newColors[i3 + 1] = color.g
        newColors[i3 + 2] = color.b
      }

      positionsRef.current = newPositions
      velocitiesRef.current = newVelocities
      colorsRef.current = newColors
      gridPositionsRef.current = newGridPositions
      previousCountRef.current = params.particleCount

      if (countDiff > 10) {
        console.log(`[v0] Particle count changed: ${oldCount} → ${params.particleCount}`)
      }
    }
  }, [params.particleCount, params.primaryColor, params.secondaryColor])

  useEffect(() => {
    
    if (colorsRef.current && meshRef.current) {
      const primaryColor = new THREE.Color(params.primaryColor)
      const secondaryColor = new THREE.Color(params.secondaryColor)

      for (let i = 0; i < params.particleCount; i++) {
        const i3 = i * 3
        const t = i / params.particleCount
        const color = primaryColor.clone().lerp(secondaryColor, t)
        colorsRef.current[i3] = color.r
        colorsRef.current[i3 + 1] = color.g
        colorsRef.current[i3 + 2] = color.b
        
        // Update the instancedMesh color immediately
        meshRef.current.setColorAt(i, color)
      }
      
      // Mark instance color as needing update
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true
      }
    }
  }, [params.primaryColor, params.secondaryColor, params.particleCount])

  const calculateDirection = (
    pattern: FlowPattern,
    x: number,
    y: number,
    z: number,
    positions: Float32Array,
    velocities: Float32Array,
    i3: number,
    time: number,
  ): [number, number, number] => {
    let dirX = 0
    let dirY = 0
    let dirZ = 0

    switch (pattern) {
      case "circular":
        const radiusXY = Math.sqrt(x * x + y * y)
        const minCircularRadius = 0.15 // Reduced minimum radius from 0.5 to 0.15 for tighter spiral
        const targetRadius = 2.5
        const centripetalStrength = 0.3

        if (radiusXY < minCircularRadius) {
          dirX = (x / (radiusXY + 0.01)) * 2
          dirY = (y / (radiusXY + 0.01)) * 2
          dirZ = 0
        } else {
          const tangentX = -y / (radiusXY + 0.01)
          const tangentY = x / (radiusXY + 0.01)
          const radiusError = radiusXY - targetRadius
          const centripetalX = -(x / radiusXY) * radiusError * centripetalStrength
          const centripetalY = -(y / radiusXY) * radiusError * centripetalStrength
          dirX = tangentX + centripetalX
          dirY = tangentY + centripetalY
          dirZ = 0
        }
        break
      case "spiralInward":
        const radiusXYSpiralIn = Math.sqrt(x * x + y * y)
        if (radiusXYSpiralIn > 0.01) {
          const tangentX = -y / radiusXYSpiralIn
          const tangentY = x / radiusXYSpiralIn
          const radialX = -x / radiusXYSpiralIn
          const radialY = -y / radiusXYSpiralIn
          dirX = tangentX * 0.7 + radialX * 0.5
          dirY = tangentY * 0.7 + radialY * 0.5
          dirZ = 0
        }
        break
      case "spiralOutward":
        const radiusXYSpiralOut = Math.sqrt(x * x + y * y)
        if (radiusXYSpiralOut > 0.01) {
          const tangentX = -y / radiusXYSpiralOut
          const tangentY = x / radiusXYSpiralOut
          const radialX = x / radiusXYSpiralOut
          const radialY = y / radiusXYSpiralOut
          dirX = tangentX * 0.7 + radialX * 0.5
          dirY = tangentY * 0.7 + radialY * 0.5
          dirZ = 0
        }
        break
      case "left":
        dirX = -1
        dirY = 0
        dirZ = 0
        break
      case "right":
        dirX = 1
        dirY = 0
        dirZ = 0
        break
      case "up":
        dirX = 0
        dirY = 1
        dirZ = 0
        break
      case "down":
        dirX = 0
        dirY = -1
        dirZ = 0
        break
      case "outward":
        const distFromCenterOut = Math.sqrt(x * x + y * y + z * z)
        if (distFromCenterOut > 0.01) {
          dirX = x / distFromCenterOut
          dirY = y / distFromCenterOut
          dirZ = z / distFromCenterOut
        }
        break
      case "inward":
        const distFromCenter = Math.sqrt(x * x + y * y + z * z)
        if (distFromCenter > 0.01) {
          dirX = -x / distFromCenter
          dirY = -y / distFromCenter
          dirZ = -z / distFromCenter
        }
        break
      case "breathing":
        const breathingRadius = Math.sqrt(x * x + y * y + z * z)
        if (breathingRadius > 0.01) {
          const breathingPhase = Math.sin(breathingPhaseRef.current)
          dirX = (x / breathingRadius) * breathingPhase
          dirY = (y / breathingRadius) * breathingPhase
          dirZ = (z / breathingRadius) * breathingPhase
        }
        break
      case "flocking":
        let alignX = 0,
          alignY = 0,
          alignZ = 0
        let cohesionX = 0,
          cohesionY = 0,
          cohesionZ = 0
        let separationX = 0,
          separationY = 0,
          separationZ = 0
        let neighborCount = 0
        const perceptionRadius = 1.0
        const maxNeighborsToCheck = 50 // Limit checks for performance

        // Sample every 100th particle instead of every 30th
        for (let j = 0; j < positions.length && neighborCount < maxNeighborsToCheck; j += 100) {
          if (j === i3) continue
          const dx = positions[j] - x
          const dy = positions[j + 1] - y
          const dz = positions[j + 2] - z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < perceptionRadius && dist > 0.01) {
            alignX += velocities[j]
            alignY += velocities[j + 1]
            alignZ += velocities[j + 2]

            cohesionX += dx
            cohesionY += dy
            cohesionZ += dz

            separationX -= dx / (dist * dist)
            separationY -= dy / (dist * dist)
            separationZ -= dz / (dist * dist)

            neighborCount++
          }
        }

        if (neighborCount > 0) {
          alignX /= neighborCount
          alignY /= neighborCount
          alignZ /= neighborCount
          cohesionX /= neighborCount
          cohesionY /= neighborCount
          cohesionZ /= neighborCount

          dirX = alignX * 0.3 + cohesionX * 0.2 + separationX * 0.5
          dirY = alignY * 0.3 + cohesionY * 0.2 + separationY * 0.5
          dirZ = alignZ * 0.3 + cohesionZ * 0.2 + separationZ * 0.5
        }
        break
      case "attractionWell":
        const attractDist = Math.sqrt(x * x + y * y + z * z)
        if (attractDist > 0.01) {
          const attractStrength = 1.0 / (attractDist * attractDist + 0.1)
          dirX = -(x / attractDist) * attractStrength
          dirY = -(y / attractDist) * attractStrength
          dirZ = -(z / attractDist) * attractStrength
        }
        break
      case "repulsionWell":
        const repulseDist = Math.sqrt(x * x + y * y + z * z)
        if (repulseDist > 0.01) {
          const repulseStrength = 1.0 / (repulseDist * repulseDist + 0.1)
          dirX = (x / repulseDist) * repulseStrength
          dirY = (y / repulseDist) * repulseStrength
          dirZ = (z / repulseDist) * repulseStrength
        }
        break
      case "shearHorizontal":
        dirX = y > 0 ? 1 : -1
        dirY = 0
        dirZ = 0
        break
      case "shearVertical":
        dirX = 0
        dirY = x > 0 ? -1 : 1
        dirZ = 0
        break
      case "jittery":
        dirX = (Math.random() - 0.5) * 2
        dirY = (Math.random() - 0.5) * 2
        dirZ = (Math.random() - 0.5) * 2
        break
      case "viscous":
        const viscousRadius = Math.sqrt(x * x + y * y + z * z)
        if (viscousRadius > 0.01) {
          dirX = -(x / viscousRadius) * 0.1
          dirY = -(y / viscousRadius) * 0.1
          dirZ = -(z / viscousRadius) * 0.1
        }
        break
      case "burst":
        const burstRadius = Math.sqrt(x * x + y * y + z * z)
        if (burstRadius > 0.01) {
          const burstPhase = Math.max(0, 1 - (burstTimerRef.current % 2.0) / 2.0)
          dirX = (x / burstRadius) * burstPhase * 3
          dirY = (y / burstRadius) * burstPhase * 3
          dirZ = (z / burstRadius) * burstPhase * 3
        }
        break
      case "orbitDrift":
        const orbitRadiusXY = Math.sqrt(x * x + y * y)
        if (orbitRadiusXY > 0.01) {
          const tangentX = -y / orbitRadiusXY
          const tangentY = x / orbitRadiusXY
          const driftX = -(x / orbitRadiusXY) * 0.1
          const driftY = -(y / orbitRadiusXY) * 0.1
          dirX = tangentX * 0.9 + driftX
          dirY = tangentY * 0.9 + driftY
          dirZ = 0
        }
        break
      case "maze":
        const mazeScale = 1.5
        const obstacleNoise = noise.noise(x * mazeScale, y * mazeScale, z * mazeScale)
        if (obstacleNoise > 0.3) {
          const gradX = noise.noise((x + 0.1) * mazeScale, y * mazeScale, z * mazeScale) - obstacleNoise
          const gradY = noise.noise(x * mazeScale, (y + 0.1) * mazeScale, z * mazeScale) - obstacleNoise
          const gradZ = noise.noise(x * mazeScale, y * mazeScale, (z + 0.1) * mazeScale) - obstacleNoise
          dirX = -gradX
          dirY = -gradY
          dirZ = -gradZ
        } else {
          dirX = 1
          dirY = 0
          dirZ = 0
        }
        break
      case "free":
      default:
        break
    }
    const isPlanar =
      params.flowPattern === "circular" ||
      params.flowPattern === "spiralInward" ||
      params.flowPattern === "spiralOutward" ||
      params.flowPattern === "orbitDrift"
    
    if (isPlanar) {
      const zSpringStrength = 0.3
      const zTarget = -3        // instead of 0 → move tunnel "into" the screen
      const zOffset = z - zTarget
      dirZ += -zOffset * zSpringStrength
    }

    return [dirX, dirY, dirZ]
  }

  useFrame((state, delta) => {
    if (!meshRef.current || !positionsRef.current || !velocitiesRef.current || !colorsRef.current) return

    const positions = positionsRef.current
    const velocities = velocitiesRef.current
    const colors = colorsRef.current

    let totalSpread = 0
    if (params.particleCount > 0) {
      let minX = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY
      let minZ = Number.POSITIVE_INFINITY,
        maxZ = Number.NEGATIVE_INFINITY

      for (let i = 0; i < Math.min(params.particleCount, 100); i++) {
        const i3 = i * 3
        minX = Math.min(minX, positions[i3])
        maxX = Math.max(maxX, positions[i3])
        minY = Math.min(minY, positions[i3 + 1])
        maxY = Math.max(maxY, positions[i3 + 1])
        minZ = Math.min(minZ, positions[i3 + 2])
        maxZ = Math.max(maxZ, positions[i3 + 2])
      }

      totalSpread = maxX - minX + (maxY - minY) + (maxZ - minZ)

      if (totalSpread < 0.1) {
        console.log(
          `[v0] CRITICAL: Particles collapsed! Spread: ${totalSpread.toFixed(4)}, Pattern: ${params.flowPattern}`,
        )
      }
    }

    // Apply qualitative parameter mappings to get effective technical values
    // Only override technical params if they're at defaults (indicating qualitative control)
    let effectiveParticleSize = params.particleSize
    let effectiveBrightness = params.brightness
    let effectiveSpeed = params.speed
    let effectiveNoiseScale = params.noiseScale
    let effectiveNoiseStrength = params.noiseStrength
    let effectiveTurbulence = params.turbulence
    let effectiveTimeScale = params.timeScale
    
    // Clarity affects particleSize and brightness (only if using qualitative)
    if (params.clarity !== undefined && params.particleSize === 0.03) {
      effectiveParticleSize = 0.005 + (1 - params.clarity) * 0.095 // High clarity = small particles
    }
    if (params.clarity !== undefined && params.brightness === 0.7) {
      effectiveBrightness = 0.2 + params.clarity * 0.8
    }
    
    // Intensity affects speed, brightness, and noiseStrength (only if using qualitative)
    if (params.intensity !== undefined && params.speed === 1.0) {
      effectiveSpeed = 0.1 + params.intensity * 4.9 // 0.1-5.0
    }
    if (params.intensity !== undefined && params.brightness === 0.7) {
      effectiveBrightness = 0.2 + params.intensity * 0.8
    }
    // Always apply intensity boost to noiseStrength (additive, not replacing)
    if (params.intensity !== undefined && params.intensity > 0.5) {
      const intensityBoost = 1.0 + (params.intensity - 0.5) * 0.2 // 1.0-1.1 multiplier (reduced from 1.0-1.2)
      effectiveNoiseStrength = effectiveNoiseStrength * intensityBoost
    }
    
    // Coherence affects turbulence, noiseStrength, and noiseScale (only if using qualitative)
    if (params.coherence !== undefined && params.turbulence === 0.5) {
      effectiveTurbulence = 0.01 + (1 - params.coherence) * 0.39 // 0.01-0.4 (reduced from 0.02-1.0)
    }
    if (params.coherence !== undefined && params.noiseScale === 1.0) {
      effectiveNoiseScale = 0.1 + (1 - params.coherence) * 1.9 // High coherence = smoother (lower scale)
    }
    
    // Stability affects timeScale (only if using qualitative)
    if (params.stability !== undefined && params.timeScale === 1.0) {
      effectiveTimeScale = 0.5 + (1 - params.stability) * 1.5 // High stability = slow time
    }
    
    // Sharpness affects noiseScale (only if using qualitative)
    if (params.sharpness !== undefined && params.noiseScale === 1.0) {
      effectiveNoiseScale = 0.1 + params.sharpness * 1.9
    }

    timeRef.current += delta * effectiveSpeed * effectiveTimeScale
    breathingPhaseRef.current += delta * effectiveSpeed * effectiveTimeScale * 2
    burstTimerRef.current += delta * effectiveSpeed * effectiveTimeScale

    if (transitionProgressRef.current < 1) {
      transitionProgressRef.current = Math.min(1, transitionProgressRef.current + delta / params.transitionSpeed)

      if (transitionProgressRef.current >= 1) {
        previousPatternRef.current = params.flowPattern
        console.log(`[v0] Pattern transition completed: ${params.flowPattern}`)
      }
    }

    const dummy = new THREE.Object3D()

    for (let i = 0; i < params.particleCount; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]

      const noiseValue1 = noise.noise(
        x * effectiveNoiseScale * params.flowDensity,
        y * effectiveNoiseScale * params.flowDensity,
        z * effectiveNoiseScale * params.flowDensity + timeRef.current,
      )

      const noiseValue2 = noise.noise(
        x * effectiveNoiseScale * params.flowDensity * 2 + 100,
        y * effectiveNoiseScale * params.flowDensity * 2 + 100,
        z * effectiveNoiseScale * params.flowDensity * 2 + 100 + timeRef.current,
      )

      const noiseValue3 = noise.noise(
        x * effectiveNoiseScale * params.flowDensity * 0.5 + 200,
        y * effectiveNoiseScale * params.flowDensity * 0.5 + 200,
        z * effectiveNoiseScale * params.flowDensity * 0.5 + 200 + timeRef.current,
      )

      let dirX = 0
      let dirY = 0
      let dirZ = 0

      if (transitionProgressRef.current < 1) {
        const [prevDirX, prevDirY, prevDirZ] = calculateDirection(
          previousPatternRef.current ?? "free",
          x,
          y,
          z,
          positions,
          velocities,
          i3,
          timeRef.current,
        )
        const [currDirX, currDirY, currDirZ] = calculateDirection(
          params.flowPattern ?? "free",
          x,
          y,
          z,
          positions,
          velocities,
          i3,
          timeRef.current,
        )

        const t = transitionProgressRef.current
        const easeT = t * t * (3 - 2 * t)

        if (previousPatternRef.current === "free") {
          dirX = noiseValue1 * (1 - easeT) + currDirX * easeT
          dirY = noiseValue2 * (1 - easeT) + currDirY * easeT
          dirZ = noiseValue3 * (1 - easeT) + currDirZ * easeT
        } else if ((params.flowPattern ?? "free") === "free") {
          dirX = prevDirX * (1 - easeT) + noiseValue1 * easeT
          dirY = prevDirY * (1 - easeT) + noiseValue2 * easeT
          dirZ = prevDirZ * (1 - easeT) + noiseValue3 * easeT
        } else {
          dirX = prevDirX * (1 - easeT) + currDirX * easeT
          dirY = prevDirY * (1 - easeT) + currDirY * easeT
          dirZ = prevDirZ * (1 - easeT) + currDirZ * easeT
        }
      } else {
        if ((params.flowPattern ?? "free") === "free") {
          dirX = noiseValue1
          dirY = noiseValue2
          dirZ = noiseValue3
        } else {
          ;[dirX, dirY, dirZ] = calculateDirection(
            params.flowPattern ?? "free",
            x,
            y,
            z,
            positions,
            velocities,
            i3,
            timeRef.current,
          )
        }
      }

      const noiseMagnitude = (Math.abs(noiseValue1) + Math.abs(noiseValue2) + Math.abs(noiseValue3)) / 3

      let vx, vy, vz
      if (
        params.flowPattern === "free" ||
        (transitionProgressRef.current < 1 && previousPatternRef.current === "free")
      ) {
        // Free mode: noise provides the direction; strength scales push; turbulence adds randomness
        vx = dirX * effectiveNoiseStrength + noiseValue2 * effectiveTurbulence
        vy = dirY * effectiveNoiseStrength + noiseValue3 * effectiveTurbulence
        vz = dirZ * effectiveNoiseStrength + noiseValue1 * effectiveTurbulence
      } else {
        // Directed modes: always push along the flow direction, independent of noise magnitude; randomness via turbulence
        vx = dirX * effectiveNoiseStrength + noiseValue2 * effectiveTurbulence
        vy = dirY * effectiveNoiseStrength + noiseValue3 * effectiveTurbulence
        vz = dirZ * effectiveNoiseStrength + noiseValue1 * effectiveTurbulence
      }

      const damping = params.flowPattern === "viscous" ? 0.6 : 0.7 // Increased damping from 0.7/0.8 to 0.6/0.7
      const weightDamping = 0.6 + (1 - (params.weight ?? 0.5)) * 0.2 // 0.6-0.8 (reduced from 0.7-0.9)
      const baseDamping = params.flowPattern === "viscous" ? 0.6 : weightDamping

      velocities[i3] = velocities[i3] * baseDamping + vx * (1 - baseDamping)
      velocities[i3 + 1] = velocities[i3 + 1] * baseDamping + vy * (1 - baseDamping)
      velocities[i3 + 2] = velocities[i3 + 2] * baseDamping + vz * (1 - baseDamping)

      positions[i3] += velocities[i3] * delta * effectiveSpeed
      positions[i3 + 1] += velocities[i3 + 1] * delta * effectiveSpeed
      positions[i3 + 2] += velocities[i3 + 2] * delta * effectiveSpeed

      const weightDrift = ((params.weight ?? 0.5) - 0.5) * 0.02 // -0.01 to +0.01
      positions[i3 + 1] += weightDrift * delta * effectiveSpeed

      const boundary = 15
      const distFromCenter = Math.sqrt(x * x + y * y + z * z)
      const radiusXY = Math.sqrt(x * x + y * y)

      // 🔽 new center-radius & camera-closeness logic
      const r2 = x * x + y * y

      // If very near the central axis at any Z, teleport far away so they cross back through
      const centerThreshold2 = 0.49 // r^2 for radius < 0.7
      const isRadialIn =
        params.flowPattern === "spiralInward" ||
        params.flowPattern === "inward" ||
        params.flowPattern === "attractionWell"
      const isRadialOut =
        params.flowPattern === "spiralOutward" ||
        params.flowPattern === "outward" ||
        params.flowPattern === "repulsionWell"

      if (r2 < centerThreshold2 && (isRadialIn || isRadialOut)) {
        if (isRadialOut) {
          // Send to screen edge, then a small inward kick so they traverse inward before spiraling out
          const angle = Math.random() * Math.PI * 2
          const edgeRadius = boundary - 0.5
          positions[i3] = Math.cos(angle) * edgeRadius
          positions[i3 + 1] = Math.sin(angle) * edgeRadius
          positions[i3 + 2] = -3 + (Math.random() - 0.5) * 1.5 // near tunnel band

          const rEdge = Math.sqrt(positions[i3] * positions[i3] + positions[i3 + 1] * positions[i3 + 1])
          if (rEdge > 0.001) {
            const rx = positions[i3] / rEdge
            const ry = positions[i3 + 1] / rEdge
            velocities[i3] = -rx * 0.2 + (Math.random() - 0.5) * 0.02
            velocities[i3 + 1] = -ry * 0.2 + (Math.random() - 0.5) * 0.02
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
          } else {
            velocities[i3] = 0
            velocities[i3 + 1] = 0
            velocities[i3 + 2] = 0
          }
        } else if (isRadialIn) {
          // Send to outer edge so they traverse inward
          const angle = Math.random() * Math.PI * 2
          const edgeRadius = boundary - 0.5
          positions[i3] = Math.cos(angle) * edgeRadius
          positions[i3 + 1] = Math.sin(angle) * edgeRadius
          positions[i3 + 2] = -3 + (Math.random() - 0.5) * 1.5

          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        }
        continue
      }

      const tooCloseToCamera = z > 4 && r2 < 4 // within radius ~2 around center

      const outOfBounds =
        Math.abs(x) > boundary || Math.abs(y) > boundary || Math.abs(z) > boundary

      if (tooCloseToCamera) {
        const spawnRadius = 2 + Math.random() * 3  // 2–5 units from center (much closer)
        const angle = Math.random() * Math.PI * 2

        positions[i3]     = Math.cos(angle) * spawnRadius
        positions[i3 + 1] = Math.sin(angle) * spawnRadius
        positions[i3 + 2] = -6 - Math.random() * 2 // way behind the origin

        velocities[i3] = 0
        velocities[i3 + 1] = 0
        velocities[i3 + 2] = 0
        continue
      } else if (outOfBounds) {
        // Respawn based on flow pattern
        switch (params.flowPattern) {
          case "inward":
          case "attractionWell":
          case "spiralInward":
            // Respawn at outer edge
            const angle1 = Math.random() * Math.PI * 2
            const edgeRadiusOB = boundary - 0.5
            positions[i3] = Math.cos(angle1) * edgeRadiusOB
            positions[i3 + 1] = Math.sin(angle1) * edgeRadiusOB
            positions[i3 + 2] = -3 + (Math.random() - 0.5) * 1.5
            break

          case "outward":
          case "repulsionWell":
          case "spiralOutward":
          case "burst":
            // Respawn near center
            const centerAngle1 = Math.random() * Math.PI * 2
            const centerAngle2 = Math.random() * Math.PI * 2
            const centerRadius = 0.5 + Math.random() * 0.5
            positions[i3] = Math.cos(centerAngle1) * Math.cos(centerAngle2) * centerRadius
            positions[i3 + 1] = Math.sin(centerAngle1) * Math.cos(centerAngle2) * centerRadius
            positions[i3 + 2] = Math.sin(centerAngle2) * centerRadius
            break

          case "left":
            // Respawn on right side
            positions[i3] = boundary - 0.5
            positions[i3 + 1] = (Math.random() - 0.5) * boundary * 2
            positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          case "right":
            // Respawn on left side
            positions[i3] = -boundary + 0.5
            positions[i3 + 1] = (Math.random() - 0.5) * boundary * 2
            positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          case "up":
            // Respawn on bottom
            positions[i3] = (Math.random() - 0.5) * boundary * 2
            positions[i3 + 1] = -boundary + 0.5
            positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          case "down":
            // Respawn on top
            positions[i3] = (Math.random() - 0.5) * boundary * 2
            positions[i3 + 1] = boundary - 0.5
            positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          case "circular":
          case "orbitDrift":
            // Respawn at target orbital radius
            const circleAngle = Math.random() * Math.PI * 2
            const targetRadius = boundary * (0.25 + (Math.random() - 0.5) * 0.1) // ~0.2–0.3 of boundary
            positions[i3] = Math.cos(circleAngle) * targetRadius
            positions[i3 + 1] = Math.sin(circleAngle) * targetRadius
            positions[i3 + 2] = -3 + (Math.random() - 0.5) * 2
            break

          case "breathing":
            // Respawn at mid-range radius
            const breathAngle1 = Math.random() * Math.PI * 2
            const breathAngle2 = Math.random() * Math.PI * 2
            const breathRadius = 3.2 + Math.random() * 1.6
            positions[i3] = Math.cos(breathAngle1) * Math.cos(breathAngle2) * breathRadius
            positions[i3 + 1] = Math.sin(breathAngle1) * Math.cos(breathAngle2) * breathRadius
            positions[i3 + 2] = Math.sin(breathAngle2) * breathRadius
            break

          case "shearHorizontal":
            // Respawn on opposite side horizontally
            if (x > boundary) {
              positions[i3] = -boundary + 0.5
            } else if (x < -boundary) {
              positions[i3] = boundary - 0.5
            }
            if (Math.abs(y) > boundary) positions[i3 + 1] = (Math.random() - 0.5) * boundary * 2
            if (Math.abs(z) > boundary) positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          case "shearVertical":
            // Respawn on opposite side vertically
            if (Math.abs(x) > boundary) positions[i3] = (Math.random() - 0.5) * boundary * 2
            if (y > boundary) {
              positions[i3 + 1] = -boundary + 0.5
            } else if (y < -boundary) {
              positions[i3 + 1] = boundary - 0.5
            }
            if (Math.abs(z) > boundary) positions[i3 + 2] = (Math.random() - 0.5) * boundary * 2
            break

          default:
            // For free, flocking, jittery, viscous, maze, and other patterns
            // Respawn randomly within bounds
            positions[i3] = (Math.random() - 0.5) * boundary * 1.8
            positions[i3 + 1] = (Math.random() - 0.5) * boundary * 1.8
            positions[i3 + 2] = (Math.random() - 0.5) * boundary * 1.8
            break
        }

        // Reset velocity on respawn
        velocities[i3] = 0
        velocities[i3 + 1] = 0
        velocities[i3 + 2] = 0
      }

      // Additional pattern-specific respawn logic for rotating/radial patterns
      if (!outOfBounds) {
        if (params.flowPattern === "circular" && (radiusXY < 0.7 || radiusXY > (boundary - 0.5))) {
          // Reduced minimum radius from 0.3 to 0.15 for tighter spiral
          const angle = Math.random() * Math.PI * 2
          const radius = 5.6 + Math.random() * 1.6
          positions[i3] = Math.cos(angle) * radius
          positions[i3 + 1] = Math.sin(angle) * radius
          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        } else if (params.flowPattern === "inward" && radiusXY < 0.7) {
          const angle1 = Math.random() * Math.PI * 2
          const angle2 = Math.random() * Math.PI * 2
          const outerRadius = boundary - 0.5
          positions[i3] = Math.cos(angle1) * Math.cos(angle2) * outerRadius
          positions[i3 + 1] = Math.sin(angle1) * Math.cos(angle2) * outerRadius
          positions[i3 + 2] = Math.sin(angle2) * outerRadius
          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        } else if (params.flowPattern === "outward" && radiusXY > (boundary - 0.5)) {
          const angle1 = Math.random() * Math.PI * 2
          const angle2 = Math.random() * Math.PI * 2
          const radius = 0.5 + Math.random() * 0.5
          positions[i3] = Math.cos(angle1) * Math.cos(angle2) * radius
          positions[i3 + 1] = Math.sin(angle1) * Math.cos(angle2) * radius
          positions[i3 + 2] = Math.sin(angle2) * radius
          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        } else if ((params.flowPattern === "spiralInward" || params.flowPattern === "inward" || params.flowPattern === "attractionWell") && radiusXY < 0.7) {
          // Teleport particles back to outer edge when they get too close to center
          const angle1 = Math.random() * Math.PI * 2
          const angle2 = Math.random() * Math.PI * 2
          const outerRadius = boundary - 0.5
          positions[i3] = Math.cos(angle1) * Math.cos(angle2) * outerRadius
          positions[i3 + 1] = Math.sin(angle1) * Math.cos(angle2) * outerRadius
          positions[i3 + 2] = Math.sin(angle2) * outerRadius
          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        } else if (params.flowPattern === "spiralOutward" && radiusXY > (boundary - 0.5)) {
          const angle1 = Math.random() * Math.PI * 2
          const angle2 = Math.random() * Math.PI * 2
          const radius = 0.5 + Math.random() * 0.5
          positions[i3] = Math.cos(angle1) * Math.cos(angle2) * radius
          positions[i3 + 1] = Math.sin(angle1) * Math.cos(angle2) * radius
          positions[i3 + 2] = Math.sin(angle2) * radius
          velocities[i3] = 0
          velocities[i3 + 1] = 0
          velocities[i3 + 2] = 0
        }
      }

      dummy.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      meshRef.current.setColorAt(i, new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]))
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <instancedMesh ref={meshRef} args={[undefined, undefined, params.particleCount]}>
        <sphereGeometry args={[params.particleSize, 8, 8]} />
        <meshBasicMaterial transparent opacity={params.opacity} />
      </instancedMesh>
      {params.showVectorField && <VectorField params={params} noise={noise} />}
    </>
  )
}
