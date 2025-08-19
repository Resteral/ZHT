"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Share2, Eye, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function MatchCreatedSuccessPage() {
  const searchParams = useSearchParams()
  const [matchType, setMatchType] = useState<string>("")
  const [matchId] = useState("WM-" + Math.random().toString(36).substr(2, 9).toUpperCase())

  useEffect(() => {
    const type = searchParams.get("type") || "match"
    setMatchType(type)
  }, [searchParams])

  const getMatchTypeInfo = () => {
    switch (matchType) {
      case "wager":
        return {
          title: "Wager Match Created!",
          description: "Your 1v1 wager match is now live and waiting for an opponent",
          icon: "⚔️",
          earning: "75% of pot to winner",
        }
      case "tournament":
        return {
          title: "Tournament Created!",
          description: "Your tournament is now open for registration",
          icon: "🏆",
          earning: "$25 participation + prizes",
        }
      default:
        return {
          title: "Match Created!",
          description: "Your match is now live",
          icon: "🎮",
          earning: "$100 per ELO game",
        }
    }
  }

  const matchInfo = getMatchTypeInfo()

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-600">{matchInfo.title}</h1>
            <p className="text-muted-foreground">{matchInfo.description}</p>
          </div>
        </div>

        {/* Match Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{matchInfo.icon}</span>
              Match ID: {matchId}
            </CardTitle>
            <CardDescription>Your match is now live and ready for players</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-green-500" />
                <div>
                  <div className="font-medium">Earning Potential</div>
                  <div className="text-sm text-muted-foreground">{matchInfo.earning}</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="font-medium">0/2</div>
                <div className="text-xs text-muted-foreground">Players Joined</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="font-medium">0</div>
                <div className="text-xs text-muted-foreground">Spectators</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your match or create another one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" asChild>
              <Link href={`/matches/${matchId}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Match Details
              </Link>
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              <Share2 className="h-4 w-4 mr-2" />
              Share Match Link
            </Button>
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <Link href="/matches/create">Create Another Match</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center pt-6">
          <Button asChild size="lg">
            <Link href="/leagues">Back to Matches</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
