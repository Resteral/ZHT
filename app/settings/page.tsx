"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Bell, Shield, User, Palette, Users, Plus, Send, Trash2, Upload, ImageIcon } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"

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
                  <Input id="username" defaultValue={user?.username} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID</Label>
                  <Input id="accountId" defaultValue={user?.account_id} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteGame">Favorite Game</Label>
                <Select defaultValue="omega-strikers">
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
              <Button>Save Changes</Button>
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
