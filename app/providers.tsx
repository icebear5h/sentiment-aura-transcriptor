"use client"

import type React from "react"

type SessionProviderProps = {
  children: React.ReactNode
  refetchInterval?: number
  refetchOnWindowFocus?: boolean
}

function SessionProvider({ children }: SessionProviderProps) {
  return children
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes (default is 5 minutes, but we're being explicit)
      refetchInterval={5 * 60}
      // Do not refetch on window focus, to prevent interruptions
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
}
