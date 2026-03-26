"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Star, DollarSign, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PremadeTeam {
  id: string
  name: string
  description: string
  game: string
  logo_url?: string
  overall_rating: number
  price: number
  available: boolean
  roster: Array<{
    user_id: string
    username: string
    position: string
    elo_rating: number
  }>
}

interface PremadeTeamsSelectorProps {
  onTeamSelect: (team: PremadeTeam) => void
  selectedGame?: string
}

export function PremadeTeamsSelector({ onTeamSelect, selectedGame }: PremadeTeamsSelectorProps) {
  const [teams, setTeams] = useState<PremadeTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<PremadeTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUserCreatedTeams()
  }, [selectedGame])

  const loadUserCreatedTeams = async () => {
    try {
      const { data: userTeams, error } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          description,
          game,
          logo_url,
          team_spots,
          created_by,
          team_members (
            user_id,
            users (
              username,
              elo_rating
            )
          )
        `)
        .eq("is_active", true)
        .eq(selectedGame ? "game" : "game", selectedGame || "omega_strikers")

      if (error) throw error

      const formattedTeams: PremadeTeam[] =
        userTeams?.map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description || `Professional ${team.game} team`,
          game: team.game,
          logo_url: team.logo_url,
          overall_rating: Math.floor(
            team.team_members?.reduce((sum: number, member: any) => sum + (member.users?.elo_rating || 1500), 0) /
              Math.max(team.team_members?.length || 1, 1),
          ),
          price: team.team_spots * 25, // $25 per team spot
          available: true,
          roster:
            team.team_members?.map((member: any) => ({
              user_id: member.user_id,
              username: member.users?.username || "Unknown",
              position: "Player",
              elo_rating: member.users?.elo_rating || 1500,
            })) || [],
        })) || []

      setTeams(formattedTeams)
    } catch (error) {
      console.error("Error loading user teams:", error)
      setTeams([]) // No mock data fallback
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTeam = (team: PremadeTeam) => {
    setSelectedTeam(team)
    onTeamSelect(team)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your teams...</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Teams Available</h3>
        <p className="text-muted-foreground mb-4">
          Create a team in your profile settings to participate in tournaments
        </p>
        <Button variant="outline" onClick={() => (window.location.href = "/settings")}>
          Create Your First Team
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Choose Your Team</h3>
        <p className="text-muted-foreground">Select from your created teams ready for competition</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card
            key={team.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleSelectTeam(team)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription>{team.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {team.overall_rating}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Players</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {team.roster.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {team.roster.slice(0, 3).map((player, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span>{player.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{player.position}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.elo_rating}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {team.roster.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{team.roster.length - 3} more players
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-lg font-semibold">
                  <DollarSign className="h-4 w-4" />
                  {team.price}
                </div>
                <Button
                  size="sm"
                  variant={selectedTeam?.id === team.id ? "default" : "outline"}
                  className="flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  {selectedTeam?.id === team.id ? "Selected" : "Select"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTeam && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h4 className="font-semibold">Team Selected: {selectedTeam.name}</h4>
              <p className="text-sm text-muted-foreground">
                Ready to compete with your team! Entry cost: ${selectedTeam.price}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
