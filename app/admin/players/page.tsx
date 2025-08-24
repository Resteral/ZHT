"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Player {
  id: string
  username: string
  display_name?: string
  elo_rating: number
  wins: number
  losses: number
  total_games: number
  balance: number
  last_active: string
  created_at: string
}

export default function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("elo_rating", { ascending: false })
        .limit(50)

      if (error) throw error

      setPlayers(data || [])
    } catch (error) {
      console.error("Error fetching players:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter((player) => player.username.toLowerCase().includes(searchTerm.toLowerCase()))

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses
    return total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0"
  }

  const getTrend = (wins: number, losses: number) => {
    const winRate = Number.parseFloat(getWinRate(wins, losses))
    return winRate >= 60 ? "up" : "down"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Player Management</h1>
          <p className="text-muted-foreground">Manage all players and their statistics</p>
        </div>
        <Link href="/admin/players/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        </Link>
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
              <Input
                placeholder="Search players by username..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">Filter by ELO</Button>
            <Button variant="outline">Filter by Activity</Button>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>{filteredPlayers.length} players total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>ELO Rating</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Games Played</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{player.username}</div>
                        <div className="text-sm text-muted-foreground">@{player.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.elo_rating || 1200}</span>
                      {getTrend(player.wins, player.losses) === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getWinRate(player.wins, player.losses)}%</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{player.total_games || 0} total</div>
                      <div className="text-muted-foreground">
                        {player.wins || 0}W - {player.losses || 0}L
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${(player.balance || 0).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {player.last_active ? new Date(player.last_active).toLocaleDateString() : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
