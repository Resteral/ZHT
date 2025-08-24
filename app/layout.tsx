import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navigation } from "@/components/navigation"
import { AuthProvider } from "@/lib/auth-context"
import { DraftAlertProvider } from "@/lib/contexts/draft-alert-context"
import DraftScreenOverlay from "@/components/draft-alert/draft-screen-overlay"
import { LobbyAlertSystem } from "@/components/global/lobby-alert-system"
import { ActiveDraftTracker } from "@/components/navigation/active-draft-tracker"
import ActiveMatchNotification from "@/components/navigation/active-match-notification"
import MonacoEnvironment from "@/components/monaco-environment"

export const metadata: Metadata = {
  title: "TUG E-Sports Lobbies",
  description: "Premier ELO-based e-sports lobbies with competitive gaming, betting, and analytics",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <DraftAlertProvider>
              <MonacoEnvironment />
              <div className="min-h-screen bg-background">
                <Navigation />
                <main className="pt-16">{children}</main>
                <DraftScreenOverlay />
                <LobbyAlertSystem />
                <ActiveDraftTracker />
                <ActiveMatchNotification />
              </div>
            </DraftAlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
