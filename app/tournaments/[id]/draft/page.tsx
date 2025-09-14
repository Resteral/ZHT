"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Crown, Target, Trophy, ArrowLeft, Play } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { tournamentDraftService } from "@/lib/services/tournament-draft-service"

export default function TournamentDraftPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [playerPool, setPlayerPool] = useState<any[]>([])
  const [draftState, setDraftState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId])

  const loadTournamentData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading tournament draft data for:", tournamentId)

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError
      setTournament(tournamentData)

      // Load tournament teams with captains
      const { data: teamsData, error: teamsError } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          users:team_captain(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at")

      if (teamsError) throw teamsError
      setTeams(teamsData || [])

      // Load available players for drafting
      const { data: poolData, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")
        .order("created_at")

      if (poolError) throw poolError
      setPlayerPool(poolData || [])

      console.log("[v0] Loaded teams:", teamsData?.length)
      console.log("[v0] Loaded available players:", poolData?.length)

      setLoading(false)
    } catch (err) {
      console.error("[v0] Error loading tournament data:", err)
      setError(err instanceof Error ? err.message : "Failed to load tournament")
      setLoading(false)
    }
  }

  const startDraft = async () => {
    try {
      console.log("[v0] Starting draft for tournament:", tournamentId)
      const result = await tournamentDraftService.startDraft(tournamentId, user?.id!)

      if (result) {
        setDraftState(result)
        console.log("[v0] Draft started successfully")
      }
    } catch (err) {
      console.error("[v0] Error starting draft:", err)
      setError(err instanceof Error ? err.message : "Failed to start draft")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tournament draft...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error || "Tournament not found"}</p>
          <Button onClick={() => router.push("/tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  const isUserCaptain = teams.some((team) => team.team_captain === user?.id)
  const draftMode = tournament.player_pool_settings?.draft_mode || "snake_draft"

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${tournamentId}/lobby`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <p className="text-lg text-muted-foreground">Draft Room - {draftMode.replace("_", " ").toUpperCase()}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {tournament.status.replace("_", " ")}
          </Badge>
          <Badge variant="secondary">{teams.length} Teams</Badge>
        </div>
      </div>

      {/* Teams with Captains */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-green-500" />
            Team Captains Selected
          </CardTitle>
          <CardDescription>
            Captains have been assigned and are ready to draft their teams using {draftMode.replace("_", " ")} format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{team.users?.username?.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{team.team_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-3 w-3" />
                    <span>{team.users?.username || "Unknown"}</span>
                    <Badge variant="outline" className="text-xs">
                      {team.users?.elo_rating || 1200} ELO
                    </Badge>
                  </div>
                </div>
                {team.team_captain === user?.id && <Badge variant="default">You</Badge>}
              </div>
            ))}
          </div>

          {isUserCaptain && !draftState && (
            <div className="mt-6">
              <Button onClick={startDraft} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start {draftMode.replace("_", " ").toUpperCase()} Draft
              </Button>
            </div>
          )}

          {!isUserCaptain && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium">You are not a team captain</p>
              <p className="text-sm text-blue-600 mt-1">
                Wait for captains to complete the draft, then you'll be assigned to a team
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Available Players ({playerPool.length})
          </CardTitle>
          <CardDescription>Players available for drafting, sorted by ELO rating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {playerPool
              .sort((a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200))
              .map((player, index) => (
                <div key={player.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="secondary" className="min-w-[2rem]">
                    #{index + 1}
                  </Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {player.users?.username?.slice(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{player.users?.username || "Unknown"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>ELO: {player.users?.elo_rating || 1200}</span>
                    </div>
                  </div>
                  {player.user_id === user?.id && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
              ))}
          </div>

          {playerPool.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players available for drafting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Instructions */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Draft Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Draft Format:</strong> {draftMode.replace("_", " ").toUpperCase()}
            </p>
            <p>
              <strong>Teams:</strong> {teams.length} teams with {tournament.player_pool_settings?.players_per_team || 4}{" "}
              players each
            </p>
            <p>
              <strong>Available Players:</strong> {playerPool.length} players ready to be drafted
            </p>
            {draftMode === "snake_draft" && (
              <p>
                <strong>Snake Draft:</strong> Captains take turns picking players, with the order reversing each round
              </p>
            )}
            {draftMode === "auction_draft" && (
              <p>
                <strong>Auction Draft:</strong> Captains bid on players using their budget of $
                {tournament.auction_budget || 500}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
