"use client"

import type { SimulationParams, FlowPattern } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ControlPanelProps {
  params: SimulationParams
  updateParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void
  updateQualitativeParam: (
    key: "clarity" | "intensity" | "density" | "stability" | "coherence" | "weight" | "sharpness",
    value: number,
  ) => void
}

export function ControlPanel({ params, updateParam, updateQualitativeParam }: ControlPanelProps) {
  return (
    <Card className="absolute top-4 right-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto bg-zinc-950/90 backdrop-blur-sm border-zinc-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-cyan-400 mb-1">Perlin Noise</h2>
        <p className="text-xs text-zinc-500">Adjust simulation parameters</p>
      </div>

      {/* Emotional Dimensions */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Emotional Dimensions</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="clarity" className="text-xs text-zinc-400">
              Clarity
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.clarity ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="clarity"
            min={0}
            max={1}
            step={0.01}
            value={[params.clarity ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("clarity", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">How clearly you know what you're feeling</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Particle Size (smaller), Brightness (brighter)</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="intensity" className="text-xs text-zinc-400">
              Intensity
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.intensity ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="intensity"
            min={0}
            max={1}
            step={0.01}
            value={[params.intensity ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("intensity", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">How strong/loud the feeling is</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Speed (faster), Brightness (brighter)</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="density" className="text-xs text-zinc-400">
              Quantity
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.density ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="density"
            min={0}
            max={1}
            step={0.01}
            value={[params.density ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("density", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">How much internal space it occupies</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Particle Count (more)</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="stability" className="text-xs text-zinc-400">
              Stability
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.stability ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="stability"
            min={0}
            max={1}
            step={0.01}
            value={[params.stability ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("stability", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">Steady vs flickering/changing</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Time Scale (slower)</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="coherence" className="text-xs text-zinc-400">
              Coherence
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.coherence ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="coherence"
            min={0}
            max={1}
            step={0.01}
            value={[params.coherence ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("coherence", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">One feeling vs multiple conflicting</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Turbulence (less), Noise Strength (less)</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="weight" className="text-xs text-zinc-400">
              Weight
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.weight ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="weight"
            min={0}
            max={1}
            step={0.01}
            value={[params.weight ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("weight", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">Light/floaty vs heavy/weighed down</p>
          <p className="text-[10px] text-zinc-500 font-mono">
            Affects: Speed (slower), Brightness (dimmer), Vertical Drift (down)
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sharpness" className="text-xs text-zinc-400">
              Sharpness
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{(params.sharpness ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            id="sharpness"
            min={0}
            max={1}
            step={0.01}
            value={[params.sharpness ?? 0.5]}
            onValueChange={([value]) => updateQualitativeParam("sharpness", value)}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600">Smooth curves vs spiky/jagged</p>
          <p className="text-[10px] text-zinc-500 font-mono">Affects: Noise Scale (higher/spikier)</p>
        </div>
      </div>

      {/* Particle Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Particle Settings</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="particleCount" className="text-xs text-zinc-400">
              Particle Count
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.particleCount}</span>
          </div>
          <Slider
            id="particleCount"
            min={100}
            max={5000}
            step={100}
            value={[params.particleCount]}
            onValueChange={([value]) => updateParam("particleCount", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="particleSize" className="text-xs text-zinc-400">
              Particle Size
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.particleSize.toFixed(3)}</span>
          </div>
          <Slider
            id="particleSize"
            min={0.005}
            max={0.1}
            step={0.005}
            value={[params.particleSize]}
            onValueChange={([value]) => updateParam("particleSize", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="brightness" className="text-xs text-zinc-400">
              Brightness
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.brightness.toFixed(2)}</span>
          </div>
          <Slider
            id="brightness"
            min={0.1}
            max={1.0}
            step={0.05}
            value={[params.brightness]}
            onValueChange={([value]) => updateParam("brightness", value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Animation Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Animation</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed" className="text-xs text-zinc-400">
              Speed
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.speed.toFixed(2)}</span>
          </div>
          <Slider
            id="speed"
            min={0}
            max={5.0}
            step={0.1}
            value={[params.speed]}
            onValueChange={([value]) => updateParam("speed", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="timeScale" className="text-xs text-zinc-400">
              Time Scale
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.timeScale.toFixed(2)}</span>
          </div>
          <Slider
            id="timeScale"
            min={0.05}
            max={2.0}
            step={0.05}
            value={[params.timeScale]}
            onValueChange={([value]) => updateParam("timeScale", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="transitionSpeed" className="text-xs text-zinc-400">
              Transition Speed
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.transitionSpeed.toFixed(2)}s</span>
          </div>
          <Slider
            id="transitionSpeed"
            min={0.1}
            max={5.0}
            step={0.1}
            value={[params.transitionSpeed]}
            onValueChange={([value]) => updateParam("transitionSpeed", value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Noise Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Noise Field</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showVectorField" className="text-xs text-zinc-400">
              Show Vector Field
            </Label>
            <input
              id="showVectorField"
              type="checkbox"
              checked={params.showVectorField}
              onChange={(e) => updateParam("showVectorField", e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="flowPattern" className="text-xs text-zinc-400">
            Flow Pattern
          </Label>
          <Select
            value={params.flowPattern}
            onValueChange={(value) => updateParam("flowPattern", value as FlowPattern)}
          >
            <SelectTrigger id="flowPattern" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free (Noise Direction)</SelectItem>
              <SelectItem value="circular">Circular</SelectItem>
              <SelectItem value="spiralInward">Spiral Inward</SelectItem>
              <SelectItem value="spiralOutward">Spiral Outward</SelectItem>
              <SelectItem value="breathing">Breathing/Tidal</SelectItem>
              <SelectItem value="orbitDrift">Orbit with Drift</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="up">Up</SelectItem>
              <SelectItem value="down">Down</SelectItem>
              <SelectItem value="shearHorizontal">Shear Horizontal</SelectItem>
              <SelectItem value="shearVertical">Shear Vertical</SelectItem>
              <SelectItem value="outward">Outward (Radial)</SelectItem>
              <SelectItem value="inward">Inward (Radial)</SelectItem>
              <SelectItem value="attractionWell">Attraction Well</SelectItem>
              <SelectItem value="repulsionWell">Repulsion Well</SelectItem>
              <SelectItem value="burst">Burst/Shockwave</SelectItem>
              <SelectItem value="flocking">Flocking/Swarming</SelectItem>
              <SelectItem value="jittery">Jittery/Static</SelectItem>
              <SelectItem value="viscous">Viscous/Sticky</SelectItem>
              <SelectItem value="maze">Maze/Obstacles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="noiseScale" className="text-xs text-zinc-400">
              Noise Scale
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.noiseScale.toFixed(2)}</span>
          </div>
          <Slider
            id="noiseScale"
            min={0.1}
            max={2.0}
            step={0.05}
            value={[params.noiseScale]}
            onValueChange={([value]) => updateParam("noiseScale", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="noiseStrength" className="text-xs text-zinc-400">
              Noise Strength
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.noiseStrength.toFixed(2)}</span>
          </div>
          <Slider
            id="noiseStrength"
            min={0}
            max={5.0}
            step={0.1}
            value={[params.noiseStrength]}
            onValueChange={([value]) => updateParam("noiseStrength", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="flowDensity" className="text-xs text-zinc-400">
              Flow Density
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.flowDensity.toFixed(2)}</span>
          </div>
          <Slider
            id="flowDensity"
            min={0.1}
            max={3.0}
            step={0.1}
            value={[params.flowDensity]}
            onValueChange={([value]) => updateParam("flowDensity", value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="turbulence" className="text-xs text-zinc-400">
              Turbulence
            </Label>
            <span className="text-xs text-cyan-400 font-mono">{params.turbulence.toFixed(2)}</span>
          </div>
          <Slider
            id="turbulence"
            min={0.0}
            max={2.0}
            step={0.1}
            value={[params.turbulence]}
            onValueChange={([value]) => updateParam("turbulence", value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Color Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Colors</h3>

        <div className="space-y-2">
          <Label htmlFor="primaryColor" className="text-xs text-zinc-400">
            Primary Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              type="color"
              value={params.primaryColor}
              onChange={(e) => updateParam("primaryColor", e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={params.primaryColor}
              onChange={(e) => updateParam("primaryColor", e.target.value)}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor" className="text-xs text-zinc-400">
            Secondary Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="secondaryColor"
              type="color"
              value={params.secondaryColor}
              onChange={(e) => updateParam("secondaryColor", e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={params.secondaryColor}
              onChange={(e) => updateParam("secondaryColor", e.target.value)}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backgroundColor" className="text-xs text-zinc-400">
            Background Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="backgroundColor"
              type="color"
              value={params.backgroundColor}
              onChange={(e) => updateParam("backgroundColor", e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={params.backgroundColor}
              onChange={(e) => updateParam("backgroundColor", e.target.value)}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
