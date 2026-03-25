"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Crown, Shield, Target, Edit, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/use-auth"

interface Team {
  id: string
  name: string
  captain: {
    id: string
    username: string
    elo_rating: number
  }
  members: Array<{
    id: string
    username: string
    elo_rating: number
    role: string
  }>
  stats: {
    wins: number
    losses: number
    total_score: number
    avg_elo: number
  }
  status: "active" | "eliminated" | "winner"
  seed: number
  description?: string
  created_at: string
}

interface TournamentTeamsProps {
  tournamentId: string
  tournament: any
}

export function TournamentTeams({ tournamentId, tournament }: TournamentTeamsProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { user } = useAuth()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadTeams = useCallback(async () => {
    try {
      // Get participants and organize them into teams
      const participants = await tournamentService.getParticipants(tournamentId)

      // Group participants by team_name to create teams
      const teamGroups = participants.reduce((acc: any, participant: any) => {
        const teamName = participant.team_name
        if (!acc[teamName]) {
          acc[teamName] = []
        }
        acc[teamName].push(participant)
        return acc
      }, {})

      // Convert to team objects
      const teamsData = Object.entries(teamGroups).map(([teamName, members]: [string, any]) => {
        const teamMembers = members as any[]
        const captain = teamMembers.find((m) => m.draft_position === 1) || teamMembers[0]
        const avgElo = Math.round(
          teamMembers.reduce((sum, m) => sum + (m.user?.elo_rating || 1200), 0) / teamMembers.length,
        )

        return {
          id: `team-${teamName.replace(/\s+/g, "-").toLowerCase()}`,
          name: teamName,
          captain: {
            id: captain.user_id,
            username: captain.user?.username || "Unknown",
            elo_rating: captain.user?.elo_rating || 1200,
          },
          members: teamMembers.map((m) => ({
            id: m.user_id,
            username: m.user?.username || "Unknown",
            elo_rating: m.user?.elo_rating || 1200,
            role: m.draft_position === 1 ? "Captain" : "Player",
          })),
          stats: {
            wins: 0,
            losses: 0,
            total_score: 0,
            avg_elo: avgElo,
          },
          status: "active" as const,
          seed: teamMembers[0]?.draft_position || 1,
          description: `${teamName} - Tournament team`,
          created_at: teamMembers[0]?.joined_at || new Date().toISOString(),
        }
      })

      setTeams(teamsData.sort((a, b) => a.seed - b.seed))
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error loading teams:", error)
      toast.error("Failed to load tournament teams")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    loadTeams()

    const channel = supabase
      .channel(`tournament-teams-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_memberships",
          filter: `league_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Real-time team update:", payload)

          if (payload.eventType === "INSERT") {
            toast.success("New team member joined!")
            loadTeams()
          } else if (payload.eventType === "UPDATE") {
            toast.info("Team information updated")
            loadTeams()
          } else if (payload.eventType === "DELETE") {
            toast.info("Team member left")
            loadTeams()
          }

          setLastUpdate(new Date())
        },
      )
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true)
      })
      .on("presence", { event: "leave" }, () => {
        setIsConnected(false)
      })
      .subscribe((status) => {
        console.log("[v0] Team subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, loadTeams, supabase])

  const handleUpdateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      // Update team information in database
      console.log("[v0] Updating team:", teamId, updates)

      // For now, just update local state and show success
      setTeams((prev) => prev.map((team) => (team.id === teamId ? { ...team, ...updates } : team)))

      toast.success("Team updated successfully!")
      setEditingTeam(null)
    } catch (error) {
      console.error("Error updating team:", error)
      toast.error("Failed to update team")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "winner":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "eliminated":
        return <Shield className="h-4 w-4 text-gray-500" />
      default:
        return <Target className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "winner":
        return "bg-yellow-500 text-gray-900"
      case "eliminated":
        return "bg-gray-500 text-white"
      default:
        return "bg-blue-500 text-white"
    }
  }

  const isTeamCaptain = (team: Team) => {
    return user?.id === team.captain.id
  }

  const isTournamentOrganizer = () => {
    return user?.id === tournament?.commissioner_id
  }

  if (loading) {
    return <div className="text-center py-8">Loading teams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Tournament Teams
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" title="Live updates connected" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Connection lost" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {teams.length} teams competing • {tournament.tournament_type.replace("_", " ")} format
            <span className="ml-2 text-xs">• Updated {lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tournament.status === "in_progress" && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 animate-pulse">
              <Users className="h-3 w-3 mr-1" />
              Live Tournament
            </Badge>
          )}
          <Button onClick={loadTeams} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground">Teams will appear here once players join the tournament</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                <div className="text-sm text-muted-foreground">Total Teams</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {teams.filter((t) => t.status === "active").length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Math.round(teams.reduce((sum, t) => sum + t.stats.avg_elo, 0) / teams.length) || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg ELO</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {teams.reduce((sum, t) => sum + t.members.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {team.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Seed #{team.seed}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(team.status)}
                      <Badge className={getStatusColor(team.status)}>
                        {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Team Captain */}
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{team.captain.username}</p>
                      <p className="text-xs text-muted-foreground">Captain • ELO: {team.captain.elo_rating}</p>
                    </div>
                    {isTeamCaptain(team) && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                      <span className="text-xs text-muted-foreground">{team.members.length} players</span>
                    </div>
                    {team.members
                      .filter((m) => m.role !== "Captain")
                      .map((member) => (
                        <div key={member.id} className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {member.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1">{member.username}</span>
                          <span className="text-muted-foreground">ELO: {member.elo_rating}</span>
                        </div>
                      ))}
                  </div>

                  {/* Team Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{team.stats.wins}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{team.stats.losses}</p>
                      <p className="text-xs text-muted-foreground">Losses</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg ELO:</span>
                    <span className="font-medium">{team.stats.avg_elo}</span>
                  </div>

                  {/* Team Management Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                          <Users className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {team.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Team Description</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {team.description || "No description available"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Created</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(team.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Team Statistics</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="font-bold text-green-600">{team.stats.wins}</div>
                                <div className="text-xs">Wins</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="font-bold text-red-600">{team.stats.losses}</div>
                                <div className="text-xs">Losses</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="font-bold text-blue-600">{team.stats.avg_elo}</div>
                                <div className="text-xs">Avg ELO</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {(isTeamCaptain(team) || isTournamentOrganizer()) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingTeam(team)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Edit className="h-5 w-5" />
                              Edit Team
                            </DialogTitle>
                          </DialogHeader>
                          {editingTeam && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="team-name">Team Name</Label>
                                <Input
                                  id="team-name"
                                  value={editingTeam.name}
                                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="team-description">Description</Label>
                                <Textarea
                                  id="team-description"
                                  value={editingTeam.description || ""}
                                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <Button onClick={() => handleUpdateTeam(editingTeam.id, editingTeam)} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
