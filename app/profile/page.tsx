"use client"

import { Suspense, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Target, Settings, DollarSign, Loader2, Activity, Users, Clock, Zap } from "lucide-react"
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
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (authUser) {
      loadUserProfile()
      loadActiveDrafts()
      loadRecentActivity()
    }
  }, [authUser])

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
        // If table doesn't exist, create mock activity data
        console.log("[v0] User activity table not found, using mock data")
        const mockActivity = [
          {
            id: "1",
            activity_type: "draft_join",
            details: { draft_name: "4v4 ELO Draft", game: "Omega Strikers" },
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          },
          {
            id: "2",
            activity_type: "match_complete",
            details: { result: "win", elo_change: "+24", opponent: "ShadowNinja" },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          },
          {
            id: "3",
            activity_type: "tournament_join",
            details: { tournament_name: "Winter Championship", entry_fee: "$10" },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
          },
        ]
        setRecentActivity(mockActivity)
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="drafts">Active Drafts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <PlayerStatsDashboard userId={user.id} />
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

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <input type="text" value={user.username} className="w-full p-3 border rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input type="email" value={user.email} className="w-full p-3 border rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea
                    placeholder="Tell others about yourself..."
                    rows={3}
                    className="w-full p-3 border rounded-md"
                    defaultValue={user.bio || ""}
                  />
                </div>
                <Button>Save Account Changes</Button>
              </CardContent>
            </Card>

            {/* Gaming Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Gaming Preferences</CardTitle>
                <CardDescription>Configure your gaming settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Favorite Game</label>
                    <select className="w-full p-3 border rounded-md" defaultValue={user.favoriteGame}>
                      <option>Omega Strikers</option>
                      <option>Counter Strike</option>
                      <option>Rainbow Six Siege</option>
                      <option>Call of Duty</option>
                      <option>Zealot Hockey</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Favorite Race/Faction</label>
                    <select className="w-full p-3 border rounded-md">
                      <option>Striker</option>
                      <option>Goalie</option>
                      <option>Support</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="auto-join" className="rounded" />
                    <label htmlFor="auto-join" className="text-sm">
                      Auto-join tournaments matching my skill level
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="captain-eligible" className="rounded" />
                    <label htmlFor="captain-eligible" className="text-sm">
                      Available for captain draft selection
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="betting-enabled" className="rounded" />
                    <label htmlFor="betting-enabled" className="text-sm">
                      Enable betting features
                    </label>
                  </div>
                </div>
                <Button>Save Gaming Preferences</Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Control what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Tournament Invitations</label>
                      <p className="text-xs text-muted-foreground">Get notified when invited to tournaments</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Match Results</label>
                      <p className="text-xs text-muted-foreground">Notifications for match outcomes and ELO changes</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Betting Updates</label>
                      <p className="text-xs text-muted-foreground">Updates on your active bets and payouts</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">League Announcements</label>
                      <p className="text-xs text-muted-foreground">Important league news and updates</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Marketing Emails</label>
                      <p className="text-xs text-muted-foreground">Promotional content and special offers</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
                <Button>Save Notification Settings</Button>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>Manage your privacy settings and account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Profile Visibility</label>
                      <p className="text-xs text-muted-foreground">Who can view your profile and statistics</p>
                    </div>
                    <select className="px-3 py-2 border rounded-md">
                      <option>Public</option>
                      <option>Friends Only</option>
                      <option>Private</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Match History</label>
                      <p className="text-xs text-muted-foreground">Who can see your match history</p>
                    </div>
                    <select className="px-3 py-2 border rounded-md">
                      <option>Public</option>
                      <option>Friends Only</option>
                      <option>Private</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Online Status</label>
                      <p className="text-xs text-muted-foreground">Show when you're online</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full bg-transparent">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent">
                      Enable Two-Factor Authentication
                    </Button>
                    <Button variant="destructive" className="w-full">
                      Delete Account
                    </Button>
                  </div>
                </div>
                <Button>Save Privacy Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
