"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, Users, Calendar, Trophy } from "lucide-react"
import { useParams, notFound } from "next/navigation"
import { AuctionDraftRoom } from "@/components/auction-draft/auction-draft-room"
import { createClient } from "@/lib/supabase/client"

interface AuctionLeague {
  id: string
  name: string
  game: string
  max_teams: number
  players_per_team: number
  entry_fee: number
  prize_pool: number
  status: string
  auction_date: string
  bidders: Array<{
    id: string
    username: string
    elo_rating: number
    avatar?: string
  }>
  participants: Array<{
    id: string
    username: string
    elo_rating: number
    role: string
    team_id?: string
  }>
}

const gameNames = {
  zealot_hockey: "Zealot Hockey",
  call_of_duty: "Call of Duty",
  rainbow_six_siege: "Rainbow Six Siege",
  counter_strike: "Counter Strike",
}

export default function AuctionLeaguePage() {
  const params = useParams()
  const leagueId = params.id as string
  const [league, setLeague] = useState<AuctionLeague | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<"bidder" | "player" | "spectator">("spectator")
  const [userTeam, setUserTeam] = useState<{ id: string; name: string; roster: string[] } | null>(null)

  useEffect(() => {
    loadLeague()
    loadUserTeam()
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
        name: "Zealot Hockey Championship",
        game: "zealot_hockey",
        max_teams: 8,
        players_per_team: 5,
        entry_fee: 25,
        prize_pool: 200,
        status: "auction_in_progress",
        auction_date: "2024-03-25T19:00:00Z",
        bidders: [
          { id: "1", username: "ProHockey", elo_rating: 2156 },
          { id: "2", username: "IceKing", elo_rating: 2089 },
          { id: "3", username: "PuckMaster", elo_rating: 2034 },
          { id: "4", username: "GoalieGod", elo_rating: 1987 },
        ],
        participants: [
          { id: "1", username: "ProHockey", elo_rating: 2156, role: "bidder" },
          { id: "2", username: "IceKing", elo_rating: 2089, role: "bidder" },
          { id: "3", username: "PuckMaster", elo_rating: 2034, role: "bidder" },
          { id: "4", username: "GoalieGod", elo_rating: 1987, role: "bidder" },
          { id: "5", username: "SkaterPro", elo_rating: 1876, role: "player" },
          { id: "6", username: "WingerWiz", elo_rating: 1834, role: "player" },
          { id: "7", username: "DefenseAce", elo_rating: 1789, role: "player" },
          { id: "8", username: "CenterStage", elo_rating: 1756, role: "player" },
          { id: "9", username: "PowerPlay", elo_rating: 1723, role: "player" },
          { id: "10", username: "ShotCaller", elo_rating: 1698, role: "player" },
        ],
      })
      setUserRole("bidder") // Mock user role
    } catch (error) {
      console.error("Error loading auction league:", error)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  const loadUserTeam = async () => {
    try {
      console.log("[v0] Loading user team from database...")
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        console.log("[v0] No authenticated user found")
        return
      }

      // Query user's teams from database
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          logo_url,
          max_players,
          created_at
        `)
        .eq("owner_id", user.id)
        .limit(1)

      if (teamsError) {
        console.error("[v0] Error loading teams:", teamsError)
        return
      }

      if (teams && teams.length > 0) {
        const team = teams[0]
        console.log("[v0] User team loaded:", team.name)
        setUserTeam({
          id: team.id,
          name: team.name,
          roster: [], // Will be populated from team_members if needed
        })
      } else {
        console.log("[v0] No teams found for user")
      }
    } catch (error) {
      console.error("[v0] Error loading user team:", error)
      // Don't throw error - just log it and continue without user team
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Loading league...</div>
  }

  if (!league) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{league.name}</h1>
        <p className="text-muted-foreground">{gameNames[league.game as keyof typeof gameNames]} Auction Draft</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bidders">Bidders</TabsTrigger>
          <TabsTrigger value="players">All Players</TabsTrigger>
          <TabsTrigger value="auction">Auction Room</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  League Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Teams:</span>
                  <span>
                    {league.bidders.length}/{league.max_teams}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Players per Team:</span>
                  <span>{league.players_per_team}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entry Fee:</span>
                  <span>${league.entry_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prize Pool:</span>
                  <span className="text-green-600 font-medium">${league.prize_pool}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Auction Date</p>
                  <p className="font-medium">{new Date(league.auction_date).toLocaleString()}</p>
                </div>
                <Badge variant={league.status === "auction_in_progress" ? "default" : "secondary"}>
                  {league.status === "auction_in_progress" ? "Live Auction" : league.status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Players:</span>
                  <span>{league.participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bidders:</span>
                  <span>{league.bidders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Players:</span>
                  <span>{league.participants.length - league.bidders.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bidders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-amber-500" />
                Active Bidders
              </CardTitle>
              <CardDescription>Players participating in the auction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {league.bidders.map((bidder, index) => (
                  <div key={bidder.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
                        <Gavel className="h-4 w-4 text-amber-500" />
                      </div>
                      <Avatar>
                        <AvatarImage src={bidder.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{bidder.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{bidder.username}</p>
                        <p className="text-sm text-muted-foreground">Bidder #{index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{bidder.elo_rating}</div>
                      <div className="text-sm text-slate-600 font-medium">ELO Rating</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Participants</CardTitle>
              <CardDescription>Players available for auction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {league.participants
                  .sort((a, b) => b.elo_rating - a.elo_rating)
                  .map((participant, index) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {participant.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.username}</p>
                          <div className="flex items-center gap-2">
                            {participant.role === "bidder" ? (
                              <Badge variant="default" className="text-xs gap-1">
                                <Gavel className="h-2 w-2" />
                                Bidder
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Player
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{participant.elo_rating}</div>
                        <div className="text-xs text-slate-600 font-medium">ELO</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auction" className="space-y-6">
          {league.status === "auction_in_progress" || userRole === "bidder" ? (
            <AuctionDraftRoom league={league} userRole={userRole} userTeam={userTeam} />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Auction Not Started</h3>
                <p className="text-muted-foreground mb-4">
                  Auction begins on {new Date(league.auction_date).toLocaleString()}
                </p>
                {league.status === "registration" && (
                  <p className="text-sm text-muted-foreground">Waiting for all bidders to be ready</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
