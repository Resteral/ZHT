"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Gavel } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { toast } from "sonner"
import { CaptainSelectionInterface } from "./captain-selection-interface"

interface PlayerPoolManagementProps {
  tournamentId: string
  tournament: any
  isOrganizer?: boolean
}

interface PoolPlayer {
  id: string
  user_id: string
  username: string
  elo_rating: number
  status: "available" | "drafted" | "captain" | "withdrawn"
  captain_type?: "high_elo" | "low_elo"
  team_id?: string
  draft_position?: number
  joined_at: string
  csv_stats?: {
    goals: number
    assists: number
    saves: number
    games_played: number
  }
}

interface PoolStats {
  total_players: number
  available_players: number
  drafted_players: number
  captains: number
  withdrawn_players: number
  average_elo: number
  pool_utilization: number
}

export function PlayerPoolManagement({ tournamentId, tournament, isOrganizer = false }: PlayerPoolManagementProps) {
  const [players, setPlayers] = useState<PoolPlayer[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<PoolPlayer[]>([])
  const [stats, setStats] = useState<PoolStats>({
    total_players: 0,
    available_players: 0,
    drafted_players: 0,
    captains: 0,
    withdrawn_players: 0,
    average_elo: 1200,
    pool_utilization: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("elo_desc")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()

  const loadPlayerPool = async () => {
    try {
      console.log("[v0] Loading player pool for tournament:", tournamentId)

      const { data: poolData, error } = await supabase
        .from("tournament_player_pool")
        .select(`
          id,
          user_id,
          status,
          captain_type,
          team_id,
          draft_position,
          created_at,
          users (
            username,
            elo_rating
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (error) throw error

      const userIds = (poolData || []).map((entry) => entry.user_id)
      const { data: draftConflicts } = await supabase
        .from("captain_draft_participants")
        .select(`
          user_id,
          captain_drafts!inner(status, match_id)
        `)
        .in("user_id", userIds)
        .in("captain_drafts.status", ["waiting", "drafting", "active"])
        .neq("captain_drafts.match_id", tournamentId) // Exclude current tournament's draft

      const conflictingUserIds = new Set(draftConflicts?.map((d) => d.user_id) || [])

      const processedPlayers: PoolPlayer[] = (poolData || []).map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        username: entry.users?.username || "Unknown Player",
        elo_rating: entry.users?.elo_rating || 1200,
        status: conflictingUserIds.has(entry.user_id) ? "withdrawn" : entry.status, // Mark conflicting players as withdrawn
        captain_type: entry.captain_type,
        team_id: entry.team_id,
        draft_position: entry.draft_position,
        joined_at: entry.created_at,
        csv_stats: {
          goals: 0,
          assists: 0,
          saves: 0,
          games_played: 0,
        },
      }))

      if (conflictingUserIds.size > 0) {
        await supabase
          .from("tournament_player_pool")
          .update({
            status: "withdrawn",
            updated_at: new Date().toISOString(),
          })
          .eq("tournament_id", tournamentId)
          .in("user_id", Array.from(conflictingUserIds))

        console.log("[v0] Marked", conflictingUserIds.size, "conflicting players as withdrawn")
      }

      setPlayers(processedPlayers)
      calculateStats(processedPlayers)
      console.log("[v0] Loaded player pool:", processedPlayers.length, "players")
    } catch (error) {
      console.error("[v0] Error loading player pool:", error)
      toast.error("Failed to load player pool")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (playerList: PoolPlayer[]) => {
    const total = playerList.length
    const available = playerList.filter((p) => p.status === "available").length
    const drafted = playerList.filter((p) => p.status === "drafted").length
    const captains = playerList.filter((p) => p.status === "captain").length
    const withdrawn = playerList.filter((p) => p.status === "withdrawn").length
    const avgElo = total > 0 ? Math.round(playerList.reduce((sum, p) => sum + p.elo_rating, 0) / total) : 1200
    const maxPoolSize = tournament?.player_pool_settings?.max_pool_size || tournament?.max_participants || 50
    const utilization = (total / maxPoolSize) * 100

    setStats({
      total_players: total,
      available_players: available,
      drafted_players: drafted,
      captains,
      withdrawn_players: withdrawn,
      average_elo: avgElo,
      pool_utilization: utilization,
    })
  }

  const filterAndSortPlayers = () => {
    let filtered = [...players]

    if (searchTerm) {
      filtered = filtered.filter((player) => player.username.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((player) => player.status === statusFilter)
    }

    switch (sortBy) {
      case "elo_desc":
        filtered.sort((a, b) => b.elo_rating - a.elo_rating)
        break
      case "elo_asc":
        filtered.sort((a, b) => a.elo_rating - b.elo_rating)
        break
      case "name_asc":
        filtered.sort((a, b) => a.username.localeCompare(b.username))
        break
      case "joined_desc":
        filtered.sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
        break
      case "joined_asc":
        filtered.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
        break
    }

    setFilteredPlayers(filtered)
  }

  const selectCaptainsAutomatically = async () => {
    if (!isOrganizer) return

    try {
      const availablePlayers = players.filter((p) => p.status === "available")
      const playerIds = availablePlayers.map((p) => p.user_id)

      const { data: draftConflicts } = await supabase
        .from("captain_draft_participants")
        .select(`
          user_id,
          captain_drafts!inner(status)
        `)
        .in("user_id", playerIds)
        .in("captain_drafts.status", ["waiting", "drafting", "active"])

      if (draftConflicts && draftConflicts.length > 0) {
        toast.error("Cannot select captains: some players are in active drafts")
        return
      }

      const result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

      if (result.success) {
        toast.success(result.message)
        loadPlayerPool()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error selecting captains:", error)
      toast.error("Failed to select captains")
    }
  }

  const resetCaptains = async () => {
    if (!isOrganizer) return

    try {
      const success = await captainSelectionService.resetCaptains(tournamentId)

      if (success) {
        toast.success("Captains reset successfully")
        loadPlayerPool()
      } else {
        toast.error("Failed to reset captains")
      }
    } catch (error) {
      console.error("[v0] Error resetting captains:", error)
      toast.error("Failed to reset captains")
    }
  }

  const removePlayerFromPool = async (playerId: string) => {
    if (!isOrganizer) return

    try {
      const { error } = await supabase
        .from("tournament_player_pool")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        })
        .eq("id", playerId)

      if (error) throw error

      toast.success("Player removed from pool")
      loadPlayerPool()
    } catch (error) {
      console.error("[v0] Error removing player:", error)
      toast.error("Failed to remove player")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "captain":
        return <Gavel className="h-4 w-4 text-yellow-500" />
      case "drafted":
        return <Gavel className="h-4 w-4 text-green-500" />
      case "withdrawn":
        return <Gavel className="h-4 w-4 text-red-500" />
      default:
        return <Gavel className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "captain":
        return "bg-yellow-500"
      case "drafted":
        return "bg-green-500"
      case "withdrawn":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  useEffect(() => {
    loadPlayerPool()

    const subscription = supabase
      .channel(`player-pool-management-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_player_pool",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log("[v0] Player pool change detected:", payload.eventType)
          loadPlayerPool()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tournamentId])

  useEffect(() => {
    filterAndSortPlayers()
  }, [players, searchTerm, statusFilter, sortBy])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadPlayerPool, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading player pool management...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pool Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-500" />
            Player Pool Statistics
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <span className="text-muted-foreground">Auto-refresh</span>
              </div>
              <Button onClick={loadPlayerPool} variant="outline" size="sm">
                <Gavel className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.total_players}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.available_players}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.captains}</div>
              <div className="text-sm text-muted-foreground">Captains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{stats.drafted_players}</div>
              <div className="text-sm text-muted-foreground">Drafted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{stats.average_elo}</div>
              <div className="text-sm text-muted-foreground">Avg ELO</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-500">{stats.pool_utilization.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Pool Full</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Pool Capacity</span>
              <span>
                {stats.total_players}/
                {tournament?.player_pool_settings?.max_pool_size || tournament?.max_participants || 50}
              </span>
            </div>
            <Progress value={stats.pool_utilization} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="players" className="space-y-4">
        <TabsList>
          <TabsTrigger value="players">Player Management</TabsTrigger>
          <TabsTrigger value="captains">Captain Selection</TabsTrigger>
          <TabsTrigger value="settings">Pool Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Filter & Search Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Search Players</Label>
                  <div className="relative">
                    <Gavel className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Players</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="captain">Captains</SelectItem>
                      <SelectItem value="drafted">Drafted</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elo_desc">ELO (High to Low)</SelectItem>
                      <SelectItem value="elo_asc">ELO (Low to High)</SelectItem>
                      <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                      <SelectItem value="joined_desc">Recently Joined</SelectItem>
                      <SelectItem value="joined_asc">First Joined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Results</Label>
                  <div className="text-sm text-muted-foreground pt-2">
                    Showing {filteredPlayers.length} of {stats.total_players} players
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Player Pool ({filteredPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="min-w-[2.5rem]">
                          #{index + 1}
                        </Badge>
                        {getStatusIcon(player.status)}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {player.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="font-medium">{player.username}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Gavel className="h-3 w-3" />
                            <span>{player.elo_rating} ELO</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gavel className="h-3 w-3" />
                            <span>{new Date(player.joined_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(player.status)}>
                        {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                      </Badge>

                      {player.captain_type && (
                        <Badge variant="outline" className="text-xs">
                          {player.captain_type.replace("_", " ")}
                        </Badge>
                      )}

                      {player.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}

                      {isOrganizer && player.status === "available" && (
                        <Button
                          onClick={() => removePlayerFromPool(player.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Gavel className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredPlayers.length === 0 && (
                  <div className="text-center py-8">
                    <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Players Found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "No players have joined the pool yet"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captains" className="space-y-4">
          <CaptainSelectionInterface
            tournamentId={tournamentId}
            tournament={tournament}
            isOrganizer={isOrganizer}
            isTournamentCreator={user?.id === tournament?.created_by}
            onCaptainsSelected={(captains) => {
              console.log("[v0] Captains selected:", captains)
              loadPlayerPool() // Refresh the player pool data
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Player Pool Settings
              </CardTitle>
              <CardDescription>Configure player pool parameters and tournament settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Pool Configuration</h4>
                  <div className="space-y-2">
                    <Label>Max Pool Size</Label>
                    <div className="text-2xl font-bold text-blue-500">
                      {tournament?.player_pool_settings?.max_pool_size || tournament?.max_participants || 50}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Teams</Label>
                    <div className="text-2xl font-bold text-green-500">
                      {tournament?.player_pool_settings?.max_teams || 8}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Players per Team</Label>
                    <div className="text-2xl font-bold text-purple-500">
                      {tournament?.player_pool_settings?.players_per_team || 5}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Draft Settings</h4>
                  <div className="space-y-2">
                    <Label>Draft Type</Label>
                    <Badge variant="outline" className="text-sm">
                      {tournament?.player_pool_settings?.draft_type || "auction"}
                    </Badge>
                  </div>
                  {tournament?.player_pool_settings?.draft_type === "auction" && (
                    <div className="space-y-2">
                      <Label>Auction Budget</Label>
                      <div className="text-2xl font-bold text-orange-500">
                        ${tournament?.player_pool_settings?.auction_budget || 500}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Tournament Status</Label>
                    <Badge className={tournament?.status === "registration" ? "bg-blue-500" : "bg-green-500"}>
                      {tournament?.status || "registration"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
