"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Crown, Mail, Settings, Trophy, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Team {
  id: string
  name: string
  logo_url?: string
  game: string
  max_spots: number
  current_spots: number
  created_at: string
  members: {
    id: string
    username: string
    role: "owner" | "member"
    status: "active" | "invited" | "pending"
  }[]
}

export function UserCreatedTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUserTeams()
  }, [])

  const fetchUserTeams = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch teams where user is owner or member
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members (
            id,
            user_id,
            role,
            status,
            users (username)
          )
        `)
        .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`)

      if (error) throw error

      const formattedTeams =
        teamsData?.map((team) => ({
          id: team.id,
          name: team.name,
          logo_url: team.logo_url,
          game: team.game,
          max_spots: team.max_spots,
          current_spots: team.team_members?.filter((m) => m.status === "active").length || 0,
          created_at: team.created_at,
          members:
            team.team_members?.map((member) => ({
              id: member.id,
              username: member.users?.username || "Unknown",
              role: member.role,
              status: member.status,
            })) || [],
        })) || []

      setTeams(formattedTeams)
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teams Created</h3>
          <p className="text-muted-foreground mb-4">Create your first team to compete in tournaments and matches</p>
          <Button asChild>
            <Link href="/settings?tab=teams">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card key={team.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={team.logo_url || "/placeholder.svg"} alt={team.name} />
                  <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Badge variant="outline">{team.game}</Badge>
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/settings?tab=teams&team=${team.id}`}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Roster</span>
              <span className="font-medium">
                {team.current_spots}/{team.max_spots} players
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(team.current_spots / team.max_spots) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Team Members</div>
              <div className="space-y-1">
                {team.members.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span>{member.username}</span>
                      {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                    </div>
                    <Badge variant={member.status === "active" ? "secondary" : "outline"} className="text-xs">
                      {member.status === "invited" ? "Invited" : member.status === "pending" ? "Pending" : "Active"}
                    </Badge>
                  </div>
                ))}
                {team.members.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{team.members.length - 3} more members</div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" size="sm">
                <Trophy className="h-3 w-3 mr-1" />
                Enter Tournament
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/settings?tab=teams&team=${team.id}`}>
                  <Mail className="h-3 w-3 mr-1" />
                  Invite
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
