"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, MapPin, Calendar, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Game {
  id: string
  title: string
  home_team?: { name: string; avatar?: string; record?: string }
  away_team?: { name: string; avatar?: string; record?: string }
  scheduled_time: string
  league: string
  status: string
  venue?: string
  match_type?: string
  current_participants?: number
  max_participants?: number
  prize_pool?: number
}

export function UpcomingGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUpcomingGames()
  }, [])

  const fetchUpcomingGames = async () => {
    try {
      const { data: matches } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(name, logo_url),
          away_team:teams!matches_away_team_id_fkey(name, logo_url),
          match_participants(user_id)
        `)
        .in("status", ["scheduled", "waiting", "active"])
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(15)

      if (matches) {
        const gameList: Game[] = matches.map((match) => {
          const isELOMatch = match.match_type?.includes("_draft")
          const participantCount = match.match_participants?.length || 0

          if (isELOMatch) {
            return {
              id: match.id,
              title: `${match.name || `${match.match_type?.replace("_draft", "").toUpperCase()} Draft`}`,
              scheduled_time: match.start_date || match.created_at,
              league: "ELO League",
              status: match.status,
              venue: "Online",
              match_type: match.match_type,
              current_participants: participantCount,
              max_participants: match.max_participants,
              prize_pool: match.prize_pool,
            }
          } else {
            return {
              id: match.id,
              title: `${match.away_team?.name || "Team A"} vs ${match.home_team?.name || "Team B"}`,
              home_team: {
                name: match.home_team?.name || "Team B",
                avatar: match.home_team?.logo_url,
                record: "0-0",
              },
              away_team: {
                name: match.away_team?.name || "Team A",
                avatar: match.away_team?.logo_url,
                record: "0-0",
              },
              scheduled_time: match.start_date || match.created_at,
              league: match.league || "League",
              status: match.status,
              venue: match.venue || "TBD",
            }
          }
        })
        setGames(gameList)
      }
    } catch (error) {
      console.error("Error fetching upcoming games:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 bg-muted rounded w-16"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-8"></div>
              <div className="flex items-center space-x-3">
                <div className="space-y-1 text-right">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
                <div className="w-8 h-8 bg-muted rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {games.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No upcoming games scheduled</p>
          <p className="text-sm">Check back later for new matches!</p>
        </div>
      ) : (
        games.map((game) => (
          <div key={game.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{game.league}</Badge>
              <Badge
                variant={
                  game.status === "scheduled"
                    ? "secondary"
                    : game.status === "waiting"
                      ? "default"
                      : game.status === "active"
                        ? "destructive"
                        : "default"
                }
              >
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </Badge>
            </div>

            {game.match_type?.includes("_draft") ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{game.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {game.current_participants}/{game.max_participants} players
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium">${game.prize_pool}</p>
                  <p className="text-xs text-muted-foreground">Prize Pool</p>
                </div>

                <div className="text-right">
                  <p className="font-medium text-sm">{game.match_type?.replace("_draft", "").toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Draft Format</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={game.away_team?.avatar || "/placeholder.svg"} alt={game.away_team?.name} />
                    <AvatarFallback>{game.away_team?.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{game.away_team?.name}</p>
                    <p className="text-xs text-muted-foreground">{game.away_team?.record}</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium">VS</p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-medium text-sm">{game.home_team?.name}</p>
                    <p className="text-xs text-muted-foreground">{game.home_team?.record}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={game.home_team?.avatar || "/placeholder.svg"} alt={game.home_team?.name} />
                    <AvatarFallback>{game.home_team?.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(game.scheduled_time).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{game.venue}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                {game.match_type?.includes("_draft") ? "Join Lobby" : "View Details"}
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
