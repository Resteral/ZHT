"use client"

import { useState, useEffect } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Crown,
  Star,
  Shuffle,
  Target,
  AlertTriangle,
  ArrowRight,
  Zap,
  Trophy,
  TrendingUp,
  Timer,
  CheckCircle,
  Sparkles,
} from "lucide-react"
import { captainSelectionService } from "@/lib/services/captain-selection-service"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { EnhancedCard } from "@/components/ui/enhanced-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { ProgressRing } from "@/components/ui/progress-ring"

interface EnhancedCaptainSelectionProps {
  tournament: {
    id: string
    name: string
    status: string
    created_by: string
    max_participants: number
    player_pool_settings?: any
  }
  onCaptainsSelected?: (captains: any[]) => void
}

export function EnhancedCaptainSelection({ tournament, onCaptainsSelected }: EnhancedCaptainSelectionProps) {
  const [captains, setCaptains] = useState<any[]>([])
  const [playerPool, setPlayerPool] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectionMethod, setSelectionMethod] = useState<"automatic" | "manual" | "random">("automatic")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [eligibility, setEligibility] = useState<any>(null)
  const [selectionProgress, setSelectionProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
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
      console.error("Error loading captains:", error)
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
      }
    } catch (error) {
      console.error("Error loading player pool:", error)
    }
  }

  const checkEligibility = async () => {
    try {
      const result = await captainSelectionService.canSelectCaptains(tournament.id)
      setEligibility(result)
    } catch (error) {
      console.error("Error checking eligibility:", error)
    }
  }

  const handleSelectCaptains = async () => {
    if (!canSelectCaptains || !eligibility?.canSelect) return

    setLoading(true)
    setSelectionProgress(0)
    setAnimationStep(0)

    // Animated progress simulation
    const progressInterval = setInterval(() => {
      setSelectionProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      let result

      switch (selectionMethod) {
        case "automatic":
          setAnimationStep(1)
          result = await captainSelectionService.selectCaptainsAutomatically(tournament.id)
          break
        case "manual":
          if (selectedPlayers.length === 0) {
            toast.error("Please select players for manual captain selection")
            return
          }
          setAnimationStep(2)
          result = await captainSelectionService.selectCaptainsManually(tournament.id, selectedPlayers)
          break
        case "random":
          setAnimationStep(3)
          result = await captainSelectionService.selectCaptainsRandomly(tournament.id)
          break
        default:
          throw new Error("Invalid selection method")
      }

      setSelectionProgress(100)
      setAnimationStep(4)

      if (result.success) {
        toast.success(result.message)
        setCaptains(result.captains)
        onCaptainsSelected?.(result.captains)
        await loadPlayerPool()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error selecting captains:", error)
      toast.error("Failed to select captains")
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
      setSelectionProgress(0)
      setAnimationStep(0)
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
      console.error("Error resetting captains:", error)
      toast.error("Failed to reset captains")
    } finally {
      setLoading(false)
    }
  }

  const getCaptainTypeInfo = (type: string) => {
    switch (type) {
      case "high_elo":
        return {
          label: "Tournament Owner",
          description: "Highest ELO player",
          color: "bg-red-500/20 text-red-700 border-red-500/30",
          icon: Crown,
        }
      case "low_elo":
        return {
          label: "First Pick Captain",
          description: "Gets draft advantage",
          color: "bg-green-500/20 text-green-700 border-green-500/30",
          icon: Target,
        }
      default:
        return {
          label: "Captain",
          description: "Team leader",
          color: "bg-gray-500/20 text-gray-700 border-gray-500/30",
          icon: Crown,
        }
    }
  }

  const getSelectionPreview = () => {
    if (playerPool.length < 2) return null

    const sortedPlayers = [...playerPool].sort((a, b) => b.elo_rating - a.elo_rating)
    const highestElo = sortedPlayers[0]
    const lowestElo = sortedPlayers[sortedPlayers.length - 1]

    switch (selectionMethod) {
      case "automatic":
        return { captain1: highestElo, captain2: lowestElo }
      case "manual":
        return {
          captain1: playerPool.find((p) => p.id === selectedPlayers[0]),
          captain2: playerPool.find((p) => p.id === selectedPlayers[1]),
        }
      case "random":
        return {
          captain1: { username: "Random Player 1", elo_rating: "???" },
          captain2: { username: "Random Player 2", elo_rating: "???" },
        }
      default:
        return null
    }
  }

  const preview = getSelectionPreview()

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <EnhancedCard variant="captain" glowEffect className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-amber-500" />
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Captain Selection
                </CardTitle>
                {captains.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {captains.length} Selected
                    </Badge>
                  </motion.div>
                )}
              </div>
              <CardDescription className="text-base">
                Select team captains for the tournament draft
                {eligibility && <span className="block mt-1 text-sm">{eligibility.message}</span>}
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <ProgressRing
                progress={captains.length >= 2 ? 100 : (captains.length / 2) * 100}
                size={80}
                color="success"
                showPercentage
              />
            </div>
          </div>
        </CardHeader>
      </EnhancedCard>

      {/* Alerts */}
      <AnimatePresence>
        {!eligibility?.canSelect && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{eligibility?.message || "Checking captain selection eligibility..."}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {!isCreator && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Only the tournament creator can select captains</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Captains */}
      <AnimatePresence>
        {captains.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <EnhancedCard variant="premium" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Selected Captains
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Ready for Draft
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {captains.map((captain, index) => {
                    const typeInfo = getCaptainTypeInfo(captain.captain_type)
                    const Icon = typeInfo.icon
                    return (
                      <motion.div
                        key={captain.id}
                        initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2, type: "spring", stiffness: 300 }}
                      >
                        <EnhancedCard
                          variant={captain.captain_type === "high_elo" ? "tournament" : "captain"}
                          hoverScale
                          className="relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-bl-full" />
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Avatar className="h-12 w-12 ring-2 ring-white/20">
                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                                    {captain.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className="h-4 w-4 text-amber-500" />
                                  <p className="font-bold text-lg">{captain.username}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <Star className="h-3 w-3" />
                                  <span>{captain.elo_rating} ELO</span>
                                </div>
                                <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground">{typeInfo.description}</p>
                            </div>
                          </CardContent>
                        </EnhancedCard>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <AnimatedButton
                    onClick={() => onCaptainsSelected?.(captains)}
                    className="flex-1"
                    variant="success"
                    size="lg"
                    glowEffect
                    rippleEffect
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start Tournament Formation
                  </AnimatedButton>
                  {canSelectCaptains && (
                    <AnimatedButton
                      onClick={handleResetCaptains}
                      disabled={loading}
                      variant="outline"
                      size="lg"
                      rippleEffect
                    >
                      Reset Captains
                    </AnimatedButton>
                  )}
                </div>
              </CardContent>
            </EnhancedCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Interface */}
      {captains.length === 0 && canSelectCaptains && eligibility?.canSelect && (
        <EnhancedCard variant="default" className="relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <Crown className="h-12 w-12 text-primary mx-auto" />
                </motion.div>
                <div className="space-y-2">
                  <p className="font-medium">Selecting Captains...</p>
                  <Progress value={selectionProgress} className="w-64 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {animationStep === 1 && "Analyzing ELO ratings..."}
                    {animationStep === 2 && "Processing manual selection..."}
                    {animationStep === 3 && "Randomizing selection..."}
                    {animationStep === 4 && "Finalizing captains..."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Captain Selection Methods
            </CardTitle>
            <CardDescription>Choose how to select team captains for this tournament</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={selectionMethod}
              onValueChange={(value) => setSelectionMethod(value as any)}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="automatic" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto (ELO)
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="random" className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4" />
                  Random
                </TabsTrigger>
              </TabsList>

              <TabsContent value="automatic" className="space-y-4">
                <EnhancedCard variant="tournament" className="border-dashed">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400 }}>
                        <Zap className="h-12 w-12 text-cyan-500 mx-auto" />
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">Automatic ELO Selection</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Automatically selects the highest and lowest ELO players as captains for balanced teams.
                        </p>
                      </div>
                      <AnimatedButton
                        onClick={() => handleSelectCaptains()}
                        disabled={loading || playerPool.length < 2}
                        className="w-full"
                        variant="tournament"
                        size="lg"
                        glowEffect
                        rippleEffect
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {loading ? "Selecting..." : "Select by ELO"}
                      </AnimatedButton>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <EnhancedCard variant="captain" className="border-dashed">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400 }}>
                        <Users className="h-12 w-12 text-purple-500 mx-auto" />
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">Manual Selection</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Choose exactly 2 players from the pool below to be team captains.
                        </p>
                      </div>
                      <AnimatedButton
                        onClick={() => handleSelectCaptains()}
                        disabled={loading || selectedPlayers.length !== 2}
                        className="w-full"
                        variant="captain"
                        size="lg"
                        glowEffect
                        rippleEffect
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {loading ? "Selecting..." : `Select ${selectedPlayers.length}/2 Captains`}
                      </AnimatedButton>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </TabsContent>

              <TabsContent value="random" className="space-y-4">
                <EnhancedCard variant="premium" className="border-dashed">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <motion.div whileHover={{ rotate: 180 }} transition={{ type: "spring", stiffness: 400 }}>
                        <Shuffle className="h-12 w-12 text-amber-500 mx-auto" />
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-lg mb-2">Random Selection</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Randomly selects 2 players from the pool as captains for unpredictable matchups.
                        </p>
                      </div>
                      <AnimatedButton
                        onClick={() => handleSelectCaptains()}
                        disabled={loading || playerPool.length < 2}
                        className="w-full"
                        variant="premium"
                        size="lg"
                        glowEffect
                        rippleEffect
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        {loading ? "Selecting..." : "Random Selection"}
                      </AnimatedButton>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </TabsContent>
            </Tabs>

            {/* Selection Preview */}
            {preview && preview.captain1 && preview.captain2 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <EnhancedCard className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Selection Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="font-medium text-sm">{preview.captain1.username}</div>
                        <div className="text-xs text-muted-foreground">{preview.captain1.elo_rating} ELO</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Captain 1
                        </Badge>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <div className="font-medium text-sm">{preview.captain2.username}</div>
                        <div className="text-xs text-muted-foreground">{preview.captain2.elo_rating} ELO</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Captain 2
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </motion.div>
            )}
          </CardContent>
        </EnhancedCard>
      )}

      {/* Player Pool */}
      {playerPool.length > 0 && captains.length === 0 && (
        <EnhancedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              Player Pool ({playerPool.length} Available)
              {selectionMethod === "manual" && captains.length < 2 && (
                <Badge variant="secondary" className="ml-2">
                  <Timer className="h-3 w-3 mr-1" />
                  Select 2 for Captains
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Players available for captain selection, ranked by ELO rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {playerPool.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPlayers.includes(player.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-primary/50 hover:bg-muted/50"
                    } ${
                      selectionMethod === "manual" && captains.length < 2 && canSelectCaptains
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                    onClick={() => {
                      if (selectionMethod === "manual" && captains.length < 2 && canSelectCaptains) {
                        if (selectedPlayers.includes(player.id)) {
                          setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id))
                        } else if (selectedPlayers.length < 2) {
                          setSelectedPlayers([...selectedPlayers, player.id])
                        }
                      }
                    }}
                  >
                    <Badge variant="secondary" className="min-w-[2.5rem] font-mono">
                      #{index + 1}
                    </Badge>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{player.username}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{player.elo_rating} ELO</span>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            Highest
                          </Badge>
                        )}
                        {index === playerPool.length - 1 && playerPool.length > 1 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Lowest
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPlayers.includes(player.id) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        </motion.div>
                      )}
                      {player.id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {playerPool.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Available Players</h3>
                <p className="text-muted-foreground">Players will appear here when they join the tournament</p>
              </div>
            )}
          </CardContent>
        </EnhancedCard>
      )}
    </div>
  )
}
