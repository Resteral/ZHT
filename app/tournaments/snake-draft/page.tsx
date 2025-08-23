"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Calendar, Trophy, Users, Crown, Clock, Target, ArrowRight, Zap } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface TournamentPhase {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: "upcoming" | "active" | "completed"
  max_participants: number
  current_participants: number
}

interface LeaderboardEntry {
  rank: number
  username: string
  wins: number
  losses: number
  points: number
  elo_rating: number
  recent_form: string[]
}

export default function SnakeDraftTournamentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState(false)
  const [tournamentPhases, setTournamentPhases] = useState<TournamentPhase[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    loadTournamentData()
  }, [])

  const loadTournamentData = async () => {
    try {
      // Load tournament phases
      const phases: TournamentPhase[] = [
        {
          id: "week1",
          name: "Week 1: Qualification Rounds",
          description: "Initial snake drafts to determine seeding",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          max_participants: 64,
          current_participants: 42,
        },
        {
          id: "week2",
          name: "Week 2: Group Stage",
          description: "Round-robin matches within groups",
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 32,
          current_participants: 0,
        },
        {
          id: "week3",
          name: "Week 3: Knockout Stage",
          description: "Single elimination bracket",
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 16,
          current_participants: 0,
        },
        {
          id: "week4",
          name: "Week 4: Championship Finals",
          description: "Final matches and championship",
          start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 8,
          current_participants: 0,
        },
      ]

      // Load leaderboard data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          username: "DraftMaster",
          wins: 12,
          losses: 2,
          points: 1240,
          elo_rating: 1850,
          recent_form: ["W", "W", "W", "L", "W"],
        },
        {
          rank: 2,
          username: "SnakeCharmer",
          wins: 11,
          losses: 3,
          points: 1180,
          elo_rating: 1820,
          recent_form: ["W", "W", "L", "W", "W"],
        },
        {
          rank: 3,
          username: "CaptainPick",
          wins: 10,
          losses: 4,
          points: 1120,
          elo_rating: 1790,
          recent_form: ["L", "W", "W", "W", "L"],
        },
      ]

      setTournamentPhases(phases)
      setLeaderboard(mockLeaderboard)
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading tournament data:", error)
      setLoading(false)
    }
  }

  const handleRegistration = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const { monthLongTournamentService } = await import("@/lib/services/month-long-tournament-service")
      await monthLongTournamentService.joinMonthLongTournament("snake_draft_championship", user.id)
      setIsRegistered(true)
      console.log("[v0] User registered for snake draft tournament")
    } catch (error) {
      console.error("[v0] Error registering for tournament:", error)
    }
  }

  const joinDraftRoom = () => {
    router.push("/draft?type=snake")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPhaseProgress = (phase: TournamentPhase) => {
    return (phase.current_participants / phase.max_participants) * 100
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Snake Draft Championship
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join the ultimate month-long snake draft tournament. Strategic picks, intense competition, and massive rewards
          await.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Trophy className="h-4 w-4 mr-1" />
            $10,000 Prize Pool
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Users className="h-4 w-4 mr-1" />
            64 Players Max
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Calendar className="h-4 w-4 mr-1" />4 Week Tournament
          </Badge>
        </div>
      </div>

      {/* Registration Card */}
      {!isRegistered && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Ready to Draft Your Way to Victory?</h3>
              <p className="text-emerald-700">
                Registration is open for the Snake Draft Championship. Secure your spot before it fills up!
              </p>
              <Button
                onClick={handleRegistration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-lg"
              >
                Register Now - Free Entry
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tournament Phases */}
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-600" />
              Tournament Phases
            </h2>
            {tournamentPhases.map((phase, index) => (
              <Card
                key={phase.id}
                className={`border-l-4 ${
                  phase.status === "active"
                    ? "border-l-emerald-500 bg-emerald-50"
                    : phase.status === "completed"
                      ? "border-l-gray-400 bg-gray-50"
                      : "border-l-blue-500 bg-blue-50"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Badge
                        variant={
                          phase.status === "active" ? "default" : phase.status === "completed" ? "secondary" : "outline"
                        }
                      >
                        {phase.status === "active" ? "Live" : phase.status === "completed" ? "Done" : "Soon"}
                      </Badge>
                      {phase.name}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{phase.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Participants</span>
                      <span>
                        {phase.current_participants}/{phase.max_participants}
                      </span>
                    </div>
                    <Progress value={getPhaseProgress(phase)} className="h-2" />
                  </div>
                  {phase.status === "active" && isRegistered && (
                    <Button onClick={joinDraftRoom} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                      Join Draft Room
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-emerald-600" />
            Tournament Schedule
          </h2>
          <div className="grid gap-4">
            {tournamentPhases.map((phase) => (
              <Card key={phase.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatDate(phase.start_date)}</div>
                      <div className="text-sm text-muted-foreground">to {formatDate(phase.end_date)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-emerald-600" />
            Current Standings
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {entry.username}
                          {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.wins}W - {entry.losses}L • ELO: {entry.elo_rating}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{entry.points} pts</div>
                      <div className="flex gap-1 mt-1">
                        {entry.recent_form.map((result, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full text-xs flex items-center justify-center text-white ${
                              result === "W" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          >
                            {result}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-600" />
            Tournament Rules
          </h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Snake Draft Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Captains are selected based on ELO ratings (highest and lowest become captains)</p>
                <p>• Lower ELO captain gets first pick advantage</p>
                <p>• Draft order follows snake pattern: 1-2-2-1-1-2-2-1...</p>
                <p>• Each team must have equal number of players</p>
                <p>• Draft timer: 60 seconds per pick</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scoring System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Win: +100 points</p>
                <p>• Loss: +25 points (participation)</p>
                <p>• MVP Performance: +50 bonus points</p>
                <p>• Perfect Draft (all picks perform well): +25 bonus points</p>
                <p>• ELO changes affect final standings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• 1st Place: $5,000</p>
                <p>• 2nd Place: $2,500</p>
                <p>• 3rd Place: $1,500</p>
                <p>• 4th-8th Place: $250 each</p>
                <p>• Weekly MVP Awards: $100 each</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
