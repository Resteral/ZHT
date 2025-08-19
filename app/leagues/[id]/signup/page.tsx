"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Users, DollarSign, Trophy, Clock, CheckCircle } from "lucide-react"
import { useParams, notFound } from "next/navigation"

interface League {
  id: string
  name: string
  description: string
  league_type: string
  max_teams: number
  entry_fee: number
  prize_pool: number
  draft_type: string
  status: string
  draft_date: string
  season_start: string
  participant_count: number
}

export default function LeagueSignupPage() {
  const params = useParams()
  const leagueId = params.id as string
  const [league, setLeague] = useState<League | null>(null)
  const [teamName, setTeamName] = useState("")
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [userBalance] = useState(1247.5) // Would come from user context

  useEffect(() => {
    loadLeague()
  }, [leagueId])

  const loadLeague = async () => {
    try {
      // Mock data - would fetch from API
      if (!leagueId || leagueId === "invalid") {
        notFound()
        return
      }

      setLeague({
        id: leagueId,
        name: "Championship Fantasy League",
        description: "Premier fantasy league with weekly matchups and playoffs",
        league_type: "fantasy",
        max_teams: 12,
        entry_fee: 50,
        prize_pool: 500,
        draft_type: "auction",
        status: "registration",
        draft_date: "2024-03-20T19:00:00Z",
        season_start: "2024-03-25T00:00:00Z",
        participant_count: 8,
      })
    } catch (error) {
      console.error("Error loading league:", error)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  const handleJoinLeague = async () => {
    if (!teamName.trim()) return

    setJoining(true)
    try {
      // API call to join league
      console.log(`Joining league ${leagueId} with team name: ${teamName}`)
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error joining league:", error)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Loading league...</div>
  }

  if (!league) {
    notFound()
  }

  const canAffordEntry = true // Always allow regardless of balance
  const spotsRemaining = 999 // Always show spots available
  const canJoin = true // Always allow joining

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{league.name}</h1>
        <p className="text-muted-foreground">{league.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* League Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>League Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teams</p>
                    <p className="font-medium">
                      {league.participant_count}/{league.max_teams}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entry Fee</p>
                    <p className="font-medium">${league.entry_fee}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prize Pool</p>
                    <p className="font-medium">${league.prize_pool}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Draft Type</p>
                    <p className="font-medium capitalize">{league.draft_type}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Draft Date</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(league.draft_date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Season Start</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(league.season_start).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Available Spots</span>
                  <Badge variant="secondary">Open Registration</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Current Participants ({league.participant_count})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: league.participant_count }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>T{i + 1}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Team {i + 1}</p>
                      <p className="text-sm text-muted-foreground">@user{i + 1}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signup Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Join League</CardTitle>
              <CardDescription>Enter your team name to join - everyone welcome!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Entry Fee:</span>
                  <span className="font-medium">${league.entry_fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Your Balance:</span>
                  <span className="font-medium text-green-500">${userBalance.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleJoinLeague} disabled={joining} className="w-full">
                {joining ? "Joining..." : `Join League - $${league.entry_fee}`}
              </Button>
            </CardContent>
          </Card>

          {/* League Rules */}
          <Card>
            <CardHeader>
              <CardTitle>League Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• {league.draft_type === "auction" ? "Auction draft" : "Snake draft"} format</p>
              <p>• Weekly head-to-head matchups</p>
              <p>• Top 6 teams make playoffs</p>
              <p>• Winner takes 60% of prize pool</p>
              <p>• Entry fee must be paid before draft</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
