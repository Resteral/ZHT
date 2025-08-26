"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Zap, UserPlus, Trophy, Clock, DollarSign, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface TournamentSignupSystemProps {
  tournament: any
  onSignupComplete?: () => void
}

interface TeamInTournament {
  id: string
  team_id: string
  tournament_id: string
  registered_at: string
  teams: {
    id: string
    name: string
    description: string
    owner_id: string
    game: string
    users: {
      username: string
      elo_rating: number
    }
  }
}

export function TournamentSignupSystem({ tournament, onSignupComplete }: TournamentSignupSystemProps) {
  const [teamsInTournament, setTeamsInTournament] = useState<TeamInTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")
  const supabase = createClient()
  const { user, isAuthenticated } = useAuth()

  const loadTournamentTeams = async () => {
    try {
      console.log("[v0] Loading teams for tournament:", tournament.id)

      const { data, error } = await supabase
        .from("tournament_teams")
        .select(`
          id,
          team_id,
          tournament_id,
          registered_at,
          teams (
            id,
            name,
            description,
            owner_id,
            game,
            users:owner_id (
              username,
              elo_rating
            )
          )
        `)
        .eq("tournament_id", tournament.id)
        .eq("is_active", true)
        .order("registered_at", { ascending: true })

      if (error) throw error

      console.log("[v0] Loaded tournament teams:", data?.length || 0, "teams")
      setTeamsInTournament(data || [])
    } catch (err) {
      console.error("[v0] Error loading tournament teams:", err)
      toast.error("Failed to load tournament teams")
    } finally {
      setLoading(false)
    }
  }

  const registerTeamForTournament = async () => {
    setSigning(true)
    try {
      console.log("[v0] Registering team for tournament:", tournament.id)

      let userId = user?.id

      if (!userId) {
        // Create anonymous user for guests
        const anonymousUsername = `Guest_${Math.random().toString(36).substring(2, 8)}`

        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert({
            id: crypto.randomUUID(),
            username: anonymousUsername,
            elo_rating: 1200,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (userError) {
          console.error("[v0] Error creating anonymous user:", userError)
          toast.error("Failed to register team. Please try again.")
          return
        }

        userId = newUser.id
        console.log("[v0] Created anonymous user:", anonymousUsername)
      }

      // Create the team first
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          id: crypto.randomUUID(),
          name: teamName,
          description: teamDescription,
          owner_id: userId,
          game: tournament.game || "zealot_hockey",
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (teamError) {
        console.error("[v0] Error creating team:", teamError)
        throw teamError
      }

      // Check if team is already registered
      const { data: existingRegistration } = await supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", tournament.id)
        .eq("team_id", newTeam.id)
        .single()

      if (existingRegistration) {
        toast.error("This team is already registered for this tournament!")
        return
      }

      // Register team for tournament
      const { error: registrationError } = await supabase.from("tournament_teams").insert({
        tournament_id: tournament.id,
        team_id: newTeam.id,
        is_active: true,
        registered_at: new Date().toISOString(),
      })

      if (registrationError) {
        console.error("[v0] Error registering team:", registrationError)
        throw registrationError
      }

      // Add owner as team member
      await supabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: userId,
        role: "captain",
        joined_at: new Date().toISOString(),
        is_active: true,
      })

      if (user?.id) {
        const { error: walletError } = await supabase.rpc("update_user_balance", {
          user_id: user.id,
          amount: 50,
        })

        if (walletError) {
          console.error("Error updating wallet balance:", walletError)
        }

        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: 50,
          transaction_type: "tournament_participation",
          description: `Team tournament registration reward - ${tournament.name}`,
          reference_id: tournament.id,
        })

        toast.success(`Team "${teamName}" registered successfully! (+$50 reward)`)
      } else {
        toast.success(`Team "${teamName}" registered successfully as guest!`)
      }

      setTeamName("")
      setTeamDescription("")
      setShowTeamForm(false)
      loadTournamentTeams()
      onSignupComplete?.()
    } catch (err) {
      console.error("[v0] Error registering team:", err)
      toast.error(err instanceof Error ? err.message : "Failed to register team")
    } finally {
      setSigning(false)
    }
  }

  useEffect(() => {
    loadTournamentTeams()

    const subscription = supabase
      .channel(`tournament-teams-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_teams",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          console.log("[v0] Tournament teams change detected:", payload.eventType)

          if (payload.eventType === "INSERT") {
            toast.success("New team registered!")
          }

          loadTournamentTeams()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournament.id])

  const maxTeams = tournament.max_teams || 16
  const currentTeams = teamsInTournament.length
  const progressPercentage = Math.min((currentTeams / maxTeams) * 100, 100)
  const userTeam = teamsInTournament.find((t) => t.teams?.owner_id === user?.id)
  const isRegistered = !!userTeam
  const isFull = currentTeams >= maxTeams
  const canRegister = !isFull && !isRegistered

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team tournament signup...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tournament Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Team Tournament Registration
          </CardTitle>
          <CardDescription>Register your premade team to compete in this tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Teams</p>
              <p className="font-bold">
                {currentTeams}/{maxTeams}
              </p>
            </div>
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Entry Fee</p>
              <p className="font-bold">${tournament.entry_fee || 0}</p>
            </div>
            <div className="text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Prize Pool</p>
              <p className="font-bold text-green-600">${tournament.prize_pool || 0}</p>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {isFull ? "FULL" : "OPEN"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team Registration
          </CardTitle>
          <CardDescription>Create and register your team for this tournament</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Teams Registered</span>
              <span className="font-medium">
                {currentTeams}/{maxTeams}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Team Registration Reward */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Registration Reward</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Earn <strong>$50</strong> when you register your team!
            </p>
          </div>

          {!showTeamForm && canRegister && (
            <Button onClick={() => setShowTeamForm(true)} className="w-full" size="lg">
              <UserPlus className="h-4 w-4 mr-2" />
              Register New Team
            </Button>
          )}

          {showTeamForm && (
            <div className="space-y-4 p-4 border rounded-lg">
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
                <Button onClick={registerTeamForTournament} disabled={signing || !teamName.trim()} className="flex-1">
                  {signing ? "Registering..." : user ? "Register Team (+$50)" : "Register as Guest"}
                </Button>
                <Button variant="outline" onClick={() => setShowTeamForm(false)} disabled={signing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isRegistered && (
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Team "{userTeam?.teams?.name}" is registered!</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">Your team is ready to compete in this tournament.</p>
            </div>
          )}

          {isFull && !isRegistered && (
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-red-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Tournament is Full</span>
              </div>
              <p className="text-sm text-red-600 mt-1">Maximum number of teams have been registered.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Teams Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registered Teams</span>
            <Badge variant="secondary">{currentTeams} teams</Badge>
          </CardTitle>
          <CardDescription>Teams registered for this tournament, sorted by registration time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teamsInTournament.map((teamReg, index) => (
              <div key={teamReg.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(teamReg.teams?.name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{teamReg.teams?.name || "Unknown Team"}</div>
                    <div className="text-xs text-muted-foreground">
                      Captain: {teamReg.teams?.users?.username || "Unknown"}({teamReg.teams?.users?.elo_rating || 1200}{" "}
                      ELO)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  {teamReg.teams?.owner_id === user?.id && (
                    <Badge variant="outline" className="text-xs">
                      Your Team
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: maxTeams - currentTeams }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border-dashed border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">Waiting for team...</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
