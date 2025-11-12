"use client"

import { SessionProvider } from "next-auth/react"

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
