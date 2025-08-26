"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Trophy,
  DollarSign,
  Clock,
  Crown,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentJoinInterfaceProps {
  tournamentId: string
  tournament?: any
}

interface TeamRegistration {
  id: string
  team_name: string
  captain_id: string
  tournament_id: string
  status: string
  created_at: string
  captain: {
    username: string
    elo_rating: number
  }
}

export function TournamentJoinInterface({ tournamentId, tournament: initialTournament }: TournamentJoinInterfaceProps) {
  const [tournament, setTournament] = useState(initialTournament)
  const [registeredTeams, setRegisteredTeams] = useState<TeamRegistration[]>([])
  const [loading, setLoading] = useState(!initialTournament)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")
  const [showTeamForm, setShowTeamForm] = useState(false)

  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournamentData = async () => {
    try {
      console.log("[v0] Loading tournament team data for:", tournamentId)

      // Load tournament details if not provided
      if (!tournament) {
        const { data: tournamentData, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single()

        if (error) {
          console.error("[v0] Error loading tournament:", error)
          return
        }
        setTournament(tournamentData)
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (teamsError) {
        console.error("[v0] Error loading teams:", teamsError)
      } else if (teamsData && teamsData.length > 0) {
        // Get team details and captain info
        const teamIds = teamsData.map((t) => t.team_id)
        const { data: teamDetails } = await supabase
          .from("teams")
          .select("id, name, owner_id, users!teams_owner_id_fkey(username, elo_rating)")
          .in("id", teamIds)

        const teamsWithDetails: TeamRegistration[] = teamsData.map((teamReg) => {
          const teamDetail = teamDetails?.find((t) => t.id === teamReg.team_id)
          return {
            id: teamReg.id,
            team_name: teamDetail?.name || "Unknown Team",
            captain_id: teamDetail?.owner_id || "",
            tournament_id: teamReg.tournament_id,
            status: teamReg.is_active ? "active" : "inactive",
            created_at: teamReg.registered_at,
            captain: {
              username: teamDetail?.users?.username || "Unknown",
              elo_rating: teamDetail?.users?.elo_rating || 1200,
            },
          }
        })

        setRegisteredTeams(teamsWithDetails)
      }
    } catch (error) {
      console.error("[v0] Error loading tournament data:", error)
      toast.error("Failed to load tournament data")
    } finally {
      setLoading(false)
    }
  }

  const registerTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name")
      return
    }

    setJoining(true)
    try {
      console.log("[v0] Registering team for tournament:", tournamentId)

      let userId = user?.id

      if (isAuthenticated && user) {
        // Verify authenticated user exists
        const { data: existingUser, error: userCheckError } = await supabase
          .from("users")
          .select("id, username")
          .eq("id", user.id)
          .single()

        if (userCheckError || !existingUser) {
          // Create user record if needed
          const { data: newUser, error: userCreateError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split("@")[0] || `User_${user.id.slice(0, 8)}`,
              elo_rating: 1200,
              total_games: 0,
              wins: 0,
              losses: 0,
              balance: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id, username")
            .single()

          if (userCreateError) {
            console.error("[v0] Error creating user record:", userCreateError)
            toast.error("Failed to create user record. Please try again.")
            return
          }
        }

        userId = user.id
      } else {
        // Create anonymous user
        const anonymousUsername = `Guest_${Math.random().toString(36).substring(2, 8)}`
        const anonymousUserId = crypto.randomUUID()

        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert({
            id: anonymousUserId,
            username: anonymousUsername,
            elo_rating: 1200,
            total_games: 0,
            wins: 0,
            losses: 0,
            balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id, username")
          .single()

        if (userError) {
          console.error("[v0] Error creating anonymous user:", userError)
          toast.error("Failed to create guest account. Please try again.")
          return
        }

        userId = newUser.id
      }

      // Create team first
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          description: teamDescription.trim() || `Team for ${tournament.name}`,
          owner_id: userId,
          game: tournament.game || "zealot_hockey",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, name")
        .single()

      if (teamError) {
        console.error("[v0] Error creating team:", teamError)
        toast.error("Failed to create team. Please try again.")
        return
      }

      // Register team for tournament
      const { error: registrationError } = await supabase.from("tournament_teams").insert({
        tournament_id: tournamentId,
        team_id: newTeam.id,
        is_active: true,
        registered_at: new Date().toISOString(),
      })

      if (registrationError) {
        console.error("[v0] Error registering team:", registrationError)
        toast.error("Failed to register team for tournament. Please try again.")
        return
      }

      toast.success(`Team "${teamName}" successfully registered!`)
      setTeamName("")
      setTeamDescription("")
      setShowTeamForm(false)
      await loadTournamentData() // Refresh data
    } catch (error) {
      console.error("[v0] Error registering team:", error)
      toast.error("Failed to register team")
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tournament...</p>
        </CardContent>
      </Card>
    )
  }

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Tournament not found</p>
        </CardContent>
      </Card>
    )
  }

  const currentTeams = registeredTeams.length
  const maxTeams = tournament.max_teams || 8
  const progressPercentage = (currentTeams / maxTeams) * 100

  const userTeam = registeredTeams.find((t) => t.captain_id === user?.id)
  const isUserRegistered = !!userTeam
  const isFull = currentTeams >= maxTeams
  const canRegister =
    !isUserRegistered &&
    !isFull &&
    (tournament.status === "active" ||
      tournament.status === "registration_open" ||
      tournament.status === "pending" ||
      tournament.status === "draft")

  console.log("[v0] Join button state:", {
    isUserRegistered,
    isFull,
    tournamentStatus: tournament.status,
    canRegister,
    showTeamForm,
    currentTeams,
    maxTeams,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registration":
      case "registration_open":
        return "bg-blue-500"
      case "in_progress":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "registration":
      case "registration_open":
        return "Registration Open"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return status.replace("_", " ").toUpperCase()
    }
  }

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <Badge className={getStatusColor(tournament.status)}>{getStatusText(tournament.status)}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Team Tournament
                </Badge>
              </div>
              <CardDescription className="text-base">{tournament.description}</CardDescription>
            </div>

            <Button onClick={loadTournamentData} variant="outline" size="sm" className="bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">Team Tournament</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="font-medium">
                  {currentTeams}/{maxTeams}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : "TBD"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="font-medium">${tournament.prize_pool?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Team Registration Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tournament Progress</span>
                <span className="font-medium">
                  {currentTeams}/{maxTeams} teams
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {canRegister && (
              <Button
                onClick={() => {
                  console.log("[v0] Register button clicked")
                  setShowTeamForm(true)
                }}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                disabled={showTeamForm}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showTeamForm
                  ? "Team Registration Form Open"
                  : `Register Team${tournament.entry_fee > 0 ? ` ($${tournament.entry_fee})` : ""}`}
              </Button>
            )}

            {!canRegister && (
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                Debug: isUserRegistered={isUserRegistered.toString()}, isFull={isFull.toString()}, status=
                {tournament.status}
              </div>
            )}

            {/* Team Registration Form */}
            {showTeamForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Register Your Team</CardTitle>
                  <CardDescription>Create and register a team for this tournament</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter your team name"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamDescription">Team Description (Optional)</Label>
                    <Textarea
                      id="teamDescription"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Describe your team..."
                      maxLength={200}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        console.log("[v0] Register team button clicked")
                        registerTeam()
                      }}
                      disabled={joining || !teamName.trim()}
                      className="flex-1"
                    >
                      {joining ? "Registering..." : "Register Team"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log("[v0] Cancel button clicked")
                        setShowTeamForm(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Messages */}
            {isUserRegistered && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your team "{userTeam?.team_name}" is registered for this tournament!
                </AlertDescription>
              </Alert>
            )}

            {isFull && !isUserRegistered && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This tournament is full. Check back later for new tournaments!</AlertDescription>
              </Alert>
            )}

            {!canRegister && !isUserRegistered && !isFull && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Registration is closed. Tournament is {getStatusText(tournament.status).toLowerCase()}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Details Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams ({currentTeams})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Tournament Type</h4>
                  <p className="text-sm text-muted-foreground">
                    Team-based tournament where premade teams compete against each other
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Entry Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    {tournament.entry_fee > 0 ? `$${tournament.entry_fee} entry fee per team` : "Free to join"}•
                    Register as team captain
                  </p>
                </div>
              </div>

              {tournament.entry_fee > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Entry Fee:</strong> ${tournament.entry_fee} per team
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registered Teams</span>
                <Badge variant="secondary">{currentTeams} teams</Badge>
              </CardTitle>
              <CardDescription>Teams registered for this tournament in order of registration.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {registeredTeams.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{team.team_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{team.team_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Captain: {team.captain.username} ({team.captain.elo_rating} ELO)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {team.captain_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          Your Team
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty team slots */}
                {Array.from({ length: maxTeams - currentTeams }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border-dashed border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Waiting for team...</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
