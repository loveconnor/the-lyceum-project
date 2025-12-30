import type React from "react"
import type { Viewport } from "next"
import { Geist } from "next/font/google"
import { Providers } from "@/context"
import { Header } from "@/components/header"
import { MeshGradientComponent } from "@/components/mesh-gradient"
import { siteConfig } from "@/lib/config"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
})

export const viewport: Viewport = {
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { settings } = siteConfig

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased max-w-screen min-h-svh bg-slate-1 text-slate-12`}>
        <Providers defaultTheme={settings.defaultTheme} forcedTheme={settings.forcedTheme}>
          <MeshGradientComponent
            lightColors={settings.background.lightColors}
            darkColors={settings.background.darkColors}
            speed={settings.background.speed}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 0,
              width: "100%",
              height: "100%",
            }}
          />
          <div className="max-w-screen-sm mx-auto w-full relative z-[1] flex flex-col min-h-screen">
            <div className="px-5 gap-8 flex flex-col flex-1 py-[12vh]">
              <Header />
              <main className="flex justify-center">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
