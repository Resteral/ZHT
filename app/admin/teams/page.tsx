"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Users, Trophy, Target, DollarSign } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Team {
  id: string
  name: string
  game: string
  owner: string
  players: number
  maxPlayers: number
  wins: number
  losses: number
  winRate: number
  value: number
  league: string
  status: string
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTeams: 0,
    activeTeams: 0,
    totalValue: 0,
    championships: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          game,
          owner_id,
          max_players,
          created_at,
          users!teams_owner_id_fkey(username),
          team_members(user_id),
          leagues(name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedTeams: Team[] =
        teamsData?.map((team) => ({
          id: team.id,
          name: team.name || "Unnamed Team",
          game: team.game || "Unknown",
          owner: team.users?.username || "Unknown Owner",
          players: team.team_members?.length || 0,
          maxPlayers: team.max_players || 5,
          wins: 0, // Would need match results to calculate
          losses: 0, // Would need match results to calculate
          winRate: 0, // Would need match results to calculate
          value: Math.floor(Math.random() * 20000) + 5000, // Placeholder calculation
          league: team.leagues?.name || "No League",
          status: team.team_members?.length >= team.max_players ? "active" : "recruiting",
        })) || []

      setTeams(formattedTeams)

      setStats({
        totalTeams: formattedTeams.length,
        activeTeams: formattedTeams.filter((t) => t.status === "active").length,
        totalValue: formattedTeams.reduce((sum, t) => sum + t.value, 0),
        championships: 0, // Would need tournament results to calculate
      })
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "recruiting":
        return "secondary"
      case "disbanded":
        return "outline"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">Manage teams, rosters, and team performance</p>
        </div>
        <Link href="/admin/teams/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">Across all leagues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTeams}</div>
            <p className="text-xs text-muted-foreground">Currently competing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Combined team values</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Championships</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.championships}</div>
            <p className="text-xs text-muted-foreground">Titles won</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search teams by name, owner, or league..." className="pl-10" />
            </div>
            <Button variant="outline">Filter by Game</Button>
            <Button variant="outline">Filter by League</Button>
            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>{teams.length} teams shown</CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams found</p>
              <p className="text-sm">Create your first team to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Details</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Roster</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">{team.league}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{team.game}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{team.owner}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {team.players}/{team.maxPlayers} players
                        </div>
                        <div className="text-muted-foreground">
                          {team.maxPlayers - team.players > 0 ? `${team.maxPlayers - team.players} spots open` : "Full"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {team.wins}-{team.losses}
                        </div>
                        <div className="text-muted-foreground">{team.winRate}% win rate</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${team.value.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(team.status)}>{team.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/teams/${team.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                        <Link href={`/admin/teams/${team.id}/edit`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
