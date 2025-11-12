"use client"

import { motion, AnimatePresence, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface KeywordsDisplayProps {
  keywords: string[]
}

export function KeywordsDisplay({ keywords }: KeywordsDisplayProps) {
  const uniqueKeywords = Array.from(new Set(keywords))

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 },
    },
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-black/10 rounded-xl overflow-hidden border border-white/10">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Key Topics</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 scrollbar-track-transparent">
        {uniqueKeywords.length === 0 ? (
          <p className="text-white/40 text-sm">Keywords will appear here...</p>
        ) : (
          <motion.div
            className="flex flex-wrap gap-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {uniqueKeywords.map((keyword, index) => (
                <motion.div
                  key={`${keyword}-${index}`}
                  layout
                  variants={itemVariants}
                  className={cn(
                    "px-4 py-2 rounded-full inline-block",
                    "bg-gradient-to-r from-cyan-500/20 to-blue-500/20",
                    "border border-cyan-400/30",
                    "text-cyan-100/80 text-sm font-medium",
                    "hover:scale-105 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10",
                    "transition-all cursor-default",
                  )}
                >
                  {keyword}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
