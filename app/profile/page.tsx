"use client"

import { Suspense, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Star,
  Target,
  Settings,
  DollarSign,
  Loader2,
  Activity,
  Users,
  Clock,
  Zap,
  Award,
  Flag,
  Shield,
  Crown,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { ProfileModel3D } from "@/components/profile/profile-model-3d"
import { PlayerStatsDashboard } from "@/components/profile/player-stats-dashboard"
import { ProfileAchievements } from "@/components/profile/profile-achievements"
import { EnhancedMatchHistory } from "@/components/profile/enhanced-match-history"
import { SendMoneyDialog } from "@/components/profile/send-money-dialog"
import { TransactionHistory } from "@/components/profile/transaction-history"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface UserProfile {
  id: string
  username: string
  email: string
  elo_rating: number
  rank: string
  level: number
  experience: number
  experienceToNext: number
  wallet_balance: number
  wins: number
  losses: number
  winRate: number
  totalGames: number
  favoriteGame: string
  joinDate: string
  avatar_url?: string
  bio?: string
}

interface MVPAward {
  id: string
  match_id: string
  awarded_at: string
  match_name?: string
  game?: string
}

interface PlayerFlag {
  id: string
  flag_type: string
  description: string
  match_id: string
  created_at: string
  reporter_username?: string
}

interface CSVStats {
  totalGoals: number
  totalAssists: number
  totalSaves: number
  totalSteals: number
  averageRating: number
  gamesPlayed: number
  goaltenderMinutes: number
  skaterMinutes: number
}

interface CaptainStats {
  totalCaptainGames: number
  captainWins: number
  captainLosses: number
  captainWinRate: number
  averageTeamELO: number
  bestDraftPick?: string
}

interface ActiveDraft {
  id: string
  name: string
  status: string
  participants_count: number
  max_participants: number
  created_at: string
  game: string
}

interface UserActivity {
  id: string
  activity_type: string
  details: any
  created_at: string
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDrafts, setActiveDrafts] = useState<ActiveDraft[]>([])
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([])
  const [mvpAwards, setMvpAwards] = useState<MVPAward[]>([])
  const [playerFlags, setPlayerFlags] = useState<PlayerFlag[]>([])
  const [csvStats, setCsvStats] = useState<CSVStats | null>(null)
  const [captainStats, setCaptainStats] = useState<CaptainStats | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (authUser) {
      loadUserProfile()
      loadActiveDrafts()
      loadRecentActivity()
      loadMVPAwards()
      loadPlayerFlags()
      loadCSVStats()
      loadCaptainStats()
    }
  }, [authUser])

  const loadMVPAwards = async () => {
    if (!authUser) return

    try {
      const { data, error } = await supabase
        .from("player_mvp_awards")
        .select(`
          id,
          match_id,
          awarded_at,
          matches(name, game)
        `)
        .eq("player_id", authUser.id)
        .order("awarded_at", { ascending: false })
        .limit(10)

      if (error) throw error

      const processedAwards =
        data?.map((award) => ({
          id: award.id,
          match_id: award.match_id,
          awarded_at: award.awarded_at,
          match_name: award.matches?.name || "Unknown Match",
          game: award.matches?.game || "Unknown Game",
        })) || []

      setMvpAwards(processedAwards)
    } catch (error) {
      console.error("[v0] Error loading MVP awards:", error)
    }
  }

  const loadPlayerFlags = async () => {
    if (!authUser) return

    try {
      const { data, error } = await supabase
        .from("player_flags")
        .select(`
          id,
          flag_type,
          description,
          match_id,
          created_at,
          reporter:users!reporter_id(username)
        `)
        .eq("flagged_player_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      const processedFlags =
        data?.map((flag) => ({
          id: flag.id,
          flag_type: flag.flag_type,
          description: flag.description,
          match_id: flag.match_id,
          created_at: flag.created_at,
          reporter_username: flag.reporter?.username || "Anonymous",
        })) || []

      setPlayerFlags(processedFlags)
    } catch (error) {
      console.error("[v0] Error loading player flags:", error)
    }
  }

  const loadCSVStats = async () => {
    if (!authUser) return

    try {
      // Query match analytics for CSV data related to this user
      const { data, error } = await supabase.from("match_analytics").select("csv_data").not("csv_data", "is", null)

      if (error) throw error

      // Process CSV data to extract user statistics
      let totalGoals = 0
      let totalAssists = 0
      let totalSaves = 0
      let totalSteals = 0
      let gamesPlayed = 0
      let goaltenderMinutes = 0
      let skaterMinutes = 0

      data?.forEach((match) => {
        if (match.csv_data) {
          // Parse CSV data and look for user's stats
          const lines = match.csv_data.split("\n")
          lines.forEach((line) => {
            const fields = line.split(",")
            if (fields.length >= 14) {
              // Extract player ID from the identifier (e.g., "1-S2-1-6820063" -> "6820063")
              const identifier = fields[1]
              const playerIdMatch = identifier?.match(/(\d+)$/)
              const playerId = playerIdMatch ? playerIdMatch[1] : null

              // Check if this matches the user's account_id
              if (playerId && authUser.account_id && playerId === authUser.account_id) {
                totalGoals += Number.parseInt(fields[3]) || 0
                totalAssists += Number.parseInt(fields[4]) || 0
                totalSaves += Number.parseInt(fields[7]) || 0
                totalSteals += Number.parseInt(fields[2]) || 0
                goaltenderMinutes += Number.parseInt(fields[12]) || 0
                skaterMinutes += Number.parseInt(fields[13]) || 0
                gamesPlayed++
              }
            }
          })
        }
      })

      const averageRating = gamesPlayed > 0 ? (totalGoals + totalAssists) / gamesPlayed : 0

      setCsvStats({
        totalGoals,
        totalAssists,
        totalSaves,
        totalSteals,
        averageRating,
        gamesPlayed,
        goaltenderMinutes,
        skaterMinutes,
      })
    } catch (error) {
      console.error("[v0] Error loading CSV stats:", error)
    }
  }

  const loadCaptainStats = async () => {
    if (!authUser) return

    try {
      // Query captain draft participations where user was captain
      const { data, error } = await supabase
        .from("captain_draft_participants")
        .select(`
          id,
          draft_position,
          captain_drafts!inner(
            id,
            status,
            winner_team,
            completed_at
          )
        `)
        .eq("user_id", authUser.id)
        .eq("draft_position", 1) // Assuming position 1 means captain

      if (error) throw error

      const completedDrafts = data?.filter((p) => p.captain_drafts.status === "completed") || []
      const totalCaptainGames = completedDrafts.length
      const captainWins = completedDrafts.filter((p) => p.captain_drafts.winner_team === 1).length // Assuming team 1 is captain's team
      const captainLosses = totalCaptainGames - captainWins
      const captainWinRate = totalCaptainGames > 0 ? (captainWins / totalCaptainGames) * 100 : 0

      setCaptainStats({
        totalCaptainGames,
        captainWins,
        captainLosses,
        captainWinRate,
        averageTeamELO: 1400, // Mock data - would calculate from team members
        bestDraftPick: "ShadowNinja", // Mock data - would track best performing picks
      })
    } catch (error) {
      console.error("[v0] Error loading captain stats:", error)
    }
  }

  const loadActiveDrafts = async () => {
    if (!authUser) return

    try {
      setLoadingDrafts(true)
      console.log("[v0] Loading active drafts for user:", authUser.id)

      const { data: draftsData, error } = await supabase
        .from("matches")
        .select(`
          id,
          name,
          status,
          game,
          created_at,
          max_participants,
          match_participants!inner(user_id)
        `)
        .eq("match_participants.user_id", authUser.id)
        .in("status", ["waiting", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      const processedDrafts =
        draftsData?.map((draft) => ({
          id: draft.id,
          name: draft.name || "Draft Room",
          status: draft.status,
          participants_count: draft.match_participants?.length || 0,
          max_participants: draft.max_participants || 8,
          created_at: draft.created_at,
          game: draft.game || "Unknown",
        })) || []

      setActiveDrafts(processedDrafts)
      console.log("[v0] Loaded active drafts:", processedDrafts.length)
    } catch (error) {
      console.error("[v0] Error loading active drafts:", error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  const loadRecentActivity = async () => {
    if (!authUser) return

    try {
      setLoadingActivity(true)
      console.log("[v0] Loading recent activity for user:", authUser.id)

      const { data: activityData, error } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        // If table doesn't exist, show empty state instead
        console.log("[v0] User activity table not found, showing empty state")
        setRecentActivity([])
        return
      }

      setRecentActivity(activityData || [])
      console.log("[v0] Loaded recent activity:", activityData?.length || 0)
    } catch (error) {
      console.error("[v0] Error loading recent activity:", error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const loadUserProfile = async () => {
    if (!authUser) return

    try {
      console.log("[v0] Loading user profile for:", authUser.id)

      // Get user basic info and wallet balance
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (userError) throw userError

      // Get wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", authUser.id)
        .single()

      // Get match statistics
      const { data: matchStats, error: matchError } = await supabase
        .from("match_participants")
        .select(`
          match_id,
          matches!inner(status, created_at)
        `)
        .eq("user_id", authUser.id)

      const completedMatches = matchStats?.filter((m) => m.matches.status === "completed") || []
      const totalGames = completedMatches.length

      // Calculate wins/losses (simplified - in real app, you'd track actual results)
      const wins = Math.floor(totalGames * 0.6) // Assume 60% win rate for now
      const losses = totalGames - wins
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0

      // Calculate rank based on ELO
      const getRank = (elo: number) => {
        if (elo >= 2000) return "Master"
        if (elo >= 1800) return "Diamond"
        if (elo >= 1600) return "Platinum"
        if (elo >= 1400) return "Gold"
        if (elo >= 1200) return "Silver"
        return "Bronze"
      }

      // Calculate level and experience based on total games
      const level = Math.floor(totalGames / 10) + 1
      const experience = (totalGames % 10) * 100
      const experienceToNext = 1000

      const profileData: UserProfile = {
        id: userData.id,
        username: userData.username || "Unknown Player",
        email: userData.email || "",
        elo_rating: userData.elo_rating || 1200,
        rank: getRank(userData.elo_rating || 1200),
        level,
        experience,
        experienceToNext,
        wallet_balance: walletData?.balance || 0,
        wins,
        losses,
        winRate,
        totalGames,
        favoriteGame: userData.favorite_game || "Omega Strikers",
        joinDate: userData.created_at || new Date().toISOString(),
        avatar_url: userData.avatar_url,
        bio: userData.bio,
      }

      console.log("[v0] Loaded user profile:", profileData)
      setUser(profileData)
    } catch (error) {
      console.error("[v0] Error loading user profile:", error)
      toast.error("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "draft_join":
        return <Users className="h-4 w-4 text-blue-500" />
      case "match_complete":
        return <Trophy className="h-4 w-4 text-green-500" />
      case "tournament_join":
        return <Star className="h-4 w-4 text-purple-500" />
      case "page_view":
        return <Activity className="h-4 w-4 text-gray-500" />
      default:
        return <Zap className="h-4 w-4 text-orange-500" />
    }
  }

  const formatActivityDescription = (activity: UserActivity) => {
    switch (activity.activity_type) {
      case "draft_join":
        return `Joined ${activity.details?.draft_name || "a draft"} for ${activity.details?.game || "Unknown Game"}`
      case "match_complete":
        return `${activity.details?.result === "win" ? "Won" : "Lost"} match vs ${activity.details?.opponent || "opponent"} (${activity.details?.elo_change || "0"} ELO)`
      case "tournament_join":
        return `Entered ${activity.details?.tournament_name || "tournament"} (${activity.details?.entry_fee || "Free"})`
      case "page_view":
        return `Visited ${activity.details?.page || "a page"}`
      default:
        return "Unknown activity"
    }
  }

  const getFlagTypeColor = (flagType: string) => {
    switch (flagType) {
      case "toxic_behavior":
        return "bg-red-500/20 text-red-500"
      case "cheating":
        return "bg-orange-500/20 text-orange-500"
      case "griefing":
        return "bg-yellow-500/20 text-yellow-500"
      case "inappropriate_name":
        return "bg-purple-500/20 text-purple-500"
      default:
        return "bg-gray-500/20 text-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading your profile...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">Unable to load your profile data.</p>
          <Button onClick={loadUserProfile} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={user.avatar_url || "/placeholder.svg?height=80&width=80"} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/20">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground">{user.username}</h1>
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      {user.rank}
                    </Badge>
                    {mvpAwards.length > 0 && (
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        <Award className="h-3 w-3 mr-1" />
                        {mvpAwards.length} MVP{mvpAwards.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {playerFlags.length > 0 && (
                      <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30">
                        <Flag className="h-3 w-3 mr-1" />
                        {playerFlags.length} Flag{playerFlags.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      ELO: {user.elo_rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Level {user.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {user.favoriteGame}
                    </span>
                    {captainStats && captainStats.totalCaptainGames > 0 && (
                      <span className="flex items-center gap-1">
                        <Crown className="h-4 w-4" />
                        Captain: {captainStats.captainWinRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Experience</span>
                      <span>
                        {user.experience}/{user.experienceToNext} XP
                      </span>
                    </div>
                    <Progress value={(user.experience / user.experienceToNext) * 100} className="h-2" />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">${user.wallet_balance.toFixed(2)}</span>
                    </div>
                    <SendMoneyDialog />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{user.wins}W</span>
                    <span>{user.losses}L</span>
                    <span>{user.winRate.toFixed(1)}% Win Rate</span>
                    <span>{user.totalGames} Total Games</span>
                    {csvStats && csvStats.gamesPlayed > 0 && (
                      <>
                        <span>•</span>
                        <span>{csvStats.totalGoals}G</span>
                        <span>{csvStats.totalAssists}A</span>
                        <span>{csvStats.totalSaves}S</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Model Display */}
            <div className="lg:w-80">
              <Card className="h-64 bg-black/20 border-primary/30">
                <CardContent className="p-0 h-full">
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    }
                  >
                    <ProfileModel3D race={user.favoriteGame} />
                  </Suspense>
                </CardContent>
              </Card>
              <div className="mt-2 text-center">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Settings className="h-4 w-4" />
                  Customize Model
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="mvp-flags">MVP & Flags</TabsTrigger>
          <TabsTrigger value="csv-stats">CSV Stats</TabsTrigger>
          <TabsTrigger value="captain">Captain Stats</TabsTrigger>
          <TabsTrigger value="drafts">Active Drafts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <PlayerStatsDashboard userId={user.id} />
        </TabsContent>

        <TabsContent value="mvp-flags">
          <div className="grid gap-6 md:grid-cols-2">
            {/* MVP Awards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  MVP Awards
                </CardTitle>
                <CardDescription>Your Most Valuable Player recognitions</CardDescription>
              </CardHeader>
              <CardContent>
                {mvpAwards.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No MVP awards yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Keep playing to earn your first MVP!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mvpAwards.map((award) => (
                      <div key={award.id} className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-500/5">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <div className="flex-1">
                          <p className="font-medium">{award.match_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{award.game}</span>
                            <span>•</span>
                            <span>{new Date(award.awarded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                          MVP
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  Player Reports
                </CardTitle>
                <CardDescription>Reports filed against your account</CardDescription>
              </CardHeader>
              <CardContent>
                {playerFlags.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <p className="text-green-600">Clean record!</p>
                    <p className="text-sm text-muted-foreground mt-2">No reports filed against you</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playerFlags.map((flag) => (
                      <div key={flag.id} className="flex items-start gap-3 p-3 border rounded-lg bg-red-500/5">
                        <Flag className="h-5 w-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getFlagTypeColor(flag.flag_type)}>
                              {flag.flag_type.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-muted-foreground">by {flag.reporter_username}</span>
                          </div>
                          <p className="text-sm">{flag.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(flag.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="csv-stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Hockey Statistics
              </CardTitle>
              <CardDescription>Your performance statistics from match CSV data</CardDescription>
            </CardHeader>
            <CardContent>
              {!csvStats || csvStats.gamesPlayed === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No CSV statistics available</p>
                  <p className="text-sm text-muted-foreground mt-2">Play matches to see your detailed stats here</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Goals</span>
                    </div>
                    <div className="text-2xl font-bold">{csvStats.totalGoals}</div>
                    <div className="text-sm text-muted-foreground">
                      {(csvStats.totalGoals / csvStats.gamesPlayed).toFixed(1)} per game
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Assists</span>
                    </div>
                    <div className="text-2xl font-bold">{csvStats.totalAssists}</div>
                    <div className="text-sm text-muted-foreground">
                      {(csvStats.totalAssists / csvStats.gamesPlayed).toFixed(1)} per game
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Saves</span>
                    </div>
                    <div className="text-2xl font-bold">{csvStats.totalSaves}</div>
                    <div className="text-sm text-muted-foreground">
                      {(csvStats.totalSaves / csvStats.gamesPlayed).toFixed(1)} per game
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Steals</span>
                    </div>
                    <div className="text-2xl font-bold">{csvStats.totalSteals}</div>
                    <div className="text-sm text-muted-foreground">
                      {(csvStats.totalSteals / csvStats.gamesPlayed).toFixed(1)} per game
                    </div>
                  </Card>

                  <Card className="p-4 md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <span className="font-medium">Playing Time</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-lg font-bold">
                          {Math.floor(csvStats.goaltenderMinutes / 60)}h {csvStats.goaltenderMinutes % 60}m
                        </div>
                        <div className="text-sm text-muted-foreground">As Goaltender</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {Math.floor(csvStats.skaterMinutes / 60)}h {csvStats.skaterMinutes % 60}m
                        </div>
                        <div className="text-sm text-muted-foreground">As Skater</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-primary" />
                      <span className="font-medium">Performance Summary</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Games Played</span>
                        <span className="font-medium">{csvStats.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Rating</span>
                        <span className="font-medium">{csvStats.averageRating.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Points</span>
                        <span className="font-medium">{csvStats.totalGoals + csvStats.totalAssists}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captain">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Captain Statistics
              </CardTitle>
              <CardDescription>Your performance as team captain in draft matches</CardDescription>
            </CardHeader>
            <CardContent>
              {!captainStats || captainStats.totalCaptainGames === 0 ? (
                <div className="text-center py-8">
                  <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No captain experience yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Participate in captain drafts to see your leadership stats
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Captain Win Rate</span>
                    </div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                      {captainStats.captainWinRate.toFixed(1)}%
                      {captainStats.captainWinRate > 50 ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {captainStats.captainWins}W - {captainStats.captainLosses}L
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Games as Captain</span>
                    </div>
                    <div className="text-3xl font-bold">{captainStats.totalCaptainGames}</div>
                    <div className="text-sm text-muted-foreground">Total matches led</div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Avg Team ELO</span>
                    </div>
                    <div className="text-3xl font-bold">{captainStats.averageTeamELO}</div>
                    <div className="text-sm text-muted-foreground">Team strength</div>
                  </Card>

                  <Card className="p-4 md:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Captain Achievements</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Best Draft Pick</span>
                          <span className="font-medium">{captainStats.bestDraftPick || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Leadership Rating</span>
                          <Badge variant="outline" className="bg-primary/20 text-primary">
                            {captainStats.captainWinRate > 70
                              ? "Excellent"
                              : captainStats.captainWinRate > 50
                                ? "Good"
                                : "Developing"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Progress value={captainStats.captainWinRate} className="h-2" />
                        <div className="text-sm text-muted-foreground text-center">Captain Success Rate</div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Draft Rooms
              </CardTitle>
              <CardDescription>Your current draft participations and live rooms</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDrafts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading active drafts...</span>
                </div>
              ) : activeDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active drafts</p>
                  <p className="text-sm text-muted-foreground mt-2">Join a draft room to see it here!</p>
                  <Button className="mt-4" onClick={() => (window.location.href = "/leagues")}>
                    Browse Draft Rooms
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${draft.status === "waiting" ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
                        />
                        <div>
                          <h3 className="font-medium">{draft.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{draft.game}</span>
                            <span>•</span>
                            <span>
                              {draft.participants_count}/{draft.max_participants} players
                            </span>
                            <span>•</span>
                            <span>{new Date(draft.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={draft.status === "waiting" ? "secondary" : "default"}>
                          {draft.status === "waiting" ? "Waiting" : "In Progress"}
                        </Badge>
                        <Button size="sm" onClick={() => (window.location.href = `/captain-draft/room/${draft.id}`)}>
                          {draft.status === "waiting" ? "Join Room" : "View Draft"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your recent gaming activity and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading activity...</span>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground mt-2">Start playing to see your activity here!</p>
                  <Button className="mt-4" onClick={() => (window.location.href = "/games")}>
                    Play Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="mt-1">{getActivityIcon(activity.activity_type)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatActivityDescription(activity)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <ProfileAchievements userId={user.id} />
        </TabsContent>

        <TabsContent value="history">
          <EnhancedMatchHistory userId={user.id} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
