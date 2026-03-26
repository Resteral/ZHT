"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Users, Star, Trophy, Target, Medal, Edit, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface EloTeam {
  id: string
  name: string
  owner_id: string
  owner_username: string
  total_elo: number
  average_elo: number
  player_count: number
  max_players: number
  budget_used: number
  budget_remaining: number
  division: "premier" | "championship" | "league_one" | "league_two"
  status: "active" | "inactive" | "competing"
  created_at: string
  players: EloTeamPlayer[]
}

interface EloTeamPlayer {
  id: string
  user_id: string
  username: string
  elo_rating: number
  position: string
  acquisition_cost: number
  current_value: number
  value_change: number
  status: "active" | "benched" | "injured"
}

interface AvailablePlayer {
  id: string
  username: string
  elo_rating: number
  estimated_value: number
  position: string
  recent_performance: number
  availability: "available" | "contracted" | "bidding"
}

export function EloTeamManager() {
  const { user } = useAuth()
  const [myTeams, setMyTeams] = useState<EloTeam[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([])
  const [selectedTeam, setSelectedTeam] = useState<EloTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [teamBudget] = useState(10000) // Starting budget for team creation

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadTeamData()
    }
  }, [user])

  const loadTeamData = async () => {
    try {
      // Load user's teams
      const { data: teamsData } = await supabase
        .from("elo_teams")
        .select(`
          *,
          elo_team_players(
            *,
            users(username, elo_rating)
          )
        `)
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false })

      if (teamsData) {
        const processedTeams = teamsData.map((team) => ({
          id: team.id,
          name: team.name,
          owner_id: team.owner_id,
          owner_username: user?.username || "You",
          total_elo: team.total_elo || 0,
          average_elo: team.average_elo || 0,
          player_count: team.elo_team_players?.length || 0,
          max_players: 4, // Limit max players to 4 as requested
          budget_used: team.budget_used || 0,
          budget_remaining: team.budget_remaining || teamBudget,
          division: getDivisionFromElo(team.average_elo || 0),
          status: team.status || "active",
          created_at: team.created_at,
          players:
            team.elo_team_players?.map((player: any) => ({
              id: player.id,
              user_id: player.user_id,
              username: player.users?.username || "Unknown",
              elo_rating: player.users?.elo_rating || 1200,
              position: player.position || "Player",
              acquisition_cost: player.acquisition_cost || 0,
              current_value: calculatePlayerValue(player.users?.elo_rating || 1200),
              value_change: 0, // Would calculate from historical data
              status: player.status || "active",
            })) || [],
        }))

        setMyTeams(processedTeams)
        if (processedTeams.length > 0) {
          setSelectedTeam(processedTeams[0])
        }
      }

      // Load available players
      const { data: playersData } = await supabase
        .from("users")
        .select("id, username, elo_rating")
        .gte("elo_rating", 1200)
        .order("elo_rating", { ascending: false })
        .limit(50)

      if (playersData) {
        const availablePlayers = playersData.map((player) => ({
          id: player.id,
          username: player.username,
          elo_rating: player.elo_rating,
          estimated_value: calculatePlayerValue(player.elo_rating),
          position: "Player",
          recent_performance: Math.random() * 100, // Mock performance data
          availability: "available" as const,
        }))

        setAvailablePlayers(availablePlayers)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading team data:", error)
      setLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim() || !user) return

    try {
      const teamData = {
        name: newTeamName,
        owner_id: user.id,
        max_players: 4, // Set max players to 4
        budget_remaining: teamBudget,
        budget_used: 0,
        total_elo: 0,
        average_elo: 0,
        status: "active",
      }

      const { data, error } = await supabase.from("elo_teams").insert(teamData).select().single()

      if (error) throw error

      setNewTeamName("")
      setCreateTeamOpen(false)
      await loadTeamData()
    } catch (error) {
      console.error("Error creating team:", error)
      alert("Failed to create team. Please try again.")
    }
  }

  const addPlayerToTeam = async (playerId: string, teamId: string) => {
    if (!selectedTeam) return

    const player = availablePlayers.find((p) => p.id === playerId)
    if (!player) return

    if (selectedTeam.player_count >= selectedTeam.max_players) {
      alert("Team is full! Remove a player first.")
      return
    }

    if (selectedTeam.budget_remaining < player.estimated_value) {
      alert("Not enough budget to acquire this player!")
      return
    }

    try {
      const playerData = {
        team_id: teamId,
        user_id: playerId,
        position: "Player",
        acquisition_cost: player.estimated_value,
        status: "active",
      }

      const { error } = await supabase.from("elo_team_players").insert(playerData)

      if (error) throw error

      const newTotalElo = selectedTeam.total_elo + player.elo_rating
      const newPlayerCount = selectedTeam.player_count + 1
      const newAverageElo = newTotalElo / newPlayerCount
      const newBudgetUsed = selectedTeam.budget_used + player.estimated_value
      const newBudgetRemaining = selectedTeam.budget_remaining - player.estimated_value

      await supabase
        .from("elo_teams")
        .update({
          total_elo: newTotalElo,
          average_elo: newAverageElo,
          budget_used: newBudgetUsed,
          budget_remaining: newBudgetRemaining,
        })
        .eq("id", teamId)

      const eloIncrease = Math.floor(player.estimated_value / 100)
      if (eloIncrease > 0) {
        const { data: userData } = await supabase.from("users").select("elo_rating").eq("id", user?.id).single()

        if (userData) {
          const newUserElo = userData.elo_rating + eloIncrease
          await supabase.from("users").update({ elo_rating: newUserElo }).eq("id", user?.id)
        }
      }

      await loadTeamData()
    } catch (error) {
      console.error("Error adding player to team:", error)
      alert("Failed to add player to team. Please try again.")
    }
  }

  const removePlayerFromTeam = async (playerId: string, teamId: string) => {
    if (!selectedTeam) return

    const player = selectedTeam.players.find((p) => p.user_id === playerId)
    if (!player) return

    try {
      const { error } = await supabase.from("elo_team_players").delete().eq("team_id", teamId).eq("user_id", playerId)

      if (error) throw error

      // Update team budget and stats
      const newTotalElo = selectedTeam.total_elo - player.elo_rating
      const newPlayerCount = selectedTeam.player_count - 1
      const newAverageElo = newPlayerCount > 0 ? newTotalElo / newPlayerCount : 0
      const newBudgetUsed = selectedTeam.budget_used - player.acquisition_cost
      const newBudgetRemaining = selectedTeam.budget_remaining + player.acquisition_cost

      await supabase
        .from("elo_teams")
        .update({
          total_elo: newTotalElo,
          average_elo: newAverageElo,
          budget_used: newBudgetUsed,
          budget_remaining: newBudgetRemaining,
        })
        .eq("id", teamId)

      await loadTeamData()
    } catch (error) {
      console.error("Error removing player from team:", error)
      alert("Failed to remove player from team. Please try again.")
    }
  }

  const calculatePlayerValue = (elo: number): number => {
    // Base value calculation based on ELO
    const baseValue = Math.max(100, (elo - 1200) * 2)
    return Math.round(baseValue)
  }

  const getDivisionFromElo = (elo: number): "premier" | "championship" | "league_one" | "league_two" => {
    if (elo >= 1800) return "premier"
    if (elo >= 1600) return "championship"
    if (elo >= 1400) return "league_one"
    return "league_two"
  }

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "premier":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
      case "championship":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "league_one":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "league_two":
        return "bg-gradient-to-r from-green-500 to-teal-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getDivisionName = (division: string) => {
    switch (division) {
      case "premier":
        return "Premier Division"
      case "championship":
        return "Championship"
      case "league_one":
        return "League One"
      case "league_two":
        return "League Two"
      default:
        return "Unranked"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Medal className="h-6 w-6 text-emerald-600" />
            Your ELO Teams
          </h2>
          <p className="text-muted-foreground">Create and manage teams based on player ELO ratings</p>
        </div>
        <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New ELO Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Starting budget: ${teamBudget.toLocaleString()}</p>
                <p>Maximum players: 4</p> {/* Update max players display to 4 */}
              </div>
              <Button onClick={createTeam} className="w-full">
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {myTeams.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No teams created yet</p>
              <p className="text-sm">Create your first ELO-based team to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Team Overview</TabsTrigger>
            <TabsTrigger value="roster">Manage Roster</TabsTrigger>
            <TabsTrigger value="market">Player Market</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {myTeams.map((team) => (
                <Card
                  key={team.id}
                  className={`cursor-pointer transition-all ${
                    selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-emerald-600" />
                        {team.name}
                      </CardTitle>
                      <Badge className={getDivisionColor(team.division)}>{getDivisionName(team.division)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Players</p>
                        <p className="font-medium">
                          {team.player_count}/{team.max_players}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg ELO</p>
                        <p className="font-medium">{Math.round(team.average_elo)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Budget Used</p>
                        <p className="font-medium">${team.budget_used.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining</p>
                        <p className="font-medium text-emerald-700">${team.budget_remaining.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                        View Stats
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            {selectedTeam && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {selectedTeam.name} Roster
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTeam.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Avatar>
                          <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{player.username}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {player.elo_rating} ELO
                            </span>
                            <span>Cost: ${player.acquisition_cost}</span>
                            <span>Value: ${player.current_value}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removePlayerFromTeam(player.user_id, selectedTeam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {selectedTeam.players.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No players in roster</p>
                        <p className="text-sm">Add players from the market</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Available Players
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedTeam && `Budget remaining: $${selectedTeam.budget_remaining.toLocaleString()}`}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availablePlayers.slice(0, 20).map((player) => (
                    <div key={player.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Avatar>
                        <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.username}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {player.elo_rating} ELO
                          </span>
                          <span>Value: ${player.estimated_value}</span>
                          <Badge variant="outline" className={getDivisionColor(getDivisionFromElo(player.elo_rating))}>
                            {getDivisionName(getDivisionFromElo(player.elo_rating))}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => selectedTeam && addPlayerToTeam(player.id, selectedTeam.id)}
                        disabled={!selectedTeam || selectedTeam.budget_remaining < player.estimated_value}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
