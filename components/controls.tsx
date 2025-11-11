"use client"

import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"

interface ControlsProps {
  isRecording: boolean
  onToggle: () => void
}

export function Controls({ isRecording, onToggle }: ControlsProps) {
  return (
    <Button
      onClick={onToggle}
      size="lg"
      className={`
        ${isRecording
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-cyan-500 hover:bg-cyan-600 text-white"
        }
      `}
    >
      {isRecording ? (
        <>
          <MicOff className="w-5 h-5 mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic className="w-5 h-5 mr-2" />
          Start Recording
        </>
      )}
    </Button>
  )
}
