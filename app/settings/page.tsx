"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  Bell,
  Shield,
  User,
  Palette,
  Users,
  Plus,
  Send,
  Trash2,
  Upload,
  ImageIcon,
  Mail,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    tournaments: true,
    betting: true,
    drafts: true,
  })

  const [teams, setTeams] = useState([])
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    game: "omega-strikers",
    logo: null as File | null,
    maxPlayers: 5,
  })
  const [inviteEmail, setInviteEmail] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [emailVerificationStatus, setEmailVerificationStatus] = useState<"verified" | "unverified" | "checking">(
    "checking",
  )
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  const [profileData, setProfileData] = useState({
    username: "",
    account_id: "",
    favorite_game: "omega-strikers",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isResettingData, setIsResettingData] = useState(false)

  useEffect(() => {
    const checkEmailVerification = async () => {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser?.email_confirmed_at) {
        setEmailVerificationStatus("verified")
      } else {
        setEmailVerificationStatus("unverified")
      }
    }

    if (user) {
      checkEmailVerification()
      setProfileData({
        username: user.username || "",
        account_id: user.account_id || "",
        favorite_game: "omega-strikers",
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setIsSavingProfile(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("users")
        .update({
          username: profileData.username,
          account_id: profileData.account_id,
          favorite_game: profileData.favorite_game,
        })
        .eq("id", user.id)

      if (error) throw error

      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleResetData = async () => {
    if (!user?.id) return

    const confirmed = confirm(
      "⚠️ WARNING: This will permanently delete ALL your data including:\n\n" +
        "• Tournament history\n" +
        "• Match records\n" +
        "• ELO ratings\n" +
        "• Betting history\n" +
        "• Team memberships\n" +
        "• Draft participation\n\n" +
        "This action CANNOT be undone. Are you absolutely sure?",
    )

    if (!confirmed) return

    const doubleConfirm = confirm(
      "This is your final warning. Clicking OK will permanently delete all your data. Continue?",
    )

    if (!doubleConfirm) return

    setIsResettingData(true)
    const supabase = createClient()

    try {
      // Reset user data across all tables
      const resetOperations = [
        supabase.from("user_tournament_signups").delete().eq("user_id", user.id),
        supabase.from("match_results").delete().eq("user_id", user.id),
        supabase.from("player_performances").delete().eq("user_id", user.id),
        supabase.from("elo_games").delete().eq("user_id", user.id),
        supabase.from("betting_transactions").delete().eq("user_id", user.id),
        supabase.from("wager_matches_participants").delete().eq("user_id", user.id),
        supabase.from("draft_participants").delete().eq("user_id", user.id),
        supabase.from("team_members").delete().eq("user_id", user.id),
        supabase.from("announcements").delete().eq("created_by", user.id),
        // Reset user stats
        supabase
          .from("users")
          .update({
            elo_rating: 1000,
            elo_variation: 100,
            matches_played: 0,
            matches_won: 0,
            total_earnings: 0,
            current_balance: 100, // Reset to starting balance
            tournament_wins: 0,
            mvp_count: 0,
          })
          .eq("id", user.id),
      ]

      await Promise.all(resetOperations)

      alert("✅ All data has been reset successfully! Your account has been restored to default settings.")

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error("Error resetting data:", error)
      alert("Failed to reset data. Please contact support if this issue persists.")
    } finally {
      setIsResettingData(false)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setNewTeam({ ...newTeam, logo: file })
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCreateTeam = async () => {
    console.log("[v0] Creating team with logo:", newTeam)

    if (newTeam.logo) {
      const formData = new FormData()
      formData.append("file", newTeam.logo)
      // Logo upload logic will be implemented with blob storage
    }

    setNewTeam({ name: "", description: "", game: "omega-strikers", logo: null, maxPlayers: 5 })
    setLogoPreview(null)
  }

  const handleInvitePlayer = async (teamId: string) => {
    console.log("[v0] Inviting player to team:", teamId, inviteEmail)
    setInviteEmail("")
  }

  const handleResendVerification = async () => {
    setIsResendingVerification(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user?.email || "",
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      alert("Verification email sent! Please check your inbox.")
    } catch (error) {
      console.error("Error resending verification:", error)
      alert("Failed to send verification email. Please try again.")
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user?.email) return

    setIsUpdatingEmail(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      })

      if (error) throw error

      alert("Email update initiated! Please check both your old and new email for confirmation.")
      setNewEmail("")
      setEmailVerificationStatus("unverified")
    } catch (error) {
      console.error("Error updating email:", error)
      alert("Failed to update email. Please try again.")
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID</Label>
                  <Input
                    id="accountId"
                    value={profileData.account_id}
                    onChange={(e) => setProfileData({ ...profileData, account_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteGame">Favorite Game</Label>
                <Select
                  value={profileData.favorite_game}
                  onValueChange={(value) => setProfileData({ ...profileData, favorite_game: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omega-strikers">Omega Strikers</SelectItem>
                    <SelectItem value="counter-strike">Counter Strike</SelectItem>
                    <SelectItem value="rainbow-six">Rainbow Six Siege</SelectItem>
                    <SelectItem value="call-of-duty">Call of Duty</SelectItem>
                    <SelectItem value="zealot-hockey">Zealot Hockey</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Database className="h-5 w-5" />
                Reset Data
              </CardTitle>
              <CardDescription>
                Permanently delete all your data and reset your account to default settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Danger Zone</p>
                    <p className="text-xs text-muted-foreground">
                      This will permanently delete ALL your data including tournament history, match records, ELO
                      ratings, betting history, team memberships, and draft participation. This action cannot be undone.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Tournament signups and history</li>
                      <li>• Match results and performance data</li>
                      <li>• ELO ratings (reset to 1000)</li>
                      <li>• Betting transactions and history</li>
                      <li>• Team memberships and created teams</li>
                      <li>• Draft participation records</li>
                      <li>• Account balance (reset to $100)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button variant="destructive" onClick={handleResetData} disabled={isResettingData} className="w-full">
                {isResettingData ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Authentication
              </CardTitle>
              <CardDescription>Manage your email verification for tournament creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Current Email</Label>
                    {emailVerificationStatus === "verified" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : emailVerificationStatus === "unverified" ? (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    ) : null}
                  </div>
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {emailVerificationStatus === "verified"
                      ? "✅ Verified - You can create tournaments"
                      : emailVerificationStatus === "unverified"
                        ? "⚠️ Unverified - Email verification required for tournament creation"
                        : "Checking verification status..."}
                  </p>
                </div>
                {emailVerificationStatus === "unverified" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                  >
                    {isResendingVerification ? "Sending..." : "Resend Verification"}
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Update Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="Enter new email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUpdateEmail}
                      disabled={!newEmail || newEmail === user?.email || isUpdatingEmail}
                      size="sm"
                    >
                      {isUpdatingEmail ? "Updating..." : "Update"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Changing your email will require verification of both old and new addresses
                  </p>
                </div>
              </div>

              {emailVerificationStatus === "unverified" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-orange-800">Email Verification Required</p>
                      <p className="text-xs text-orange-700">
                        You need to verify your email address to create tournaments and access all features. Check your
                        inbox for a verification email or click "Resend Verification" above.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create New Team
              </CardTitle>
              <CardDescription>Create and manage your teams for tournaments and matches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Team Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
                    {logoPreview ? (
                      <img
                        src={logoPreview || "/placeholder.svg"}
                        alt="Team logo preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button variant="outline" className="w-full bg-transparent" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamGame">Game</Label>
                  <Select value={newTeam.game} onValueChange={(value) => setNewTeam({ ...newTeam, game: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="omega-strikers">Omega Strikers</SelectItem>
                      <SelectItem value="counter-strike">Counter Strike</SelectItem>
                      <SelectItem value="rainbow-six">Rainbow Six Siege</SelectItem>
                      <SelectItem value="call-of-duty">Call of Duty</SelectItem>
                      <SelectItem value="zealot-hockey">Zealot Hockey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Team Spots (Max Players)</Label>
                <Select
                  value={newTeam.maxPlayers.toString()}
                  onValueChange={(value) => setNewTeam({ ...newTeam, maxPlayers: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="5">5 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                    <SelectItem value="8">8 Players</SelectItem>
                    <SelectItem value="10">10 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamDescription">Team Description</Label>
                <Textarea
                  id="teamDescription"
                  placeholder="Describe your team's playstyle and goals"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateTeam} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Manage your existing teams and send invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No teams created yet. Create your first team above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team: any) => (
                    <Card key={team.id} className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          {team.logo ? (
                            <img
                              src={team.logo || "/placeholder.svg"}
                              alt={`${team.name} logo`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{team.name}</h3>
                            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">{team.game}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {team.currentPlayers || 0}/{team.maxPlayers} players
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter username to invite"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleInvitePlayer(team.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tournament Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified about tournament events</p>
                </div>
                <Switch
                  checked={notifications.tournaments}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, tournaments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Betting Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notifications for betting opportunities</p>
                </div>
                <Switch
                  checked={notifications.betting}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, betting: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Draft Notifications</Label>
                  <p className="text-sm text-muted-foreground">Updates about draft events</p>
                </div>
                <Switch
                  checked={notifications.drafts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, drafts: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
              <CardDescription>Manage your privacy settings and account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show ELO Rating</Label>
                  <p className="text-sm text-muted-foreground">Display your ELO rating publicly</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Match History</Label>
                  <p className="text-sm text-muted-foreground">Allow others to view your match history</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how the platform looks for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select defaultValue="system">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
