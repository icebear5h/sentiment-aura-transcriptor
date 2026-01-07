import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, Sparkles } from "lucide-react"

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Brain className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Sentiment Aura
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Link href="/perlin">
                <Sparkles className="w-4 h-4" />
                Open Visualizer
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
