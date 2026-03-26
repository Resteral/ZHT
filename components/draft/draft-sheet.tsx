"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Crown, Star, Target, DollarSign, Trophy, TrendingUp, ArrowUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface DraftSheetProps {
  draftType: "snake" | "auction" | "linear"
  teams: Array<{
    id: string
    name: string
    owner: string
    ownerId: string
    budget?: number
    budgetRemaining?: number
    players: Array<{
      id: string
      username: string
      elo_rating: number
      csvStats: { goals: number; assists: number; saves: number }
      draftCost?: number
      draftPosition?: number
    }>
  }>
  playerPool: Array<{
    id: string
    username: string
    elo_rating: number
    csvStats: { goals: number; assists: number; saves: number }
    totalScore: number
  }>
  currentTurn?: {
    teamIndex: number
    timeRemaining: number
  }
  onPlayerDraft?: (playerId: string, teamId: string, cost?: number) => void
  isUserTurn?: boolean
  userTeamId?: string
}

export function DraftSheet({
  draftType,
  teams,
  playerPool,
  currentTurn,
  onPlayerDraft,
  isUserTurn = false,
  userTeamId,
}: DraftSheetProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [recentlyDrafted, setRecentlyDrafted] = useState<string | null>(null)

  useEffect(() => {
    if (recentlyDrafted) {
      const timer = setTimeout(() => setRecentlyDrafted(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [recentlyDrafted])

  const handlePlayerSelect = (playerId: string) => {
    if (!isUserTurn || !onPlayerDraft) return

    const currentTeam = teams[currentTurn?.teamIndex || 0]
    if (!currentTeam) return

    onPlayerDraft(playerId, currentTeam.id)
    setRecentlyDrafted(playerId)
    setSelectedPlayer(null)
  }

  const getCurrentTeam = () => {
    if (!currentTurn || currentTurn.teamIndex >= teams.length) return null
    return teams[currentTurn.teamIndex]
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      {/* Current Turn Indicator */}
      {currentTurn && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">
                    {getCurrentTeam()?.name}'s Turn
                    {isUserTurn && <span className="text-primary ml-2">(Your Turn!)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">Owner: {getCurrentTeam()?.owner}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-500">{formatTime(currentTurn.timeRemaining)}</div>
                <div className="text-xs text-muted-foreground">Time Remaining</div>
              </div>
            </div>
            <Progress value={((120 - currentTurn.timeRemaining) / 120) * 100} className="mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Teams Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            Team Rosters & Ownership
          </CardTitle>
          <CardDescription>
            {draftType === "auction"
              ? "Auction draft - teams bid on players with budget constraints"
              : draftType === "snake"
                ? "Snake draft - alternating pick order each round"
                : "Linear draft - same pick order each round"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, index) => {
              const isCurrentTeam = currentTurn?.teamIndex === index
              const totalSpent = team.players.reduce((sum, p) => sum + (p.draftCost || 0), 0)
              const teamCsvScore = team.players.reduce(
                (sum, p) => sum + (p.csvStats.goals + p.csvStats.assists + p.csvStats.saves),
                0,
              )

              return (
                <motion.div
                  key={team.id}
                  layout
                  className={`${
                    isCurrentTeam && currentTurn ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""
                  }`}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {team.name}
                            <Crown className="h-4 w-4 text-amber-500" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            <strong>Owner:</strong> {team.owner}
                            {userTeamId === team.id && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Your Team
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{team.players.length}/6</Badge>
                          {draftType === "auction" && (
                            <div className="flex flex-col items-end mt-1">
                              <div className="text-sm text-emerald-700 font-medium">
                                ${team.budgetRemaining || (team.budget || 1000) - totalSpent}
                              </div>
                              <div className="text-xs text-muted-foreground">Spent: ${totalSpent}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 min-h-[200px]">
                        <AnimatePresence>
                          {team.players.length > 0 ? (
                            team.players.map((player, playerIndex) => (
                              <motion.div
                                key={player.id}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.3 }}
                                className={`flex items-center gap-2 p-2 bg-muted/50 rounded ${
                                  recentlyDrafted === player.id ? "bg-green-100 border-green-300" : ""
                                }`}
                              >
                                <Badge variant="secondary" className="text-xs min-w-[1.5rem]">
                                  {playerIndex + 1}
                                </Badge>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {player.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{player.username}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      <span>{player.elo_rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3" />
                                      <span>
                                        {player.csvStats.goals + player.csvStats.assists + player.csvStats.saves}
                                      </span>
                                    </div>
                                    {draftType === "auction" && player.draftCost && (
                                      <div className="flex items-center gap-1 text-emerald-700">
                                        <DollarSign className="h-3 w-3" />
                                        <span>${player.draftCost}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {recentlyDrafted === player.id && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500">
                                    <ArrowUp className="h-4 w-4" />
                                  </motion.div>
                                )}
                              </motion.div>
                            ))
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <div className="text-center">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No players drafted</p>
                                <p className="text-xs">Owner: {team.owner}</p>
                              </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Team Stats Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-blue-600">
                              <Target className="h-3 w-3" />
                              <span className="font-medium">CSV: {teamCsvScore}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span>
                                Avg ELO:{" "}
                                {team.players.length > 0
                                  ? Math.round(
                                      team.players.reduce((sum, p) => sum + p.elo_rating, 0) / team.players.length,
                                    )
                                  : 0}
                              </span>
                            </div>
                          </div>
                          {draftType === "auction" && (
                            <div className="text-emerald-700 font-medium">
                              Budget: ${team.budgetRemaining || (team.budget || 1000) - totalSpent}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Player Pool Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Available Player Pool ({playerPool.length})
          </CardTitle>
          <CardDescription>
            Players ranked by CSV performance (Goals + Assists + Saves)
            {isUserTurn && " - Click to draft a player"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {playerPool.map((player, index) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, y: -50 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedPlayer === player.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  } ${isUserTurn ? "hover:shadow-md" : "cursor-default"}`}
                  onClick={() => isUserTurn && setSelectedPlayer(player.id)}
                >
                  <Badge variant="secondary" className="min-w-[2rem]">
                    #{index + 1}
                  </Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{player.username}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span>{player.elo_rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{player.totalScore}</span>
                      </div>
                      <span>
                        {player.csvStats.goals}G {player.csvStats.assists}A {player.csvStats.saves}S
                      </span>
                    </div>
                  </div>
                  {isUserTurn && selectedPlayer === player.id && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayerSelect(player.id)
                      }}
                    >
                      {draftType === "auction" ? "Bid" : "Draft"}
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
