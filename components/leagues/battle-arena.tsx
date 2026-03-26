"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sword, Trophy, DollarSign, Users, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface Battle {
  id: string
  team1: string
  team2: string
  pot_amount: number
  status: string
  winner?: string
  created_at: string
}

export function BattleArena() {
  const [potAmount, setPotAmount] = useState(50)
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    loadBattles()
  }, [])

  const loadBattles = async () => {
    try {
      const { data: wagerMatches, error } = await supabase
        .from("wager_matches")
        .select(`
          id,
          creator_id,
          opponent_id,
          wager_amount,
          status,
          winner_id,
          created_at,
          creator:users!creator_id(username),
          opponent:users!opponent_id(username),
          winner:users!winner_id(username)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedBattles: Battle[] =
        wagerMatches?.map((match) => ({
          id: match.id,
          team1: match.creator?.username || "Unknown Player",
          team2: match.opponent?.username || "Waiting for opponent",
          pot_amount: match.wager_amount * 2, // Total pot is double the wager
          status: match.status,
          winner: match.winner?.username,
          created_at: match.created_at,
        })) || []

      setBattles(formattedBattles)
    } catch (error) {
      console.error("Error loading battles:", error)
      setBattles([])
    } finally {
      setLoading(false)
    }
  }

  const createBattle = async () => {
    if (!user) {
      alert("Please log in to create a battle")
      return
    }

    try {
      const { error } = await supabase.rpc("create_wager_match", {
        p_wager_amount: potAmount,
        p_game_type: "1v1_battle",
      })

      if (error) throw error

      console.log("Creating battle with pot:", potAmount)
      loadBattles() // Reload battles after creation
    } catch (error) {
      console.error("Error creating battle:", error)
      alert("Failed to create battle. Please try again.")
    }
  }

  const joinBattle = async (battleId: string) => {
    if (!user) {
      alert("Please log in to join a battle")
      return
    }

    try {
      const { error } = await supabase.rpc("join_wager_match", {
        p_match_id: battleId,
      })

      if (error) throw error

      console.log("Joining battle:", battleId)
      loadBattles() // Reload battles after joining
    } catch (error) {
      console.error("Error joining battle:", error)
      alert("Failed to join battle. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading battles...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Battle Section */}
      <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-red-500" />
            Create 1v1 Team Battle
          </CardTitle>
          <CardDescription>Challenge another player to a team battle. Winner takes 75% of the pot!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pot">Pot Amount ($)</Label>
              <Input
                id="pot"
                type="number"
                min="10"
                max="500"
                value={potAmount}
                onChange={(e) => setPotAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Winner Gets</Label>
              <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                <DollarSign className="h-4 w-4" />
                {(potAmount * 0.75).toFixed(2)}
                <span className="text-sm text-muted-foreground">(75%)</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Battle Rules:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Winner receives 75% of the total pot</li>
              <li>• Platform keeps 25% as service fee</li>
              <li>• Battles are best-of-3 matches</li>
              <li>• Results verified automatically</li>
            </ul>
          </div>

          <Button onClick={createBattle} className="w-full" disabled={!user}>
            <Zap className="h-4 w-4 mr-2" />
            {user ? `Create Battle ($${potAmount})` : "Login to Create Battle"}
          </Button>
        </CardContent>
      </Card>

      {/* Active Battles */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Active Battles</h3>

        {battles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Sword className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No active battles</p>
              <p className="text-sm text-muted-foreground mt-2">Create the first battle to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {battles.map((battle) => (
              <Card key={battle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Battle
                    </CardTitle>
                    <Badge
                      variant={
                        battle.status === "completed"
                          ? "default"
                          : battle.status === "in_progress"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {battle.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="font-medium">{battle.team1}</p>
                        {battle.winner === battle.team1 && <Trophy className="h-4 w-4 text-yellow-500 mx-auto mt-1" />}
                      </div>
                      <div className="text-2xl font-bold text-muted-foreground">VS</div>
                      <div className="text-center">
                        <p className="font-medium">{battle.team2}</p>
                        {battle.winner === battle.team2 && <Trophy className="h-4 w-4 text-yellow-500 mx-auto mt-1" />}
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {battle.pot_amount} Pot
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Winner gets ${(battle.pot_amount * 0.75).toFixed(2)}
                    </p>
                  </div>

                  {battle.status === "pending" && battle.team2 === "Waiting for opponent" && (
                    <Button onClick={() => joinBattle(battle.id)} className="w-full" variant="outline" disabled={!user}>
                      {user ? "Join Battle" : "Login to Join"}
                    </Button>
                  )}

                  {battle.status === "completed" && battle.winner && (
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <p className="font-medium text-green-700">🏆 {battle.winner} Wins!</p>
                      <p className="text-sm text-muted-foreground">Earned ${(battle.pot_amount * 0.75).toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
