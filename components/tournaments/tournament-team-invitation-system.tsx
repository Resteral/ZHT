"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Crown, Mail, Check, Clock, Search, Plus, UserPlus, Shield, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/components/ui/use-toast"

interface TeamInvitationSystemProps {
  tournamentId: string
  tournament: any
  onTeamRegistered?: () => void
}

interface Team {
  id: string
  name: string
  description?: string
  owner_id: string
  owner_username: string
  members: TeamMember[]
  invitations: TeamInvitation[]
  max_members: number
  tournament_registered: boolean
}

interface TeamMember {
  id: string
  user_id: string
  username: string
  elo_rating: number
  role: "owner" | "captain" | "member"
  status: "active" | "pending"
  joined_at: string
}

interface TeamInvitation {
  id: string
  invited_user_id: string
  invited_username: string
  invited_by_username: string
  status: "pending" | "accepted" | "declined"
  created_at: string
  expires_at: string
}

interface AvailablePlayer {
  id: string
  username: string
  elo_rating: number
  total_games: number
  wins: number
  availability: "available" | "invited" | "on_team"
}

export function TournamentTeamInvitationSystem({
  tournamentId,
  tournament,
  onTeamRegistered,
}: TeamInvitationSystemProps) {
  const { user } = useAuth()
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")

  const supabase = createClient()
  const maxPlayersPerTeam = tournament?.player_pool_settings?.players_per_team || 4

  useEffect(() => {
    if (user) {
      loadTeamData()
      loadAvailablePlayers()
    }
  }, [user, tournamentId])

  const loadTeamData = async () => {
    try {
      // Load user's teams
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members(
            *,
            users(username, elo_rating)
          ),
          team_invitations(
            *,
            users!team_invitations_invited_user_id_fkey(username),
            invited_by:users!team_invitations_invited_by_id_fkey(username)
          ),
          tournament_teams!inner(tournament_id)
        `)
        .eq("owner_id", user?.id)
        .eq("game", tournament?.game || "zealot_hockey")

      if (error) throw error

      const processedTeams: Team[] = (teamsData || []).map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        owner_id: team.owner_id,
        owner_username: user?.username || "You",
        max_members: maxPlayersPerTeam,
        tournament_registered: team.tournament_teams?.some((tt: any) => tt.tournament_id === tournamentId) || false,
        members: (team.team_members || []).map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          username: member.users?.username || "Unknown",
          elo_rating: member.users?.elo_rating || 1200,
          role: member.role,
          status: member.is_active ? "active" : "pending",
          joined_at: member.joined_at,
        })),
        invitations: (team.team_invitations || [])
          .filter((inv: any) => inv.status === "pending")
          .map((invitation: any) => ({
            id: invitation.id,
            invited_user_id: invitation.invited_user_id,
            invited_username: invitation.users?.username || "Unknown",
            invited_by_username: invitation.invited_by?.username || "Unknown",
            status: invitation.status,
            created_at: invitation.created_at,
            expires_at: invitation.expires_at,
          })),
      }))

      setMyTeams(processedTeams)
      if (processedTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(processedTeams[0])
      }
    } catch (error) {
      console.error("Error loading team data:", error)
      toast({
        title: "Error loading teams",
        description: "Failed to load your teams. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailablePlayers = async () => {
    try {
      const { data: playersData, error } = await supabase
        .from("users")
        .select("id, username, elo_rating, total_games, wins")
        .neq("id", user?.id)
        .gte("elo_rating", 1000)
        .order("elo_rating", { ascending: false })
        .limit(100)

      if (error) throw error

      const players: AvailablePlayer[] = (playersData || []).map((player) => ({
        id: player.id,
        username: player.username,
        elo_rating: player.elo_rating,
        total_games: player.total_games || 0,
        wins: player.wins || 0,
        availability: "available", // Would need to check team memberships and invitations
      }))

      setAvailablePlayers(players)
    } catch (error) {
      console.error("Error loading available players:", error)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim() || !user) return

    try {
      const teamData = {
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || null,
        game: tournament?.game || "zealot_hockey",
        owner_id: user.id,
        is_active: true,
      }

      const { data: team, error: teamError } = await supabase.from("teams").insert(teamData).select().single()

      if (teamError) throw teamError

      // Add owner as team member
      const memberData = {
        team_id: team.id,
        user_id: user.id,
        role: "owner",
        is_active: true,
      }

      const { error: memberError } = await supabase.from("team_members").insert(memberData)

      if (memberError) throw memberError

      setNewTeamName("")
      setNewTeamDescription("")
      setCreateTeamDialogOpen(false)

      toast({
        title: "Team created!",
        description: `${newTeamName} has been created successfully.`,
      })

      await loadTeamData()
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Failed to create team",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const invitePlayer = async (playerId: string) => {
    if (!selectedTeam || !user) return

    try {
      const invitationData = {
        team_id: selectedTeam.id,
        invited_user_id: playerId,
        invited_by_id: user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      const { error } = await supabase.from("team_invitations").insert(invitationData)

      if (error) throw error

      toast({
        title: "Invitation sent!",
        description: "The player has been invited to join your team.",
      })

      await loadTeamData()
      await loadAvailablePlayers()
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "Failed to send invitation",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const registerTeamForTournament = async (teamId: string) => {
    if (!user) return

    try {
      const team = myTeams.find((t) => t.id === teamId)
      if (!team) return

      if (team.members.filter((m) => m.status === "active").length < maxPlayersPerTeam) {
        toast({
          title: "Team not ready",
          description: `Your team needs ${maxPlayersPerTeam} confirmed members to register.`,
          variant: "destructive",
        })
        return
      }

      const registrationData = {
        tournament_id: tournamentId,
        team_id: teamId,
        is_active: true,
      }

      const { error } = await supabase.from("tournament_teams").insert(registrationData)

      if (error) throw error

      toast({
        title: "Team registered!",
        description: `${team.name} has been registered for the tournament.`,
      })

      await loadTeamData()
      if (onTeamRegistered) {
        onTeamRegistered()
      }
    } catch (error) {
      console.error("Error registering team:", error)
      toast({
        title: "Failed to register team",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredPlayers = availablePlayers.filter((player) =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team system...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Team Management
          </h2>
          <p className="text-muted-foreground">Create teams, invite players, and register for tournaments</p>
        </div>
        <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
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
              <div>
                <Label htmlFor="team-description">Description (Optional)</Label>
                <Input
                  id="team-description"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Describe your team"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Team size: {maxPlayersPerTeam} players</p>
                <p>Game: {tournament?.game || "Zealot Hockey"}</p>
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
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Created</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to invite players and register for tournaments
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList>
            <TabsTrigger value="teams">My Teams</TabsTrigger>
            <TabsTrigger value="invitations">Manage Invitations</TabsTrigger>
            <TabsTrigger value="players">Find Players</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {team.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {team.members.filter((m) => m.status === "active").length}/{team.max_members} members
                          </p>
                        </div>
                      </div>
                      {team.tournament_registered ? (
                        <Badge className="bg-green-500">Registered</Badge>
                      ) : (
                        <Badge variant="outline">Not Registered</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {team.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {member.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1">{member.username}</span>
                          {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                          <span className="text-muted-foreground">{member.elo_rating}</span>
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{team.members.length - 3} more members</p>
                      )}
                    </div>

                    {team.invitations.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {team.invitations.length} pending invitation{team.invitations.length !== 1 ? "s" : ""}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!team.tournament_registered ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            registerTeamForTournament(team.id)
                          }}
                          disabled={team.members.filter((m) => m.status === "active").length < maxPlayersPerTeam}
                        >
                          Register for Tournament
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" disabled>
                          <Check className="h-3 w-3 mr-1" />
                          Registered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            {selectedTeam ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {selectedTeam.name} - Invitations
                  </CardTitle>
                  <CardDescription>Manage pending invitations and team members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTeam.invitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No pending invitations</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTeam.invitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Avatar>
                            <AvatarFallback>{invitation.invited_username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{invitation.invited_username}</p>
                            <p className="text-sm text-muted-foreground">Invited by {invitation.invited_by_username}</p>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a team to manage invitations</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Players
                </CardTitle>
                <CardDescription>Search for players to invite to your team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search players by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={!selectedTeam}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>

                {!selectedTeam && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>Select a team first to invite players</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar>
                        <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.username}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {player.elo_rating} ELO
                          </span>
                          <span>
                            {player.total_games > 0
                              ? `${Math.round((player.wins / player.total_games) * 100)}% WR`
                              : "New Player"}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => invitePlayer(player.id)}
                        disabled={!selectedTeam || selectedTeam.members.length >= selectedTeam.max_members}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Invite
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
