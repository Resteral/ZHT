"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Crown, Users, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentDraftCaptainSelectionProps {
  tournamentId: string
  isOwner: boolean
}

export function TournamentDraftCaptainSelection({ tournamentId, isOwner }: TournamentDraftCaptainSelectionProps) {
  const [teams, setTeams] = useState<any[]>([])
  const [playerPool, setPlayerPool] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningCaptain, setAssigningCaptain] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tournamentId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load tournament settings to get team count
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("player_pool_settings, max_teams")
        .eq("id", tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      const maxTeams = tournament.player_pool_settings?.max_teams || tournament.player_pool_settings?.num_teams || 4

      // Load existing teams
      const { data: existingTeams, error: teamsError } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_name,
          team_captain,
          users:team_captain(username, id)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at")

      if (teamsError) throw teamsError

      // Create missing teams if needed
      const teamsToCreate = maxTeams - (existingTeams?.length || 0)
      if (teamsToCreate > 0) {
        const newTeams = []
        for (let i = 0; i < teamsToCreate; i++) {
          const teamNumber = (existingTeams?.length || 0) + i + 1
          newTeams.push({
            tournament_id: tournamentId,
            team_name: `Team ${teamNumber}`,
            team_captain: null,
            created_at: new Date().toISOString(),
          })
        }

        const { data: createdTeams, error: createError } = await supabase
          .from("tournament_teams")
          .insert(newTeams)
          .select(`
            id,
            team_name,
            team_captain,
            users:team_captain(username, id)
          `)

        if (createError) throw createError

        setTeams([...(existingTeams || []), ...(createdTeams || [])])
      } else {
        setTeams(existingTeams || [])
      }

      // Load player pool
      const { data: pool, error: poolError } = await supabase
        .from("tournament_player_pool")
        .select(`
          id,
          user_id,
          users:user_id(username, id)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "active")

      if (poolError) throw poolError
      setPlayerPool(pool || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }

  const assignCaptain = async (teamId: string, playerId: string) => {
    if (!isOwner) {
      toast.error("Only the tournament owner can assign captains")
      return
    }

    setAssigningCaptain(teamId)
    try {
      const { error } = await supabase.from("tournament_teams").update({ team_captain: playerId }).eq("id", teamId)

      if (error) throw error

      toast.success("Captain assigned successfully")
      loadData() // Reload data to show updates
    } catch (error) {
      console.error("Error assigning captain:", error)
      toast.error("Failed to assign captain")
    } finally {
      setAssigningCaptain(null)
    }
  }

  const removeCaptain = async (teamId: string) => {
    if (!isOwner) {
      toast.error("Only the tournament owner can remove captains")
      return
    }

    setAssigningCaptain(teamId)
    try {
      const { error } = await supabase.from("tournament_teams").update({ team_captain: null }).eq("id", teamId)

      if (error) throw error

      toast.success("Captain removed successfully")
      loadData() // Reload data to show updates
    } catch (error) {
      console.error("Error removing captain:", error)
      toast.error("Failed to remove captain")
    } finally {
      setAssigningCaptain(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading captain selection...</div>
        </CardContent>
      </Card>
    )
  }

  const availablePlayers = playerPool.filter((player) => !teams.some((team) => team.team_captain === player.user_id))

  return (
    <div className="space-y-6">
      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {teams.map((team) => (
          <Card key={team.id} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                {team.team_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {team.team_captain ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {team.users?.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{team.users?.username || "Unknown"}</div>
                      <Badge variant="secondary" className="text-xs">
                        Captain
                      </Badge>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => removeCaptain(team.id)}
                      disabled={assigningCaptain === team.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Crown className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm text-muted-foreground mb-3">No captain assigned</div>
                  {isOwner && availablePlayers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground mb-2">Select from player pool:</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {availablePlayers.slice(0, 3).map((player) => (
                          <Button
                            key={player.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8"
                            onClick={() => assignCaptain(team.id, player.user_id)}
                            disabled={assigningCaptain === team.id}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {player.users?.username}
                          </Button>
                        ))}
                        {availablePlayers.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{availablePlayers.length - 3} more...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Player Pool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Player Pool ({playerPool.length} players)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {playerPool.map((player) => {
              const isCaptain = teams.some((team) => team.team_captain === player.user_id)
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isCaptain ? "bg-yellow-50 border-yellow-200" : "bg-gray-50"
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {player.users?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{player.users?.username || "Unknown"}</div>
                  </div>
                  {isCaptain && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Captain
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
          {playerPool.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players in the pool yet</p>
              <p className="text-sm mt-2">Players will appear here when they join the tournament</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isOwner && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">Only the tournament owner can assign captains</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
