"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Clock, DollarSign, Share2, Settings } from "lucide-react"
import Link from "next/link"

interface MatchDetailsPageProps {
  params: {
    id: string
  }
}

export default function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const [match] = useState({
    id: params.id,
    name: "High Stakes 1v1 Battle",
    type: "wager_match",
    game: "StarCraft II",
    status: "waiting",
    wagerAmount: 100,
    winnerPayout: 75,
    creator: "ProGamer_2024",
    createdAt: "2024-03-15T10:30:00Z",
    description: "Serious players only. Best of 3 matches.",
    players: [{ id: "1", username: "ProGamer_2024", status: "ready" }],
    maxPlayers: 2,
  })

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{match.name}</h1>
            <p className="text-muted-foreground">Match ID: {match.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Match Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Match Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Match Status</CardTitle>
                  <Badge variant={match.status === "waiting" ? "secondary" : "default"}>
                    {match.status === "waiting" ? "Waiting for Players" : match.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Game</div>
                    <div className="font-medium">{match.game}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Match Type</div>
                    <div className="font-medium">1v1 Wager Match</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Wager Amount</div>
                    <div className="font-bold text-lg">${match.wagerAmount}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Winner Payout</div>
                    <div className="font-bold text-lg text-green-500">${match.winnerPayout}</div>
                  </div>
                </div>

                {match.description && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-muted-foreground">Description</div>
                    <div className="text-sm bg-muted p-3 rounded-lg">{match.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Players */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({match.players.length}/{match.maxPlayers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {match.players.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{player.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {player.id === "1" ? "Match Creator" : "Challenger"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={player.status === "ready" ? "default" : "secondary"}>{player.status}</Badge>
                    </div>
                  ))}

                  {match.players.length < match.maxPlayers && (
                    <div className="flex items-center justify-between p-3 border-2 border-dashed rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">?</div>
                        <div>
                          <div className="font-medium text-muted-foreground">Waiting for opponent...</div>
                          <div className="text-xs text-muted-foreground">Open slot</div>
                        </div>
                      </div>
                      <Button size="sm">Join Match</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="text-sm font-medium">{new Date(match.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Pool</span>
                  </div>
                  <span className="text-sm font-medium">${match.wagerAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Players</span>
                  </div>
                  <span className="text-sm font-medium">
                    {match.players.length}/{match.maxPlayers}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {match.players.length < match.maxPlayers && <Button className="w-full">Join This Match</Button>}
                <Button variant="outline" className="w-full bg-transparent">
                  Watch Live
                </Button>
                <Button variant="outline" className="w-full bg-transparent">
                  Share Match
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
