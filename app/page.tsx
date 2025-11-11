"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, Mic, Sparkles, Lock } from "lucide-react"

export default function HomePage() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-purple-950/20" />

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 py-20 pt-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Brain className="w-12 h-12 text-cyan-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Memory Machine
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl text-white/80 leading-relaxed">
            Transform your conversations into living, breathing sentiment visualizations
          </p>

          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Experience real-time AI-powered sentiment analysis through stunning Perlin noise fields. Watch your words
            come alive as emotions flow across the canvas.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 pt-8">
            <Link href="/auth/login">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-6 text-lg">
                <Lock className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-6 text-lg bg-transparent"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Mic className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Real-Time Recording</h3>
              <p className="text-white/60">Capture your voice and watch as AI transcribes and analyzes in real-time</p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sentiment Visualization</h3>
              <p className="text-white/60">
                Beautiful Perlin noise fields that react to the emotional tone of your speech
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Brain className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Insights</h3>
              <p className="text-white/60">Extract key topics and sentiment patterns from your conversations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
