import type React from "react"
import { ThemeProvider } from "next-themes"

export function Providers({
  children,
  defaultTheme,
  forcedTheme,
}: {
  children: React.ReactNode
  defaultTheme: string
  forcedTheme: string | null
}) {
  return (
    <ThemeProvider
      enableSystem
      disableTransitionOnChange
      attribute="class"
      defaultTheme={defaultTheme || "system"}
      forcedTheme={forcedTheme || undefined}
    >
      {children}
    </ThemeProvider>
  )
}
