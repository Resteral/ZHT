"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Crown, Target, Award, Medal, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface TournamentTrophy {
  achievement_id: string
  achievement_title: string
  achievement_description: string
  icon: string
  rarity: string
  points: number
  tournament_name: string
  unlocked_at: string
}

interface TournamentStats {
  tournaments_participated: number
  tournaments_won: number
  tournaments_top3: number
  total_matches_played: number
  total_matches_won: number
  win_rate: number
  total_achievement_points: number
  best_finish: number
  recent_tournaments: Array<{
    tournament_name: string
    final_position: number
    completed_at: string
  }>
}

interface TournamentTrophiesProps {
  userId: string
}

export function TournamentTrophies({ userId }: TournamentTrophiesProps) {
  const [trophies, setTrophies] = useState<TournamentTrophy[]>([])
  const [stats, setStats] = useState<TournamentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTournamentData()
  }, [userId])

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament trophies
      const { data: trophiesData, error: trophiesError } = await supabase.rpc("get_user_tournament_trophies", {
        user_id_param: userId,
      })

      if (trophiesError) {
        console.error("Error fetching tournament trophies:", trophiesError)
      } else {
        setTrophies(trophiesData || [])
      }

      // Fetch tournament statistics
      const { data: statsData, error: statsError } = await supabase.rpc("get_user_tournament_stats", {
        user_id_param: userId,
      })

      if (statsError) {
        console.error("Error fetching tournament stats:", statsError)
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0])
      }
    } catch (error) {
      console.error("Error fetching tournament data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "crown":
        return Crown
      case "target":
        return Target
      case "award":
        return Award
      case "medal":
        return Medal
      case "star":
        return Star
      default:
        return Trophy
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
      case "uncommon":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "rare":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
      case "epic":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30"
      case "legendary":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
    }
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">🥇 1st</Badge>
    if (position === 2) return <Badge className="bg-gray-400/20 text-gray-600 border-gray-400/30">🥈 2nd</Badge>
    if (position === 3) return <Badge className="bg-amber-600/20 text-amber-700 border-amber-600/30">🥉 3rd</Badge>
    return <Badge variant="outline">#{position}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Trophies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">Loading tournament data...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tournament Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.tournaments_participated}</div>
                <div className="text-sm text-muted-foreground">Tournaments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.tournaments_won}</div>
                <div className="text-sm text-muted-foreground">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.tournaments_top3}</div>
                <div className="text-sm text-muted-foreground">Top 3</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.win_rate}%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
            </div>

            {stats.best_finish < 999 && (
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Best Tournament Finish</div>
                {getPositionBadge(stats.best_finish)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournament Trophies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Achievements
            </span>
            <Badge variant="secondary">
              {trophies.length} {trophies.length === 1 ? "Trophy" : "Trophies"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trophies.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tournament trophies yet</p>
              <p className="text-sm">Participate in tournaments to earn achievements!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trophies.map((trophy) => {
                const IconComponent = getIconComponent(trophy.icon)
                return (
                  <Card key={trophy.achievement_id} className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <Badge variant="outline" className={getRarityColor(trophy.rarity)}>
                          {trophy.rarity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <h3 className="font-semibold mb-1">{trophy.achievement_title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{trophy.achievement_description}</p>
                      {trophy.tournament_name && (
                        <p className="text-xs text-primary font-medium mb-2">{trophy.tournament_name}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{trophy.points} points</span>
                        <span>{new Date(trophy.unlocked_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tournament Results */}
      {stats?.recent_tournaments && stats.recent_tournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Tournament Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_tournaments.map((tournament, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{tournament.tournament_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(tournament.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                  {getPositionBadge(tournament.final_position)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
