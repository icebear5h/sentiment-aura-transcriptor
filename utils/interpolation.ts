/**
 * Interpolation utilities for smooth transitions
 */

/**
 * Interpolate between two hex colors
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
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

/**
 * Interpolate between two numbers
 */
export function interpolateNumber(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Ease-in-out function for smooth transitions
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}
