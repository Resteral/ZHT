"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Crown, Target, Zap, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { captainSelectionService } from "@/lib/services/captain-selection-service"

interface EloCaptainSelectorProps {
  tournamentId: string
  participants: Array<{
    user_id: string
    users: {
      username: string
      elo_rating: number
    }
  }>
  onCaptainsSelected?: (captains: any[]) => void
  isCreator?: boolean
}

export function EloCaptainSelector({
  tournamentId,
  participants,
  onCaptainsSelected,
  isCreator = false,
}: EloCaptainSelectorProps) {
  const [captains, setCaptains] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [canSelect, setCanSelect] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  const loadCurrentCaptains = async () => {
    try {
      const currentCaptains = await captainSelectionService.getCurrentCaptains(tournamentId)
      setCaptains(currentCaptains)

      if (onCaptainsSelected && currentCaptains.length > 0) {
        onCaptainsSelected(currentCaptains)
      }
    } catch (error) {
      console.error("[v0] Error loading current captains:", error)
    }
  }

  const checkSelectionEligibility = async () => {
    try {
      const eligibility = await captainSelectionService.canSelectCaptains(tournamentId)
      setCanSelect(eligibility.canSelect)
    } catch (error) {
      console.error("[v0] Error checking selection eligibility:", error)
    }
  }

  const selectCaptainsAutomatically = async () => {
    setSelecting(true)
    try {
      console.log("[v0] Starting automatic captain selection...")

      const result = await captainSelectionService.selectCaptainsAutomatically(tournamentId)

      if (result.success) {
        setCaptains(result.captains)
        toast.success(result.message)

        if (onCaptainsSelected) {
          onCaptainsSelected(result.captains)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("[v0] Error in automatic captain selection:", error)
      toast.error("Failed to select captains automatically")
    } finally {
      setSelecting(false)
    }
  }

  const resetCaptains = async () => {
    setLoading(true)
    try {
      const success = await captainSelectionService.resetCaptains(tournamentId)

      if (success) {
        setCaptains([])
        toast.success("Captain selections reset")

        if (onCaptainsSelected) {
          onCaptainsSelected([])
        }
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

  useEffect(() => {
    loadCurrentCaptains()
    checkSelectionEligibility()
  }, [tournamentId, participants])

  // Sort participants by ELO for display
  const sortedParticipants = [...participants].sort(
    (a, b) => (b.users?.elo_rating || 1200) - (a.users?.elo_rating || 1200),
  )

  const highestEloPlayer = sortedParticipants[0]
  const lowestEloPlayer = sortedParticipants[sortedParticipants.length - 1]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            ELO-Based Captain Selection
          </CardTitle>
          <CardDescription>
            Highest ELO becomes tournament owner. Lowest ELO captain gets first pick advantage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {captains.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No captains selected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canSelect
                    ? "Ready to select captains based on ELO ratings"
                    : "Need at least 2 players to select captains"}
                </p>
              </div>

              {isCreator && canSelect && (
                <Button
                  onClick={selectCaptainsAutomatically}
                  disabled={selecting || !canSelect}
                  className="w-full"
                  size="lg"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {selecting ? "Selecting Captains..." : "Auto-Select Captains"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {captains.map((captain) => (
                  <Card key={captain.id} className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{captain.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{captain.username}</div>
                          <div className="text-sm text-muted-foreground">{captain.elo_rating} ELO</div>
                        </div>
                        <Badge
                          variant={captain.captain_type === "high_elo" ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <Crown className="h-3 w-3" />
                          {captain.captain_type === "high_elo" ? "Owner" : "First Pick"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground">
                        {captain.captain_type === "high_elo"
                          ? "Tournament owner with highest ELO rating"
                          : "Gets first pick advantage with lowest ELO rating"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {isCreator && (
                <Button onClick={resetCaptains} disabled={loading} variant="outline" className="w-full bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? "Resetting..." : "Reset Captain Selection"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {participants.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>ELO Preview</CardTitle>
            <CardDescription>Preview of automatic captain selection based on current player pool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Tournament Owner</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-yellow-100 text-yellow-700">
                        {(highestEloPlayer?.users?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{highestEloPlayer?.users?.username || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">
                        {highestEloPlayer?.users?.elo_rating || 1200} ELO (Highest)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">First Pick Captain</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {(lowestEloPlayer?.users?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{lowestEloPlayer?.users?.username || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">
                        {lowestEloPlayer?.users?.elo_rating || 1200} ELO (Lowest)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                ELO difference:{" "}
                {(highestEloPlayer?.users?.elo_rating || 1200) - (lowestEloPlayer?.users?.elo_rating || 1200)} points
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
