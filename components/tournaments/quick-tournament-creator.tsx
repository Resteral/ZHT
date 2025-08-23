"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { tournamentService } from "@/lib/services/tournament-service"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Trophy, Users, Clock } from "lucide-react"

export function QuickTournamentCreator() {
  const { user } = useAuth()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuickTournament = async (type: "snake" | "linear" | "auction") => {
    if (!user?.id) {
      setError("Please log in to create tournaments")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      console.log("[v0] Creating quick tournament:", type)

      const tournamentData = {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Draft Tournament`,
        description: `Quick ${type} draft tournament with immediate registration`,
        game: "hockey",
        tournament_type: `${type}_draft`,
        max_participants: 16,
        max_pool_size: 30,
        entry_fee: 0,
        prize_pool: 100,
        team_based: true,
        player_pool_settings: {
          enabled: true,
          draft_type: type,
          registration_open: true,
          max_pool_size: 30,
          num_teams: 4,
          players_per_team: 4,
          pick_time_limit: type === "auction" ? 30 : 60,
          auto_start: false,
          trading_enabled: true,
        },
        start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      }

      const tournament = await tournamentService.createTournament(tournamentData, user.id)
      console.log("[v0] Tournament created successfully:", tournament)

      // Automatically join the tournament
      try {
        await tournamentService.joinTournamentPool(tournament.id, user.id)
        console.log("[v0] Automatically joined tournament pool")
      } catch (joinError) {
        console.log("[v0] Join error (might already be joined):", joinError)
      }

      // Redirect to the tournament page
      router.push(`/tournaments/${tournament.id}`)
    } catch (err: any) {
      console.error("[v0] Error creating tournament:", err)
      setError(err.message || "Failed to create tournament")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quick Tournament Creator
          </CardTitle>
          <CardDescription>
            Create and join a tournament instantly. Perfect for testing the tournament system!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => createQuickTournament("snake")}
              disabled={isCreating}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <Trophy className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Snake Draft</div>
                <div className="text-xs text-muted-foreground">Classic back-and-forth</div>
              </div>
            </Button>

            <Button
              onClick={() => createQuickTournament("linear")}
              disabled={isCreating}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <Users className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Linear Draft</div>
                <div className="text-xs text-muted-foreground">Round-robin style</div>
              </div>
            </Button>

            <Button
              onClick={() => createQuickTournament("auction")}
              disabled={isCreating}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <Clock className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Auction Draft</div>
                <div className="text-xs text-muted-foreground">Bidding system</div>
              </div>
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {isCreating && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700 text-sm">Creating tournament and joining you automatically...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Join Tournaments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div>
              <p className="font-medium">Create a tournament above</p>
              <p className="text-sm text-muted-foreground">Click any draft type to create and auto-join</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div>
              <p className="font-medium">Or find existing tournaments</p>
              <p className="text-sm text-muted-foreground">Check the dashboard for "Join Now (+$25)" buttons</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <p className="font-medium">Get instant rewards</p>
              <p className="text-sm text-muted-foreground">Earn $25 immediately when joining tournaments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
