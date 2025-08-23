"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Medal, ArrowRight, Gamepad2 } from "lucide-react"
import Link from "next/link"

export default function SnakeDraftRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/leagues")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="container mx-auto py-12 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <Medal className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ELO Draft Lobbies Moved
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ELO draft lobbies are now located in the <strong>Leagues</strong> section for better organization and easier
          access.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Gamepad2 className="h-6 w-6 text-blue-600" />
              Find ELO Lobbies in Leagues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">All ELO draft lobby functionality including:</p>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>1v1 to 6v6 ELO lobbies</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Real-time matchmaking</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>$10-$50 per game rewards</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>ELO-based divisions</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/leagues">
                  <Medal className="h-5 w-5 mr-2" />
                  Go to Leagues
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">Redirecting automatically in 3 seconds...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
