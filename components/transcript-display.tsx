"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface TranscriptDisplayProps {
  transcript: string[]
  isRecording: boolean
  className?: string
}

export function TranscriptDisplay({ transcript, isRecording, className }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div
      className={cn(
        "flex flex-col bg-black/10 rounded-xl overflow-hidden border border-white/10",
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-300",
              isRecording ? "bg-cyan-400 animate-pulse" : "bg-white/30",
            )}
          />
          <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider drop-shadow-lg">
            Live Transcript
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50 scrollbar-track-transparent"
      >
        {transcript.length === 0 && !isRecording && (
          <p className="text-white/40 text-sm drop-shadow-lg">Click Start to begin recording...</p>
        )}

        {transcript.map((text, index) => (
          <div
            key={index}
            className="text-white/80 text-base leading-relaxed drop-shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
