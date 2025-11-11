"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface KeywordsDisplayProps {
  keywords: string[]
}

export function KeywordsDisplay({ keywords }: KeywordsDisplayProps) {
  const [displayedKeywords, setDisplayedKeywords] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Show keywords immediately with no delay
  useEffect(() => {
    setDisplayedKeywords(keywords)
  }, [keywords])

  // Auto-scroll to bottom when new keywords arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedKeywords])

  // Remove duplicates and get unique keywords
  const uniqueKeywords = Array.from(new Set(displayedKeywords))

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black/10 rounded-xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="px-6 py-4">
        <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider drop-shadow-lg">Key Topics</h2>
      </div>

      {/* Keywords Content - Fixed height scrollable area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50 scrollbar-track-transparent"
      >
        {uniqueKeywords.length === 0 ? (
          <p className="text-white/40 text-sm drop-shadow-lg">Keywords will appear here...</p>
        ) : (
          <>
            {uniqueKeywords.map((keyword, index) => (
              <div
                key={`${keyword}-${index}`}
                className={cn(
                  "px-4 py-2 rounded-full inline-block",
                  "bg-gradient-to-r from-cyan-500/20 to-blue-500/20",
                  "border border-cyan-400/30",
                  "text-cyan-100/80 text-sm font-medium",
                  "animate-in fade-in slide-in-from-bottom-2 duration-500",
                  "hover:scale-105 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10",
                  "transition-all cursor-default",
                  "drop-shadow-lg",
                  "mr-2 mb-2",
                )}
              >
                {keyword}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
