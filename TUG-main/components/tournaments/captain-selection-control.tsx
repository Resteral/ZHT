"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Crown, Star, Shuffle, Target, AlertTriangle, ArrowRight } from "lucide-react"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface CaptainSelectionControlProps {
  tournament: {
    id: string
    name: string
    status: string
    created_by: string
  }
  onCaptainsSelected?: (captains: any[]) => void
}

export function CaptainSelectionControl({ tournament, onCaptainsSelected }: CaptainSelectionControlProps) {
  const [captains, setCaptains] = useState<any[]>([])
  const [playerPool, setPlayerPool] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectionMethod, setSelectionMethod] = useState<"automatic" | "manual" | "random">("automatic")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [eligibility, setEligibility] = useState<any>(null)
  const { user } = useAuth()

  const isCreator = tournament.created_by === user?.id
  const canSelectCaptains = tournament.status === "registration" && isCreator

  useEffect(() => {
    loadCaptains()
    loadPlayerPool()
    checkEligibility()
  }, [tournament.id])

  const loadCaptains = async () => {
    try {
      const currentCaptains = await captainSelectionService.getCurrentCaptains(tournament.id)
      setCaptains(currentCaptains)
    } catch (error) {
      console.error("[v0] Error loading captains:", error)
    }
  }

  const loadPlayerPool = async () => {
    try {
      const { data } = await captainSelectionService.supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournament.id)
        .eq("status", "available")
        .order("users(elo_rating)", { ascending: false })

      if (data) {
        const processedPlayers = data.map((entry: any) => ({
          id: entry.user_id,
          username: entry.users?.username || "Unknown",
          elo_rating: entry.users?.elo_rating || 1200,
        }))
        setPlayerPool(processedPlayers)
        console.log("[v0] Loaded player pool:", processedPlayers.length, "players")
      } else {
        await populatePlayerPool()
      }
    } catch (error) {
      console.error("[v0] Error loading player pool:", error)
      await populatePlayerPool()
    }
  }

  const populatePlayerPool = async () => {
    try {
      console.log("[v0] Populating player pool from tournament participants...")

      const { data: participants } = await captainSelectionService.supabase
        .from("tournament_participants")
        .select(`
          user_id,
          status,
          users(username, elo_rating)
        `)
        .eq("tournament_id", tournament.id)
        .eq("status", "registered")

      if (participants && participants.length > 0) {
        const poolEntries = participants.map((participant: any) => ({
          tournament_id: tournament.id,
          user_id: participant.user_id,
          status: "available",
          created_at: new Date().toISOString(),
        }))

        const { error: insertError } = await captainSelectionService.supabase
          .from("tournament_player_pool")
          .insert(poolEntries)

        if (insertError) {
          console.error("[v0] Error populating player pool:", insertError)
        } else {
          console.log("[v0] Successfully populated player pool with", poolEntries.length, "players")
          await loadPlayerPool()
        }
      }
    } catch (error) {
      console.error("[v0] Error populating player pool:", error)
    }
  }

  const checkEligibility = async () => {
    try {
      const result = await captainSelectionService.canSelectCaptains(tournament.id)
      setEligibility(result)
    } catch (error) {
      console.error("[v0] Error checking eligibility:", error)
    }
  }

  const handleSelectCaptains = async () => {
    if (!canSelectCaptains || !eligibility?.canSelect) return

    setLoading(true)
    try {
      console.log("[v0] Starting captain selection with method:", selectionMethod)
      console.log("[v0] Selected players for manual:", selectedPlayers)
      console.log("[v0] Player pool size:", playerPool.length)

      let result

      switch (selectionMethod) {
        case "automatic":
          console.log("[v0] Calling automatic captain selection...")
          result = await captainSelectionService.selectCaptainsAutomatically(tournament.id)
          break
        case "manual":
          if (selectedPlayers.length === 0) {
            toast.error("Please select players for manual captain selection")
            return
          }
          console.log("[v0] Calling manual captain selection with players:", selectedPlayers)
          result = await captainSelectionService.selectCaptainsManually(tournament.id, selectedPlayers)
          break
        case "random":
          console.log("[v0] Calling random captain selection...")
          result = await captainSelectionService.selectCaptainsRandomly(tournament.id)
          break
        default:
          throw new Error("Invalid selection method")
      }

      console.log("[v0] Captain selection result:", result)

      if (result.success) {
        toast.success(result.message)
        setCaptains(result.captains)

        const { error: statusError } = await captainSelectionService.supabase
          .from("tournaments")
          .update({
            status: "captain_selection",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tournament.id)

        if (statusError) {
          console.error("[v0] Error updating tournament status:", statusError)
        } else {
          console.log("[v0] Tournament status updated to captain_selection")
        }

        onCaptainsSelected?.(result.captains)
        await loadPlayerPool()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error selecting captains:", error)
      toast.error("Failed to select captains")
    } finally {
      setLoading(false)
    }
  }

  const handleResetCaptains = async () => {
    if (!canSelectCaptains) return

    setLoading(true)
    try {
      const success = await captainSelectionService.resetCaptains(tournament.id)
      if (success) {
        toast.success("Captains reset successfully")
        setCaptains([])
        setSelectedPlayers([])
        await loadPlayerPool()
        await checkEligibility()
      } else {
        toast.error("Failed to reset captains")
      }
    } catch (error) {
      console.error("[v0] Error resetting captains:", error)
      toast.error("Failed to reset captains")
    } finally {
      setLoading(false)
    }
  }

  const getCaptainTypeColor = (type: string) => {
    switch (type) {
      case "high_elo":
        return "bg-red-500/20 text-red-700 border-red-500/30"
      case "mid_elo":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
      case "low_elo":
        return "bg-green-500/20 text-green-700 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/30"
    }
  }

  return (
    <Card className="border-l-4 border-l-slate-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-slate-500" />
          Captain Selection
          {captains.length > 0 && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {captains.length} Selected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Select team captains for the tournament draft
          {eligibility && <span className="block mt-1 text-sm">{eligibility.message}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!eligibility?.canSelect && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{eligibility?.message || "Checking captain selection eligibility..."}</AlertDescription>
          </Alert>
        )}

        {!isCreator && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Only the tournament creator can select captains</AlertDescription>
          </Alert>
        )}

        {captains.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Selected Captains
            </h4>
            <div className="grid gap-3">
              {captains.map((captain) => (
                <div
                  key={captain.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{captain.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{captain.username}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-3 w-3" />
                      <span>{captain.elo_rating} ELO</span>
                    </div>
                  </div>
                  <Badge className={getCaptainTypeColor(captain.captain_type)}>
                    {captain.captain_type.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  console.log("[v0] Proceeding to draft with captains:", captains)
                  onCaptainsSelected?.(captains)
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Proceed to Draft ({captains.length} Captains Ready)
              </Button>
              {canSelectCaptains && (
                <Button onClick={handleResetCaptains} disabled={loading} variant="outline" className="bg-transparent">
                  Reset Captains
                </Button>
              )}
            </div>
          </div>
        )}

        {captains.length === 0 && canSelectCaptains && eligibility?.canSelect && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selection Method</label>
              <Select value={selectionMethod} onValueChange={(value: any) => setSelectionMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Automatic (ELO-based)
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Manual Selection
                    </div>
                  </SelectItem>
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      Random Selection
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectionMethod === "manual" && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Players as Captains</label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {playerPool.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPlayers.includes(player.id)
                          ? "bg-slate-100 border border-slate-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        if (selectedPlayers.includes(player.id)) {
                          setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id))
                        } else {
                          setSelectedPlayers([...selectedPlayers, player.id])
                        }
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{player.username}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating}</span>
                        </div>
                      </div>
                      {selectedPlayers.includes(player.id) && <Crown className="h-4 w-4 text-slate-600" />}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedPlayers.length} / {eligibility?.playerCount || 0} available players
                </p>
              </div>
            )}

            <Button
              onClick={handleSelectCaptains}
              disabled={loading || (selectionMethod === "manual" && selectedPlayers.length === 0)}
              className="w-full"
            >
              <Crown className="h-4 w-4 mr-2" />
              {loading ? "Selecting Captains..." : `Select Captains (${selectionMethod})`}
            </Button>
          </div>
        )}

        {playerPool.length > 0 && captains.length === 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Registered Players ({playerPool.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {playerPool.slice(0, 10).map((player) => (
                <div key={player.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{player.username}</span>
                  <Badge variant="outline" className="text-xs">
                    {player.elo_rating}
                  </Badge>
                </div>
              ))}
              {playerPool.length > 10 && (
                <p className="text-xs text-muted-foreground">...and {playerPool.length - 10} more players</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
