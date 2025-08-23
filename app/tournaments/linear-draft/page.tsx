"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Calendar, Trophy, Users, Crown, Clock, Target, ArrowRight, BarChart3 } from "lucide-react"
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
  draft_position: number
}

export default function LinearDraftTournamentPage() {
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
          name: "Week 1: Draft Position Seeding",
          description: "Qualification matches to determine draft order",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          max_participants: 48,
          current_participants: 36,
        },
        {
          id: "week2",
          name: "Week 2: Linear Draft Rounds",
          description: "Multiple linear draft sessions with consistent pick order",
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 24,
          current_participants: 0,
        },
        {
          id: "week3",
          name: "Week 3: Position Playoffs",
          description: "Bracket play based on draft position performance",
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 12,
          current_participants: 0,
        },
        {
          id: "week4",
          name: "Week 4: Linear Draft Masters",
          description: "Final championship with optimal draft positions",
          start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: "upcoming",
          max_participants: 6,
          current_participants: 0,
        },
      ]

      // Load leaderboard data with draft positions
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          username: "LinearLegend",
          wins: 14,
          losses: 1,
          points: 1420,
          elo_rating: 1890,
          recent_form: ["W", "W", "W", "W", "L"],
          draft_position: 3,
        },
        {
          rank: 2,
          username: "FirstPickPro",
          wins: 13,
          losses: 2,
          points: 1350,
          elo_rating: 1860,
          recent_form: ["W", "L", "W", "W", "W"],
          draft_position: 1,
        },
        {
          rank: 3,
          username: "PositionPlayer",
          wins: 12,
          losses: 3,
          points: 1290,
          elo_rating: 1830,
          recent_form: ["W", "W", "L", "W", "W"],
          draft_position: 2,
        },
        {
          rank: 4,
          username: "LastPickLuck",
          wins: 11,
          losses: 4,
          points: 1220,
          elo_rating: 1800,
          recent_form: ["L", "W", "W", "L", "W"],
          draft_position: 6,
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
      await monthLongTournamentService.joinMonthLongTournament("linear_draft_masters", user.id)
      setIsRegistered(true)
      console.log("[v0] User registered for linear draft tournament")
    } catch (error) {
      console.error("[v0] Error registering for tournament:", error)
    }
  }

  const joinDraftRoom = () => {
    router.push("/draft?type=linear")
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

  const getDraftPositionColor = (position: number) => {
    const colors = [
      "bg-red-100 text-red-700 border-red-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-yellow-100 text-yellow-700 border-yellow-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-purple-100 text-purple-700 border-purple-200",
    ]
    return colors[position - 1] || "bg-gray-100 text-gray-700 border-gray-200"
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Linear Draft Masters
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Master the art of consistent draft positioning. Same order every round - strategy and skill determine success.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Trophy className="h-4 w-4 mr-1" />
            $8,000 Prize Pool
          </Badge>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            <Users className="h-4 w-4 mr-1" />
            48 Players Max
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Calendar className="h-4 w-4 mr-1" />4 Week Tournament
          </Badge>
        </div>
      </div>

      {/* Registration Card */}
      {!isRegistered && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-blue-800">Ready to Master Linear Drafting?</h3>
              <p className="text-blue-700">
                Join the Linear Draft Masters tournament. Consistent pick order, maximum strategy!
              </p>
              <Button
                onClick={handleRegistration}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
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
              <Calendar className="h-6 w-6 text-blue-600" />
              Tournament Phases
            </h2>
            {tournamentPhases.map((phase, index) => (
              <Card
                key={phase.id}
                className={`border-l-4 ${
                  phase.status === "active"
                    ? "border-l-blue-600 bg-blue-100" // Darkened from blue-500/blue-50 to blue-600/blue-100
                    : phase.status === "completed"
                      ? "border-l-gray-500 bg-gray-100" // Darkened from gray-400/gray-50 to gray-500/gray-100
                      : "border-l-indigo-600 bg-indigo-100" // Darkened from indigo-500/indigo-50 to indigo-600/indigo-100
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
                    <Button onClick={joinDraftRoom} className="mt-4 bg-blue-600 hover:bg-blue-700">
                      Join Draft Room
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Linear Draft Explanation */}
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                How Linear Draft Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-indigo-800 mb-2">Consistent Order</h4>
                  <p className="text-sm text-indigo-700">
                    Unlike snake draft, linear draft maintains the same pick order every round. If you pick 3rd in round
                    1, you pick 3rd in every round.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-800 mb-2">Strategic Depth</h4>
                  <p className="text-sm text-indigo-700">
                    Each draft position has unique advantages. Early picks get top talent, later picks can react to
                    trends and find value.
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-indigo-200">
                <h4 className="font-semibold text-indigo-800 mb-2">Example Draft Order (6 players):</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Round 1:</strong> Player 1 → Player 2 → Player 3 → Player 4 → Player 5 → Player 6
                  </div>
                  <div>
                    <strong>Round 2:</strong> Player 1 → Player 2 → Player 3 → Player 4 → Player 5 → Player 6
                  </div>
                  <div>
                    <strong>Round 3:</strong> Player 1 → Player 2 → Player 3 → Player 4 → Player 5 → Player 6
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
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
            <Trophy className="h-6 w-6 text-blue-600" />
            Current Standings
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold">
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
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={getDraftPositionColor(entry.draft_position)}>
                        Position {entry.draft_position}
                      </Badge>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{entry.points} pts</div>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Tournament Rules
          </h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Linear Draft Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Draft positions determined by qualification round performance</p>
                <p>• Same pick order maintained throughout all rounds</p>
                <p>• No captain selection - all players draft for themselves</p>
                <p>• Draft timer: 90 seconds per pick (longer for strategic decisions)</p>
                <p>• 6 rounds of drafting with 6-8 players per draft</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Position Advantages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  • <strong>Early Positions (1-2):</strong> First access to top-tier players
                </p>
                <p>
                  • <strong>Middle Positions (3-4):</strong> Balanced picks with good value opportunities
                </p>
                <p>
                  • <strong>Late Positions (5-6):</strong> Can react to trends, find sleeper picks
                </p>
                <p>• Position bonuses applied based on draft slot performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scoring System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• Win: +100 points</p>
                <p>• Loss: +20 points (participation)</p>
                <p>• Draft Position Bonus: +10 points per optimal pick</p>
                <p>• Consistency Bonus: +30 points for 3+ consecutive wins</p>
                <p>• Value Pick Bonus: +15 points for outperforming draft position</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>• 1st Place: $4,000</p>
                <p>• 2nd Place: $2,000</p>
                <p>• 3rd Place: $1,200</p>
                <p>• 4th-6th Place: $200 each</p>
                <p>• Best Draft Position Performance: $200 each position</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
