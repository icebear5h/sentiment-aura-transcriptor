"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement NextAuth registration
    // For now, just redirect to record page
    router.push("/record")
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black flex items-center justify-center">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-purple-950/20" />

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Brain className="w-10 h-10 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Memory Machine</h1>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-white">Create Account</h2>
            <p className="text-white/60">Start visualizing your conversations</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/90">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white" size="lg">
              Create Account
            </Button>
          </form>

          <div className="text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
