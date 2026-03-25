"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Trophy, Clock, DollarSign, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface Team {
  id: string
  name: string
  logo_url?: string
  member_count: number
  captain_id: string
}

interface TournamentRegistrationProps {
  tournament: any
  onRegistrationComplete: () => void
}

export function TournamentRegistration({ tournament, onRegistrationComplete }: TournamentRegistrationProps) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (tournament.is_team_based && user) {
      loadUserTeams()
    }
  }, [tournament.is_team_based, user])

  const loadUserTeams = async () => {
    if (!user) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: userTeams, error } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          logo_url,
          captain_id,
          team_members!inner(user_id)
        `)
        .or(`captain_id.eq.${user.id},team_members.user_id.eq.${user.id}`)

      if (error) throw error

      // Count members for each team
      const teamsWithCounts = await Promise.all(
        (userTeams || []).map(async (team) => {
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact" })
            .eq("team_id", team.id)
            .eq("status", "accepted")

          return {
            ...team,
            member_count: (count || 0) + 1, // +1 for captain
          }
        }),
      )

      setTeams(teamsWithCounts)
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!user) return

    if (tournament.status !== "registration" && tournament.status !== "registration_open") {
      console.error("Registration is closed for this tournament")
      return
    }

    if (tournament.participant_count >= tournament.max_participants) {
      console.error("Tournament is full")
      return
    }

    setRegistering(true)
    try {
      const supabase = createClient()

      if (tournament.is_team_based && !selectedTeam) {
        throw new Error("Please select a team")
      }

      const registrationData: any = {
        tournament_id: tournament.id,
        user_id: user.id,
        team_name: tournament.is_team_based ? teams.find((t) => t.id === selectedTeam)?.name : user.username,
      }

      if (tournament.is_team_based) {
        registrationData.team_id = selectedTeam
      }

      const { error: registrationError } = await supabase.from("tournament_participants").insert(registrationData)

      if (registrationError) throw registrationError

      // Award participation reward
      const { error: walletError } = await supabase.rpc("update_user_balance", {
        user_id: user.id,
        amount: 25,
      })

      if (walletError) {
        console.error("Error updating wallet balance:", walletError)
      }

      // Record transaction
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 25,
        transaction_type: "tournament_participation",
        description: `Tournament participation reward - ${tournament.name}`,
        reference_id: tournament.id,
      })

      // Create notification
      await supabase.from("tournament_notifications").insert({
        tournament_id: tournament.id,
        participant_id: user.id,
        notification_type: "registration_confirmed",
        title: "Tournament Registration Confirmed",
        message: `You have successfully registered for ${tournament.name}. You've earned $25 participation reward!`,
      })

      onRegistrationComplete()
    } catch (error) {
      console.error("Error registering for tournament:", error)
    } finally {
      setRegistering(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Please sign in to register for tournaments</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Tournament Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tournament Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{tournament.is_team_based ? "Teams" : "Players"}</p>
            <p className="font-bold">
              {tournament.participant_count}/{tournament.max_participants}
            </p>
          </div>
          <div className="text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Entry Fee</p>
            <p className="font-bold">${tournament.entry_fee}</p>
          </div>
          <div className="text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Prize Pool</p>
            <p className="font-bold text-green-600">${tournament.prize_pool}</p>
          </div>
          <div className="text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-bold">{tournament.duration_hours || 72}h</p>
          </div>
        </div>

        {/* Participation Reward */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-800 dark:text-green-200">Instant Reward</h4>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Earn <strong>$25</strong> instantly when you register for this tournament!
          </p>
        </div>

        {/* Team Selection for Team-based Tournaments */}
        {tournament.is_team_based && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Select Your Team</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which team you want to represent in this tournament
              </p>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No teams available</p>
                <p className="text-sm text-muted-foreground">Create a team first to participate</p>
              </div>
            ) : (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={team.logo_url || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{team.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {team.member_count} members
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Registration Button */}
        <Button
          onClick={handleRegister}
          disabled={
            registering ||
            (tournament.is_team_based && !selectedTeam) ||
            (tournament.status !== "registration" && tournament.status !== "registration_open") ||
            tournament.participant_count >= tournament.max_participants
          }
          className="w-full"
          size="lg"
        >
          {registering ? (
            "Registering..."
          ) : tournament.status !== "registration" && tournament.status !== "registration_open" ? (
            "Registration Closed"
          ) : tournament.participant_count >= tournament.max_participants ? (
            "Tournament Full"
          ) : (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Register {tournament.is_team_based ? "Team" : ""} (+$25 Reward)
            </>
          )}
        </Button>

        {tournament.entry_fee > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Entry fee of ${tournament.entry_fee} will be deducted from your wallet balance
          </p>
        )}
      </CardContent>
    </Card>
  )
}
