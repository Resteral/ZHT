"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Users, Trophy, Star, Target, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { userManagementService } from "@/lib/services/user-management-service"

interface TournamentPlayerPoolDraftProps {
  tournamentId: string
  isOrganizer?: boolean
  isHosted?: boolean
}

interface PlayerPoolSettings {
  max_teams: number
  players_per_team: number
  max_pool_size: number
  draft_type: "auction" | "snake" | "linear"
  auction_budget?: number
  allow_public_visibility: boolean
  override_enabled: boolean
  last_override_timestamp?: string
}

export function TournamentPlayerPoolDraft({
  tournamentId,
  isOrganizer = false,
  isHosted = false,
}: TournamentPlayerPoolDraftProps) {
  const [settings, setSettings] = useState<PlayerPoolSettings>({
    max_teams: 4,
    players_per_team: 5,
    max_pool_size: 50,
    draft_type: "auction",
    auction_budget: 500,
    allow_public_visibility: false,
    override_enabled: false,
  })
  const [playerPool, setPlayerPool] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTournamentSettings()
    loadPlayerPool()
    loadTeams()
  }, [tournamentId])

  const loadTournamentSettings = async () => {
    try {
      const { data } = await supabase.from("tournaments").select("player_pool_settings").eq("id", tournamentId).single()

      if (data?.player_pool_settings) {
        setSettings(data.player_pool_settings)
      }
    } catch (error) {
      console.error("Error loading tournament settings:", error)
    }
  }

  const loadPlayerPool = async () => {
    try {
      const { data: poolData } = await supabase
        .from("tournament_player_pool")
        .select(`
          *,
          users(username, elo_rating),
          player_analytics(goals, assists, saves, games_played)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })

      if (poolData) {
        const processedPlayers = poolData
          .map((entry: any, index: number) => {
            const stats = entry.player_analytics || { goals: 0, assists: 0, saves: 0, games_played: 0 }
            const totalScore = stats.goals + stats.assists + Math.abs(stats.saves)

            return {
              id: entry.user_id,
              username: entry.users?.username || "Unknown",
              elo_rating: entry.users?.elo_rating || 1000,
              csv_stats: stats,
              total_score: totalScore,
              rank: index + 1,
            }
          })
          .sort((a, b) => b.total_score - a.total_score)
          .map((player, index) => ({ ...player, rank: index + 1 }))

        setPlayerPool(processedPlayers)
      }
    } catch (error) {
      console.error("Error loading player pool:", error)
    }
  }

  const loadTeams = async () => {
    try {
      const { data: teamsData } = await supabase
        .from("tournament_teams")
        .select(`
          *,
          team_members(
            user_id,
            users(username, elo_rating)
          )
        `)
        .eq("tournament_id", tournamentId)

      if (teamsData) {
        setTeams(teamsData)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    }
  }

  const updateSettings = async (newSettings: Partial<PlayerPoolSettings>) => {
    if (!isOrganizer) return

    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ player_pool_settings: updatedSettings })
        .eq("id", tournamentId)

      if (error) throw error
    } catch (error) {
      console.error("Error updating settings:", error)
    }
  }

  const overridePlayerPool = async (newSettings: Partial<PlayerPoolSettings>) => {
    if (!isOrganizer) return

    const updatedSettings = {
      ...settings,
      ...newSettings,
      override_enabled: true,
      last_override_timestamp: new Date().toISOString(),
    }
    setSettings(updatedSettings)

    try {
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({
          player_pool_settings: updatedSettings,
          status: isHosted ? "active" : "registration",
        })
        .eq("id", tournamentId)

      if (tournamentError) throw tournamentError

      if (isHosted && newSettings.allow_public_visibility) {
        await supabase
          .from("tournament_player_pool")
          .update({
            visibility: "public",
            updated_at: new Date().toISOString(),
          })
          .eq("tournament_id", tournamentId)
      }

      console.log("[v0] Player pool settings overridden successfully")
    } catch (error) {
      console.error("Error overriding player pool settings:", error)
    }
  }

  const hostTournament = async () => {
    if (!isOrganizer) return

    try {
      const user = await userManagementService.getCurrentUser()
      console.log("[v0] Host user verified:", user.username)

      const { data: existingEntry } = await supabase
        .from("tournament_player_pool")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single()

      if (!existingEntry) {
        console.log("[v0] Adding host to player pool")
        const { error: poolError } = await supabase.from("tournament_player_pool").insert({
          tournament_id: tournamentId,
          user_id: user.id,
          status: "available",
          created_at: new Date().toISOString(),
        })

        if (poolError) {
          console.error("[v0] Error adding host to player pool:", poolError)
        } else {
          console.log("[v0] Host successfully added to player pool")
        }
      } else {
        console.log("[v0] Host already in player pool")
      }

      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({
          status: "active",
          hosted_at: new Date().toISOString(),
        })
        .eq("id", tournamentId)

      if (tournamentError) throw tournamentError

      await supabase
        .from("tournament_player_pool")
        .update({
          visibility: "public",
          updated_at: new Date().toISOString(),
        })
        .eq("tournament_id", tournamentId)

      const updatedSettings = {
        ...settings,
        allow_public_visibility: true,
      }
      setSettings(updatedSettings)

      await loadPlayerPool()

      console.log("[v0] Tournament hosted, player pool made public, and host added to pool")
    } catch (error) {
      console.error("Error hosting tournament:", error)
    }
  }

  const joinPlayerPool = async () => {
    setLoading(true)
    try {
      console.log("[v0] Attempting to join player pool for tournament:", tournamentId)

      const user = await userManagementService.getCurrentUser()
      console.log("[v0] User verified:", user.username)

      const { data: existingEntry } = await supabase
        .from("tournament_player_pool")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .single()

      if (existingEntry) {
        console.log("[v0] User already in player pool")
        return
      }

      const { error } = await supabase.from("tournament_player_pool").insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: "available",
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("[v0] Error joining player pool:", error)
        throw error
      }

      console.log("[v0] Successfully joined player pool")
      await loadPlayerPool()
    } catch (error) {
      console.error("[v0] Error joining player pool:", error)
      alert("Failed to join player pool. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const currentPoolSize = playerPool.length
  const totalTeamSlots = settings.max_teams * settings.players_per_team
  const poolUtilization = (currentPoolSize / settings.max_pool_size) * 100

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-500" />
            Tournament Player Pool Draft
            {isHosted && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                Hosted
              </Badge>
            )}
            {settings.allow_public_visibility && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                Public Pool
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {settings.max_teams} teams • {settings.players_per_team} players per team • {settings.max_pool_size} max
            pool size
            {settings.override_enabled && <span className="text-orange-600 ml-2">• Settings Overridden</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{currentPoolSize}</div>
              <div className="text-sm text-muted-foreground">Players in Pool</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{settings.max_teams}</div>
              <div className="text-sm text-muted-foreground">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{totalTeamSlots}</div>
              <div className="text-sm text-muted-foreground">Total Slots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{poolUtilization.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Pool Filled</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Player Pool Progress</span>
              <span>
                {currentPoolSize}/{settings.max_pool_size}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(poolUtilization, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tournament Pool Settings
              {isHosted && (
                <Button variant="outline" size="sm" onClick={() => overridePlayerPool(settings)} className="ml-auto">
                  Override Settings
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Configure team count and player pool settings
              {isHosted && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                  ⚠️ Tournament is hosted. Changes will override current settings and affect all participants.
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number of Teams</Label>
                <Select
                  value={settings.max_teams.toString()}
                  onValueChange={(value) => updateSettings({ max_teams: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Teams</SelectItem>
                    <SelectItem value="6">6 Teams</SelectItem>
                    <SelectItem value="8">8 Teams</SelectItem>
                    <SelectItem value="10">10 Teams</SelectItem>
                    <SelectItem value="12">12 Teams</SelectItem>
                    <SelectItem value="16">16 Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Players per Team</Label>
                <Select
                  value={settings.players_per_team.toString()}
                  onValueChange={(value) => updateSettings({ players_per_team: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="5">5 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                    <SelectItem value="8">8 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Pool Size</Label>
                <Select
                  value={settings.max_pool_size.toString()}
                  onValueChange={(value) => updateSettings({ max_pool_size: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Players</SelectItem>
                    <SelectItem value="40">40 Players</SelectItem>
                    <SelectItem value="50">50 Players</SelectItem>
                    <SelectItem value="60">60 Players</SelectItem>
                    <SelectItem value="80">80 Players</SelectItem>
                    <SelectItem value="100">100 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Draft Type</Label>
                <Select
                  value={settings.draft_type}
                  onValueChange={(value: "auction" | "snake" | "linear") => updateSettings({ draft_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auction">Auction Draft</SelectItem>
                    <SelectItem value="snake">Snake Draft</SelectItem>
                    <SelectItem value="linear">Linear Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.draft_type === "auction" && (
                <div className="space-y-2">
                  <Label>Auction Budget ($)</Label>
                  <Select
                    value={settings.auction_budget?.toString() || "500"}
                    onValueChange={(value) => updateSettings({ auction_budget: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">$300</SelectItem>
                      <SelectItem value="500">$500</SelectItem>
                      <SelectItem value="750">$750</SelectItem>
                      <SelectItem value="1000">$1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Public Visibility</Label>
                <Select
                  value={settings.allow_public_visibility ? "public" : "private"}
                  onValueChange={(value) => overridePlayerPool({ allow_public_visibility: value === "public" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Pool</SelectItem>
                    <SelectItem value="public">Public Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isHosted && (
                <div className="space-y-2">
                  <Label>Tournament Status</Label>
                  <Button onClick={hostTournament} className="w-full bg-green-600 hover:bg-green-700">
                    Host Tournament
                  </Button>
                </div>
              )}
            </div>

            {settings.override_enabled && settings.last_override_timestamp && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Last override: {new Date(settings.last_override_timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Player Pool ({currentPoolSize})
                {settings.allow_public_visibility && (
                  <Badge variant="outline" className="text-xs">
                    Open to All
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Players available for draft, ranked by CSV performance
                {isHosted && settings.allow_public_visibility && (
                  <span className="block mt-1 text-green-600">
                    This pool is visible to all users and open for joining
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(currentPoolSize < settings.max_pool_size || (isHosted && settings.allow_public_visibility)) && (
                <div className="mb-4">
                  <Button onClick={joinPlayerPool} disabled={loading} className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    {loading ? "Joining..." : "Join Player Pool"}
                  </Button>
                  {isHosted && settings.allow_public_visibility && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Pool is publicly accessible - anyone can join
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {playerPool.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge variant="secondary" className="min-w-[2.5rem]">
                      #{player.rank}
                    </Badge>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{player.csv_stats.goals}G</span>
                          <span>{player.csv_stats.assists}A</span>
                          <span>{Math.abs(player.csv_stats.saves)}S</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          <span>{player.total_score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {playerPool.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No players in the pool yet</p>
                    <p className="text-sm">Be the first to join!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Team Structure
              </CardTitle>
              <CardDescription>Tournament team configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{settings.max_teams}</div>
                  <div className="text-sm text-muted-foreground">Teams</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{settings.players_per_team}</div>
                  <div className="text-sm text-muted-foreground">Per Team</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Slots:</span>
                  <span className="font-medium">{totalTeamSlots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pool Size:</span>
                  <span className="font-medium">{settings.max_pool_size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Draft Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {settings.draft_type}
                  </Badge>
                </div>
                {settings.draft_type === "auction" && (
                  <div className="flex justify-between text-sm">
                    <span>Budget:</span>
                    <span className="font-medium">${settings.auction_budget}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Players will be drafted into {settings.max_teams} teams of {settings.players_per_team} players each
                  using {settings.draft_type} format.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
