"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Calendar, Users, Target, Award, Gamepad2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  seasonalTournamentService,
  type SeasonalTournament,
  type SeasonalParticipant,
  type SeasonalLeaderboard,
} from "@/lib/services/seasonal-tournament-service"
import { toast } from "sonner"

export function SeasonalTournamentDashboard() {
  const { user, isAuthenticated } = useAuth()
  const [currentSeason, setCurrentSeason] = useState<SeasonalTournament | null>(null)
  const [userStats, setUserStats] = useState<SeasonalParticipant | null>(null)
  const [leaderboard, setLeaderboard] = useState<SeasonalLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    loadSeasonalData()
  }, [user])

  const loadSeasonalData = async () => {
    try {
      setLoading(true)

      console.log("[v0] Loading seasonal tournament data...")

      // Load current season
      const season = await seasonalTournamentService.getCurrentSeason()
      console.log("[v0] Current season:", season)
      setCurrentSeason(season)

      if (season && user) {
        console.log("[v0] Loading user stats and leaderboard...")
        // Load user stats
        const stats = await seasonalTournamentService.getUserSeasonalStats(season.id, user.id)
        console.log("[v0] User stats:", stats)
        setUserStats(stats)

        // Load leaderboard
        const board = await seasonalTournamentService.getSeasonalLeaderboard(season.id, undefined, 50)
        console.log("[v0] Leaderboard:", board)
        setLeaderboard(board)
      }
    } catch (error) {
      console.error("[v0] Error loading seasonal data:", error)
      toast.error("Failed to load seasonal tournament data")
    } finally {
      setLoading(false)
    }
  }

  const joinSeason = async () => {
    if (!currentSeason || !user) return

    setJoining(true)
    try {
      const success = await seasonalTournamentService.joinSeason(currentSeason.id, user.id)
      if (success) {
        toast.success("Successfully joined the seasonal tournament!")
        await loadSeasonalData()
      } else {
        toast.error("Failed to join seasonal tournament")
      }
    } catch (error) {
      console.error("Error joining season:", error)
      toast.error("Failed to join seasonal tournament")
    } finally {
      setJoining(false)
    }
  }

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "premier":
        return "text-purple-500 bg-purple-100"
      case "championship":
        return "text-blue-500 bg-blue-100"
      case "league_one":
        return "text-green-500 bg-green-100"
      case "league_two":
        return "text-orange-500 bg-orange-100"
      default:
        return "text-gray-500 bg-gray-100"
    }
  }

  const getDivisionName = (division: string) => {
    switch (division) {
      case "premier":
        return "Premier"
      case "championship":
        return "Championship"
      case "league_one":
        return "League One"
      case "league_two":
        return "League Two"
      default:
        return division
    }
  }

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "Season ended"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days} days remaining`
    return `${hours} hours remaining`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading seasonal tournament...</div>
      </div>
    )
  }

  if (!currentSeason) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Seasonal Tournament</h3>
            <p className="text-muted-foreground">Check back soon for the next 3-month competitive season!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seasonProgress =
    ((new Date().getTime() - new Date(currentSeason.start_date).getTime()) /
      (new Date(currentSeason.end_date).getTime() - new Date(currentSeason.start_date).getTime())) *
    100

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">{currentSeason.name}</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compete in ELO lobbies over 3 months to climb divisions and earn seasonal rewards. All lobby formats (1v1,
          2v2, 3v3, 5v5, 6v6) contribute to your seasonal ranking.
        </p>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{getTimeRemaining(currentSeason.end_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{currentSeason.current_participants} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>${currentSeason.total_prize_pool.toLocaleString()} prize pool</span>
          </div>
        </div>

        <Progress value={seasonProgress} className="max-w-md mx-auto" />

        {isAuthenticated && !userStats && (
          <Button onClick={joinSeason} disabled={joining} size="lg">
            {joining ? "Joining..." : "Join Seasonal Tournament"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="stats">My Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {userStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Season Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{userStats.current_elo}</div>
                    <div className="text-sm text-muted-foreground">Current ELO</div>
                    <div className="text-xs text-green-500">
                      +{userStats.current_elo - userStats.starting_elo} from start
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{userStats.seasonal_points}</div>
                    <div className="text-sm text-muted-foreground">Seasonal Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{userStats.total_matches_played}</div>
                    <div className="text-sm text-muted-foreground">Matches Played</div>
                    <div className="text-xs text-muted-foreground">
                      {userStats.total_wins}W - {userStats.total_losses}L
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge className={getDivisionColor(userStats.current_division)}>
                      {getDivisionName(userStats.current_division)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Division</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Premier", key: "premier", minElo: 1800, color: "purple" },
              { name: "Championship", key: "championship", minElo: 1600, color: "blue" },
              { name: "League One", key: "league_one", minElo: 1400, color: "green" },
              { name: "League Two", key: "league_two", minElo: 1200, color: "orange" },
            ].map((division) => (
              <Card key={division.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{division.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-muted-foreground">
                    {leaderboard.filter((p) => p.division === division.key).length} players
                  </div>
                  <div className="text-xs text-muted-foreground">{division.minElo}+ ELO required</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Seasonal Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.slice(0, 20).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{player.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.matches_played} matches • {player.win_rate.toFixed(1)}% WR
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{player.seasonal_points} pts</div>
                      <div className="text-sm text-muted-foreground">{player.elo_rating} ELO</div>
                      <Badge size="sm" className={getDivisionColor(player.division)}>
                        {getDivisionName(player.division)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Seasonal Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "ELO Climber", desc: "Gain 100+ ELO points", reward: 50, icon: "📈", rarity: "common" },
                  { name: "Match Grinder", desc: "Play 50+ matches", reward: 75, icon: "⚔️", rarity: "common" },
                  { name: "Win Streak", desc: "Achieve 10+ win streak", reward: 100, icon: "🔥", rarity: "rare" },
                  { name: "Division Climber", desc: "Get promoted", reward: 100, icon: "📊", rarity: "rare" },
                  { name: "Premier League", desc: "Reach Premier Division", reward: 300, icon: "💎", rarity: "epic" },
                  { name: "Format Master", desc: "Win in all formats", reward: 200, icon: "🎯", rarity: "epic" },
                ].map((achievement) => (
                  <div key={achievement.name} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{achievement.desc}</p>
                    <div className="text-sm font-medium text-green-500">+{achievement.reward} points</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {userStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ELO Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Starting ELO:</span>
                    <span className="font-medium">{userStats.starting_elo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current ELO:</span>
                    <span className="font-medium">{userStats.current_elo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak ELO:</span>
                    <span className="font-medium text-green-500">{userStats.peak_elo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Change:</span>
                    <span
                      className={`font-medium ${userStats.current_elo >= userStats.starting_elo ? "text-green-500" : "text-red-500"}`}
                    >
                      {userStats.current_elo >= userStats.starting_elo ? "+" : ""}
                      {userStats.current_elo - userStats.starting_elo}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Matches:</span>
                    <span className="font-medium">{userStats.total_matches_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wins:</span>
                    <span className="font-medium text-green-500">{userStats.total_wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Losses:</span>
                    <span className="font-medium text-red-500">{userStats.total_losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span className="font-medium">
                      {userStats.total_matches_played > 0
                        ? ((userStats.total_wins / userStats.total_matches_played) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Join the Season</h3>
                <p className="text-muted-foreground mb-4">
                  Join the seasonal tournament to track your progress and compete for prizes!
                </p>
                {isAuthenticated && (
                  <Button onClick={joinSeason} disabled={joining}>
                    {joining ? "Joining..." : "Join Seasonal Tournament"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
