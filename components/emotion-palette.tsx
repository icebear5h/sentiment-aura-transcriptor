"use client"

import { Card } from "@/components/ui/card"

interface EmotionPaletteProps {
  onEmotionSelect: (emotion: string, primaryColor: string, secondaryColor: string) => void
}

const emotions = [
  { name: "Joy", primary: "#FFD700", secondary: "#FFA500" }, // golden yellow + orange
  { name: "Trust", primary: "#20B2AA", secondary: "#3CB371" }, // green-teal + medium sea green
  { name: "Fear", primary: "#2F4F4F", secondary: "#1E3A5F" }, // dark green/blue + dark blue
  { name: "Surprise", primary: "#00CED1", secondary: "#87CEEB" }, // light cyan + sky blue
  { name: "Sadness", primary: "#191970", secondary: "#000080" }, // deep blue + navy
  { name: "Disgust", primary: "#556B2F", secondary: "#6B8E23" }, // murky green + olive drab
  { name: "Anger", primary: "#DC143C", secondary: "#8B0000" }, // red + dark red
  { name: "Anticipation", primary: "#FF8C00", secondary: "#FF6347" }, // orange + tomato
]

export function EmotionPalette({ onEmotionSelect }: EmotionPaletteProps) {
  return (
    <Card className="absolute top-4 left-4 w-48 bg-zinc-950/90 backdrop-blur-sm border-zinc-800 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-cyan-400 mb-1">Emotions</h2>
        <p className="text-[10px] text-zinc-500">Color presets</p>
      </div>

      <div className="space-y-2">
        {emotions.map((emotion) => (
          <button
            key={emotion.name}
            onClick={() => {
              console.log(`[Perlin Noise] Emotion selected: ${emotion.name}`)
              onEmotionSelect(emotion.name, emotion.primary, emotion.secondary)
            }}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm border border-zinc-700" style={{ backgroundColor: emotion.primary }} />
              <div
                className="w-4 h-4 rounded-sm border border-zinc-700"
                style={{ backgroundColor: emotion.secondary }}
              />
            </div>
            <span className="text-xs text-zinc-300 group-hover:text-cyan-400 transition-colors">{emotion.name}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}
