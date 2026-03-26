"use client"

import { useState, useCallback } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Play,
  Clock,
  Crown,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Target,
  Award,
  TrendingUp,
  Eye,
  Calendar,
  Timer,
} from "lucide-react"
import { tournamentService } from "@/lib/services/tournament-service"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { EnhancedCard } from "@/components/ui/enhanced-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { ProgressRing } from "@/components/ui/progress-ring"

interface Match {
  id: string
  round_number: number
  match_number: number
  participant1: { id: string; team_name: string; user_id: string; elo_rating?: number } | null
  participant2: { id: string; team_name: string; user_id: string; elo_rating?: number } | null
  winner: { id: string; team_name: string; user_id: string } | null
  score1: number
  score2: number
  status: string
  updated_at?: string
  scheduled_at?: string
  match_duration?: number
}

interface EnhancedTournamentBracketProps {
  tournamentId: string
  tournament: any
}

export function EnhancedTournamentBracket({ tournamentId, tournament }: EnhancedTournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState("")
  const [score2, setScore2] = useState("")
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState<"bracket" | "schedule" | "stats">("bracket")
  const [liveMatchUpdates, setLiveMatchUpdates] = useState<Record<string, any>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadBracket = useCallback(async () => {
    try {
      const data = await tournamentService.getBracket(tournamentId)
      setMatches(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error loading bracket:", error)
      toast.error("Failed to load tournament bracket")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const getRoundName = (roundNumber: number) => {
    const totalRounds = Math.max(...matches.map((match) => match.round_number))
    if (roundNumber === totalRounds) return "Grand Final"
    if (roundNumber === totalRounds - 1) return "Semi-Finals"
    if (roundNumber === totalRounds - 2) return "Quarter-Finals"
    if (roundNumber === 1) return "First Round"
    return `Round ${roundNumber}`
  }

  const getMatchStatus = (match: Match) => {
    if (match.status === "completed") return "Completed"
    if (match.status === "in_progress") return "Live"
    if (!match.participant1 || !match.participant2) return "Waiting"
    return "Ready"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500 text-white"
      case "Live":
        return "bg-red-500 text-white"
      case "Ready":
        return "bg-amber-500 text-gray-900"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const calculateWinProbability = (team1Elo: number, team2Elo: number) => {
    const eloDiff = team2Elo - team1Elo
    return 1 / (1 + Math.pow(10, eloDiff / 400))
  }

  const getTournamentProgress = () => {
    const completedMatches = matches.filter((m) => m.status === "completed").length
    return matches.length > 0 ? (completedMatches / matches.length) * 100 : 0
  }

  const getUpcomingMatches = () => {
    return matches
      .filter((m) => m.status === "ready" && m.participant1 && m.participant2)
      .sort((a, b) => a.round_number - b.round_number)
      .slice(0, 3)
  }

  // ... existing useEffect hooks ...

  if (loading) {
    return (
      <EnhancedCard className="animate-pulse">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament bracket...</p>
        </CardContent>
      </EnhancedCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <EnhancedCard variant="tournament" glowEffect className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Tournament Bracket
                </CardTitle>
                <motion.div
                  animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-green-500" title="Live updates connected" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-500" title="Connection lost" />
                  )}
                </motion.div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {tournament.tournament_type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <span>•</span>
                <span>{matches.length} matches</span>
                <span>•</span>
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ProgressRing progress={getTournamentProgress()} size={80} color="info" showPercentage />
              <div className="flex flex-col gap-2">
                <AnimatedButton
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant={autoRefresh ? "success" : "outline"}
                  size="sm"
                  animation={autoRefresh ? "pulse" : "none"}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
                  Auto-refresh
                </AnimatedButton>
                <AnimatedButton onClick={loadBracket} variant="outline" size="sm" rippleEffect>
                  Refresh
                </AnimatedButton>
              </div>
            </div>
          </div>
        </CardHeader>
      </EnhancedCard>

      {/* Tournament Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <EnhancedCard variant="default" hoverScale>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">
                {matches.filter((m) => m.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Award className="h-3 w-3" />
                Completed
              </div>
            </CardContent>
          </EnhancedCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <EnhancedCard variant="default" hoverScale>
            <CardContent className="p-4 text-center">
              <motion.div
                className="text-3xl font-bold text-red-500 mb-1"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                {matches.filter((m) => m.status === "in_progress").length}
              </motion.div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Live Now
              </div>
            </CardContent>
          </EnhancedCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <EnhancedCard variant="default" hoverScale>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-500 mb-1">
                {matches.filter((m) => m.status === "ready" && m.participant1 && m.participant2).length}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Target className="h-3 w-3" />
                Ready
              </div>
            </CardContent>
          </EnhancedCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <EnhancedCard variant="default" hoverScale>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-muted-foreground mb-1">
                {matches.filter((m) => !m.participant1 || !m.participant2).length}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Waiting
              </div>
            </CardContent>
          </EnhancedCard>
        </motion.div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bracket" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Bracket
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="space-y-6">
          {matches.length === 0 ? (
            <EnhancedCard variant="tournament" className="border-dashed border-2">
              <CardContent className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Ready to Generate Bracket</h3>
                <p className="text-muted-foreground mb-6">
                  {tournament.participant_count} players registered. Generate the tournament bracket to begin matches.
                </p>
                <AnimatedButton
                  onClick={() => tournamentService.generateBracket(tournamentId)}
                  variant="tournament"
                  size="lg"
                  glowEffect
                  rippleEffect
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Generate Tournament Bracket
                </AnimatedButton>
              </CardContent>
            </EnhancedCard>
          ) : (
            <div className="overflow-x-auto bg-gradient-to-r from-background via-muted/10 to-background rounded-xl border">
              <div className="flex gap-8 min-w-max p-6">
                <AnimatePresence>
                  {Object.entries(
                    matches.reduce(
                      (acc, match) => {
                        if (!acc[match.round_number]) {
                          acc[match.round_number] = []
                        }
                        acc[match.round_number].push(match)
                        return acc
                      },
                      {} as Record<number, Match[]>,
                    ),
                  ).map(([roundNumber, roundMatches], roundIndex) => (
                    <motion.div
                      key={roundNumber}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundIndex * 0.1 }}
                      className="space-y-6 min-w-[320px]"
                    >
                      {/* Round Header */}
                      <div className="text-center">
                        <motion.div
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/20"
                          whileHover={{ scale: 1.05 }}
                        >
                          {Number(roundNumber) === Math.max(...matches.map((match) => match.round_number)) && (
                            <Crown className="h-5 w-5 text-amber-500" />
                          )}
                          <h4 className="font-bold text-lg">{getRoundName(Number(roundNumber))}</h4>
                        </motion.div>
                      </div>

                      {/* Round Matches */}
                      <div className="space-y-4">
                        {roundMatches
                          .sort((a, b) => a.match_number - b.match_number)
                          .map((match, matchIndex) => (
                            <motion.div
                              key={match.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: roundIndex * 0.1 + matchIndex * 0.05 }}
                            >
                              <EnhancedCard
                                variant={match.status === "in_progress" ? "tournament" : "default"}
                                glowEffect={match.status === "in_progress"}
                                className={`relative overflow-hidden ${
                                  match.status === "in_progress" ? "ring-2 ring-red-500/50" : ""
                                }`}
                              >
                                {/* Live Match Indicator */}
                                {match.status === "in_progress" && (
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500">
                                    <motion.div
                                      className="h-full bg-white/30"
                                      animate={{ x: ["-100%", "100%"] }}
                                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                    />
                                  </div>
                                )}

                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">Match {match.match_number}</CardTitle>
                                    <Badge className={getStatusColor(getMatchStatus(match))}>
                                      {getMatchStatus(match)}
                                      {match.status === "in_progress" && (
                                        <motion.div
                                          className="ml-2 w-2 h-2 bg-white rounded-full"
                                          animate={{ scale: [1, 1.5, 1] }}
                                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                                        />
                                      )}
                                    </Badge>
                                  </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                  {/* Team 1 */}
                                  <motion.div
                                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                                      match.winner?.id === match.participant1?.id
                                        ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                                        : "bg-muted/30 hover:bg-muted/50"
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {match.winner?.id === match.participant1?.id && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ type: "spring", stiffness: 500 }}
                                        >
                                          <Crown className="h-5 w-5 text-amber-500" />
                                        </motion.div>
                                      )}
                                      <div>
                                        <div className="font-semibold text-sm">
                                          {match.participant1?.team_name || "TBD"}
                                        </div>
                                        {match.participant1?.elo_rating && (
                                          <div className="text-xs text-muted-foreground">
                                            {match.participant1.elo_rating} ELO
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {match.status === "completed" && (
                                      <motion.span
                                        className="font-bold text-xl"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                      >
                                        {match.score1}
                                      </motion.span>
                                    )}
                                  </motion.div>

                                  {/* VS Divider */}
                                  <div className="text-center relative">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t border-muted-foreground/20" />
                                    </div>
                                    <div className="relative flex justify-center">
                                      <span className="bg-background px-3 py-1 text-xs font-bold text-muted-foreground rounded-full border">
                                        VS
                                      </span>
                                    </div>
                                  </div>

                                  {/* Team 2 */}
                                  <motion.div
                                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                                      match.winner?.id === match.participant2?.id
                                        ? "bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-700"
                                        : "bg-muted/30 hover:bg-muted/50"
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {match.winner?.id === match.participant2?.id && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ type: "spring", stiffness: 500 }}
                                        >
                                          <Crown className="h-5 w-5 text-amber-500" />
                                        </motion.div>
                                      )}
                                      <div>
                                        <div className="font-semibold text-sm">
                                          {match.participant2?.team_name || "TBD"}
                                        </div>
                                        {match.participant2?.elo_rating && (
                                          <div className="text-xs text-muted-foreground">
                                            {match.participant2.elo_rating} ELO
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {match.status === "completed" && (
                                      <motion.span
                                        className="font-bold text-xl"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                      >
                                        {match.score2}
                                      </motion.span>
                                    )}
                                  </motion.div>

                                  {/* Win Probability */}
                                  {match.participant1?.elo_rating &&
                                    match.participant2?.elo_rating &&
                                    match.status !== "completed" && (
                                      <div className="mt-3 p-2 bg-muted/20 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Win Probability</div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-xs font-medium">
                                            {Math.round(
                                              calculateWinProbability(
                                                match.participant1.elo_rating,
                                                match.participant2.elo_rating,
                                              ) * 100,
                                            )}
                                            %
                                          </div>
                                          <Progress
                                            value={
                                              calculateWinProbability(
                                                match.participant1.elo_rating,
                                                match.participant2.elo_rating,
                                              ) * 100
                                            }
                                            className="flex-1 h-2"
                                          />
                                          <div className="text-xs font-medium">
                                            {Math.round(
                                              (1 -
                                                calculateWinProbability(
                                                  match.participant1.elo_rating,
                                                  match.participant2.elo_rating,
                                                )) *
                                                100,
                                            )}
                                            %
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  {/* Match Actions */}
                                  {match.participant1 && match.participant2 && match.status !== "completed" && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <AnimatedButton
                                          size="sm"
                                          className="w-full mt-3"
                                          variant={match.status === "in_progress" ? "tournament" : "outline"}
                                          rippleEffect
                                          glowEffect={match.status === "in_progress"}
                                          onClick={() => {
                                            setSelectedMatch(match)
                                            setScore1(match.score1.toString())
                                            setScore2(match.score2.toString())
                                          }}
                                        >
                                          {match.status === "in_progress" ? (
                                            <>
                                              <Timer className="h-3 w-3 mr-2" />
                                              Update Score
                                            </>
                                          ) : (
                                            <>
                                              <Play className="h-3 w-3 mr-2" />
                                              Start Match
                                            </>
                                          )}
                                        </AnimatedButton>
                                      </DialogTrigger>

                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2">
                                            <Trophy className="h-5 w-5" />
                                            Update Match Score
                                          </DialogTitle>
                                        </DialogHeader>

                                        <div className="space-y-6">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">
                                                {match.participant1?.team_name}
                                              </label>
                                              <Input
                                                type="number"
                                                value={score1}
                                                onChange={(e) => setScore1(e.target.value)}
                                                placeholder="Score"
                                                className="text-center text-lg font-bold"
                                              />
                                            </div>

                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">
                                                {match.participant2?.team_name}
                                              </label>
                                              <Input
                                                type="number"
                                                value={score2}
                                                onChange={(e) => setScore2(e.target.value)}
                                                placeholder="Score"
                                                className="text-center text-lg font-bold"
                                              />
                                            </div>
                                          </div>

                                          <AnimatedButton
                                            onClick={() => {
                                              // Handle score update
                                              tournamentService.updateMatchScore(selectedMatch!.id, {
                                                score1: Number.parseInt(score1) || 0,
                                                score2: Number.parseInt(score2) || 0,
                                              })
                                              setSelectedMatch(null)
                                            }}
                                            className="w-full"
                                            size="lg"
                                            variant="tournament"
                                            rippleEffect
                                          >
                                            <Trophy className="h-4 w-4 mr-2" />
                                            Update Score
                                          </AnimatedButton>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </CardContent>
                              </EnhancedCard>
                            </motion.div>
                          ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <EnhancedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getUpcomingMatches().map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{getRoundName(match.round_number)}</Badge>
                      <span className="font-medium">
                        {match.participant1?.team_name} vs {match.participant2?.team_name}
                      </span>
                    </div>
                    <AnimatedButton size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </AnimatedButton>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <EnhancedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tournament Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Progress</span>
                    <span className="font-bold">{Math.round(getTournamentProgress())}%</span>
                  </div>
                  <Progress value={getTournamentProgress()} className="h-3" />
                </div>
              </CardContent>
            </EnhancedCard>

            <EnhancedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Match Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {matches.filter((m) => m.status === "completed").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-500">
                      {matches.filter((m) => m.status === "ready").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
