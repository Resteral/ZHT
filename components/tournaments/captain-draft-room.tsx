"use client"

import { useState, useEffect } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import {
  Crown,
  Users,
  Star,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { EnhancedCard } from "@/components/ui/enhanced-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { ProgressRing } from "@/components/ui/progress-ring"

interface CaptainDraftRoomProps {
  tournamentId: string
  captains: any[]
  playerPool: any[]
  onPlayerDrafted?: (playerId: string, teamId: string) => void
}

export function CaptainDraftRoom({ tournamentId, captains, playerPool, onPlayerDrafted }: CaptainDraftRoomProps) {
  const [teams, setTeams] = useState<any[]>([])
  const [currentPick, setCurrentPick] = useState<any>(null)
  const [draftOrder, setDraftOrder] = useState<string[]>([])
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [draftActive, setDraftActive] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>(playerPool)
  const [draftHistory, setDraftHistory] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [pickNumber, setPickNumber] = useState(1)
  const { user } = useAuth()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    initializeTeams()
    setupDraftOrder()
  }, [captains])

  useEffect(() => {
    if (draftActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeExpired()
            return 60
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [draftActive, timeRemaining])

  const initializeTeams = () => {
    const initialTeams = captains.map((captain, index) => ({
      id: `team-${index + 1}`,
      name: `Team ${captain.username}`,
      captain: captain,
      players: [captain],
      color: index === 0 ? "blue" : "red",
      budget: 100,
      pickCount: 0,
    }))
    setTeams(initialTeams)
  }

  const setupDraftOrder = () => {
    if (captains.length < 2) return

    // Snake draft order: Team 1, Team 2, Team 2, Team 1, etc.
    const order = []
    const maxRounds = Math.ceil(availablePlayers.length / 2)

    for (let round = 1; round <= maxRounds; round++) {
      if (round % 2 === 1) {
        // Odd rounds: normal order
        order.push(`team-1`, `team-2`)
      } else {
        // Even rounds: reverse order
        order.push(`team-2`, `team-1`)
      }
    }

    setDraftOrder(order)
    setCurrentPick({ teamId: order[0], pickIndex: 0 })
  }

  const handlePlayerDraft = async (playerId: string) => {
    if (!currentPick || !draftActive) return

    const player = availablePlayers.find((p) => p.id === playerId)
    if (!player) return

    const team = teams.find((t) => t.id === currentPick.teamId)
    if (!team) return

    // Update teams
    const updatedTeams = teams.map((t) => {
      if (t.id === currentPick.teamId) {
        return {
          ...t,
          players: [...t.players, player],
          pickCount: t.pickCount + 1,
        }
      }
      return t
    })
    setTeams(updatedTeams)

    // Remove player from available pool
    setAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId))

    // Add to draft history
    const draftEntry = {
      round: currentRound,
      pick: pickNumber,
      team: team.name,
      player: player.username,
      elo: player.elo_rating,
      timestamp: new Date(),
    }
    setDraftHistory((prev) => [draftEntry, ...prev])

    // Move to next pick
    const nextPickIndex = currentPick.pickIndex + 1
    if (nextPickIndex < draftOrder.length) {
      setCurrentPick({ teamId: draftOrder[nextPickIndex], pickIndex: nextPickIndex })
      setPickNumber(pickNumber + 1)

      if (nextPickIndex % 2 === 0) {
        setCurrentRound(currentRound + 1)
      }
    } else {
      // Draft complete
      setDraftActive(false)
      setCurrentPick(null)
      toast.success("Draft completed! Teams are ready for tournament.")
    }

    // Reset timer
    setTimeRemaining(60)

    // Notify parent component
    onPlayerDrafted?.(playerId, currentPick.teamId)

    toast.success(`${player.username} drafted by ${team.name}`)
  }

  const handleTimeExpired = () => {
    if (!currentPick || availablePlayers.length === 0) return

    // Auto-draft highest ELO available player
    const highestEloPlayer = availablePlayers.sort((a, b) => b.elo_rating - a.elo_rating)[0]
    handlePlayerDraft(highestEloPlayer.id)
    toast.warning("Time expired! Auto-drafted highest ELO player.")
  }

  const startDraft = () => {
    if (captains.length < 2 || availablePlayers.length === 0) return
    setDraftActive(true)
    setTimeRemaining(60)
    toast.success("Draft started! Captains can now pick their teams.")
  }

  const isCurrentUserTurn = () => {
    if (!currentPick || !user) return false
    const currentTeam = teams.find((t) => t.id === currentPick.teamId)
    return currentTeam?.captain.id === user.id
  }

  const getDraftProgress = () => {
    const totalPicks = Math.min(availablePlayers.length + draftHistory.length, teams.length * 5) // Assuming max 5 players per team
    const completedPicks = draftHistory.length
    return totalPicks > 0 ? (completedPicks / totalPicks) * 100 : 0
  }

  return (
    <div className="space-y-6">
      {/* Draft Header */}
      <EnhancedCard variant="tournament" glowEffect className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Captain Draft Room
                </CardTitle>
                <Badge
                  className={`${draftActive ? "bg-green-500 text-white animate-pulse" : "bg-gray-500 text-white"}`}
                >
                  {draftActive ? "Live Draft" : "Waiting"}
                </Badge>
              </div>
              <CardDescription className="text-base">
                {draftActive
                  ? `Round ${currentRound} • Pick ${pickNumber} • ${availablePlayers.length} players remaining`
                  : "Waiting for draft to begin"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-4">
              <ProgressRing progress={getDraftProgress()} size={80} color="info" showPercentage />
              {draftActive && currentPick && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{timeRemaining}s</div>
                  <div className="text-sm text-muted-foreground">Time Left</div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </EnhancedCard>

      {/* Current Pick Indicator */}
      <AnimatePresence>
        {draftActive && currentPick && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <EnhancedCard
              variant={isCurrentUserTurn() ? "premium" : "default"}
              glowEffect={isCurrentUserTurn()}
              className="border-2 border-dashed"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <Target className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {teams.find((t) => t.id === currentPick.teamId)?.name}'s Turn
                      </h3>
                      <p className="text-muted-foreground">
                        {isCurrentUserTurn() ? "Your turn to pick!" : "Waiting for captain to select a player"}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <Progress value={(timeRemaining / 60) * 100} className="w-32 mb-2" />
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {timeRemaining}s remaining
                    </div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teams Display */}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <EnhancedCard
              variant={team.color === "blue" ? "tournament" : "captain"}
              glowEffect={currentPick?.teamId === team.id}
              className={`relative overflow-hidden ${
                currentPick?.teamId === team.id ? "ring-2 ring-primary ring-opacity-50" : ""
              }`}
            >
              {currentPick?.teamId === team.id && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50">
                  <motion.div
                    className="h-full bg-white/50"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-amber-500" />
                    <div>
                      <CardTitle className="text-xl">{team.name}</CardTitle>
                      <CardDescription>
                        Captain: {team.captain.username} ({team.captain.elo_rating} ELO)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {team.players.length}/5
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {team.players.map((player: any, playerIndex: number) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: playerIndex * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        playerIndex === 0 ? "bg-amber-50 border border-amber-200" : "bg-muted/30"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={`${
                            playerIndex === 0 ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
                          } font-bold`}
                        >
                          {player.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{player.username}</span>
                          {playerIndex === 0 && <Crown className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{player.elo_rating} ELO</span>
                        </div>
                      </div>
                      {playerIndex === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Captain
                        </Badge>
                      )}
                    </motion.div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 5 - team.players.length) }).map((_, idx) => (
                    <div key={idx} className="p-3 border-2 border-dashed border-muted rounded-lg text-center">
                      <Users className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Empty Slot</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </motion.div>
        ))}
      </div>

      {/* Draft Interface */}
      <Tabs defaultValue="players" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Available Players ({availablePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Draft History ({draftHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          <EnhancedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Available Players
                {isCurrentUserTurn() && (
                  <Badge className="bg-green-500/20 text-green-700 border-green-500/30 animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Your Turn!
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {availablePlayers
                    .sort((a, b) => b.elo_rating - a.elo_rating)
                    .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group"
                      >
                        <EnhancedCard
                          hoverScale={false}
                          className={`cursor-pointer transition-all ${
                            isCurrentUserTurn() && draftActive
                              ? "hover:border-primary hover:shadow-lg"
                              : "cursor-not-allowed opacity-60"
                          }`}
                          onClick={() => {
                            if (isCurrentUserTurn() && draftActive) {
                              handlePlayerDraft(player.id)
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="min-w-[2rem] font-mono">
                                #{index + 1}
                              </Badge>
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {player.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{player.username}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3" />
                                  <span>{player.elo_rating} ELO</span>
                                </div>
                              </div>
                              {isCurrentUserTurn() && draftActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ArrowRight className="h-4 w-4 text-primary" />
                                </motion.div>
                              )}
                            </div>
                          </CardContent>
                        </EnhancedCard>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>

              {availablePlayers.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Players Drafted!</h3>
                  <p className="text-muted-foreground">The draft is complete. Teams are ready for tournament play.</p>
                </div>
              )}
            </CardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <EnhancedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Draft History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {draftHistory.map((entry, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="min-w-[4rem]">
                          R{entry.round} P{entry.pick}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{entry.player}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.elo} ELO • {entry.team}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{entry.timestamp.toLocaleTimeString()}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {draftHistory.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Draft History</h3>
                  <p className="text-muted-foreground">Draft picks will appear here as they happen.</p>
                </div>
              )}
            </CardContent>
          </EnhancedCard>
        </TabsContent>
      </Tabs>

      {/* Draft Controls */}
      {!draftActive && captains.length >= 2 && availablePlayers.length > 0 && (
        <EnhancedCard>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to Start Draft</h3>
                <p className="text-muted-foreground">
                  {captains.length} captains selected • {availablePlayers.length} players available for drafting
                </p>
              </div>
              <AnimatedButton onClick={startDraft} size="lg" variant="tournament" glowEffect rippleEffect>
                <Zap className="h-4 w-4 mr-2" />
                Start Captain Draft
              </AnimatedButton>
            </div>
          </CardContent>
        </EnhancedCard>
      )}
    </div>
  )
}
