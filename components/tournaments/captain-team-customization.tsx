"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Crown, Palette, Upload, Save, RefreshCw, Target, DollarSign, Users, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface CaptainTeamCustomizationProps {
  tournamentId: string
  teamId?: string
  captainId?: string
  tournament?: any
  onCustomizationSaved?: () => void
}

interface TeamCustomization {
  team_id: string
  team_name: string
  logo_url?: string
  team_colors: {
    primary: string
    secondary: string
    accent: string
  }
  team_branding: {
    motto?: string
    description?: string
    theme?: string
  }
  strategy_notes?: string
  auction_settings: {
    max_bid: number
    auto_bid: boolean
    bid_increment: number
    target_players?: string[]
  }
  snake_draft_settings: {
    position_priority: string[]
    player_targets: string[]
    draft_strategy?: string
  }
  budget_remaining: number
}

export function CaptainTeamCustomization({
  tournamentId,
  teamId,
  captainId,
  tournament,
  onCustomizationSaved,
}: CaptainTeamCustomizationProps) {
  const { user } = useAuth()
  const [customization, setCustomization] = useState<TeamCustomization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const supabase = createClient()

  const currentCaptainId = captainId || user?.id
  const draftType = tournament?.player_pool_settings?.draft_type || "snake"

  useEffect(() => {
    if (currentCaptainId) {
      loadCustomization()
      loadAvailablePlayers()
    }
  }, [tournamentId, currentCaptainId])

  const loadCustomization = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading captain team customization:", { tournamentId, captainId: currentCaptainId })

      // Get captain's team and customization
      const { data, error } = await supabase.rpc("get_captain_team_customization", {
        p_tournament_id: tournamentId,
        p_captain_id: currentCaptainId,
      })

      if (error) throw error

      if (data && data.length > 0) {
        const teamData = data[0]
        setCustomization({
          team_id: teamData.team_id,
          team_name: teamData.team_name,
          logo_url: teamData.logo_url,
          team_colors: teamData.team_colors || {
            primary: "#10b981",
            secondary: "#059669",
            accent: "#0ea5e9",
          },
          team_branding: teamData.team_branding || {},
          strategy_notes: teamData.strategy_notes || "",
          auction_settings: teamData.auction_settings || {
            max_bid: 100,
            auto_bid: false,
            bid_increment: 5,
            target_players: [],
          },
          snake_draft_settings: teamData.snake_draft_settings || {
            position_priority: [],
            player_targets: [],
            draft_strategy: "",
          },
          budget_remaining: teamData.budget_remaining || 500,
        })

        if (teamData.logo_url) {
          setLogoPreview(teamData.logo_url)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading customization:", error)
      toast.error("Failed to load team customization")
    } finally {
      setLoading(false)
    }
  }

  const loadAvailablePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_player_pool")
        .select(`
          user_id,
          users (
            username,
            elo_rating
          )
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "available")

      if (error) throw error

      const players = (data || []).map((entry: any) => ({
        id: entry.user_id,
        username: entry.users?.username || "Unknown",
        elo_rating: entry.users?.elo_rating || 1200,
      }))

      setAvailablePlayers(players.sort((a, b) => b.elo_rating - a.elo_rating))
    } catch (error) {
      console.error("[v0] Error loading available players:", error)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const saveCustomization = async () => {
    if (!customization || !currentCaptainId) return

    setSaving(true)
    try {
      console.log("[v0] Saving captain team customization:", customization)

      // Upload logo if new file selected
      let logoUrl = customization.logo_url
      if (logoFile) {
        // In a real implementation, upload to blob storage
        // For now, we'll use the preview URL
        logoUrl = logoPreview
      }

      const { error } = await supabase.rpc("update_captain_team_customization", {
        p_team_id: customization.team_id,
        p_captain_id: currentCaptainId,
        p_logo_url: logoUrl,
        p_team_colors: customization.team_colors,
        p_team_branding: customization.team_branding,
        p_strategy_notes: customization.strategy_notes,
        p_auction_settings: customization.auction_settings,
        p_snake_draft_settings: customization.snake_draft_settings,
      })

      if (error) throw error

      // Also update the team name in tournament_teams table
      await supabase
        .from("tournament_teams")
        .update({
          team_name: customization.team_name,
          logo_url: logoUrl,
          team_color: customization.team_colors.primary,
        })
        .eq("id", customization.team_id)

      toast.success("Team customization saved successfully!")
      onCustomizationSaved?.()
    } catch (error) {
      console.error("[v0] Error saving customization:", error)
      toast.error("Failed to save team customization")
    } finally {
      setSaving(false)
    }
  }

  const updateCustomization = (updates: Partial<TeamCustomization>) => {
    if (!customization) return
    setCustomization({ ...customization, ...updates })
  }

  const updateTeamColors = (colorType: "primary" | "secondary" | "accent", color: string) => {
    if (!customization) return
    updateCustomization({
      team_colors: {
        ...customization.team_colors,
        [colorType]: color,
      },
    })
  }

  const updateTeamBranding = (updates: Partial<TeamCustomization["team_branding"]>) => {
    if (!customization) return
    updateCustomization({
      team_branding: {
        ...customization.team_branding,
        ...updates,
      },
    })
  }

  const updateAuctionSettings = (updates: Partial<TeamCustomization["auction_settings"]>) => {
    if (!customization) return
    updateCustomization({
      auction_settings: {
        ...customization.auction_settings,
        ...updates,
      },
    })
  }

  const updateSnakeDraftSettings = (updates: Partial<TeamCustomization["snake_draft_settings"]>) => {
    if (!customization) return
    updateCustomization({
      snake_draft_settings: {
        ...customization.snake_draft_settings,
        ...updates,
      },
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team customization...</p>
        </CardContent>
      </Card>
    )
  }

  if (!customization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Team Assigned</h3>
          <p className="text-muted-foreground">You need to be assigned as a team captain to customize your team.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Overview Header */}
      <Card className="border-l-4" style={{ borderLeftColor: customization.team_colors.primary }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={logoPreview || customization.logo_url} alt={customization.team_name} />
              <AvatarFallback
                className="text-white font-bold text-lg"
                style={{ backgroundColor: customization.team_colors.primary }}
              >
                {customization.team_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{customization.team_name}</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  Captain
                </Badge>
                {draftType === "auction" && (
                  <Badge variant="outline" className="text-green-600">
                    <DollarSign className="h-3 w-3 mr-1" />${customization.budget_remaining} Budget
                  </Badge>
                )}
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Customize your team's appearance, strategy, and draft preferences as the team captain.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Team Branding</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Notes</TabsTrigger>
          {draftType === "auction" && <TabsTrigger value="auction">Auction Settings</TabsTrigger>}
          {draftType === "snake" && <TabsTrigger value="snake">Snake Draft</TabsTrigger>}
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Team Branding & Identity
              </CardTitle>
              <CardDescription>Customize your team's visual identity and branding elements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Name */}
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={customization.team_name}
                  onChange={(e) => updateCustomization({ team_name: e.target.value })}
                  placeholder="Enter your team name"
                />
              </div>

              {/* Team Logo */}
              <div className="space-y-2">
                <Label>Team Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
                    {logoPreview ? (
                      <img
                        src={logoPreview || "/placeholder.svg"}
                        alt="Team logo preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
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
                          Upload Team Logo
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Team Colors */}
              <div className="space-y-4">
                <Label>Team Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor" className="text-sm">
                      Primary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="primaryColor"
                        value={customization.team_colors.primary}
                        onChange={(e) => updateTeamColors("primary", e.target.value)}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={customization.team_colors.primary}
                        onChange={(e) => updateTeamColors("primary", e.target.value)}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor" className="text-sm">
                      Secondary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={customization.team_colors.secondary}
                        onChange={(e) => updateTeamColors("secondary", e.target.value)}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={customization.team_colors.secondary}
                        onChange={(e) => updateTeamColors("secondary", e.target.value)}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor" className="text-sm">
                      Accent
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="accentColor"
                        value={customization.team_colors.accent}
                        onChange={(e) => updateTeamColors("accent", e.target.value)}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={customization.team_colors.accent}
                        onChange={(e) => updateTeamColors("accent", e.target.value)}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Motto & Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamMotto">Team Motto</Label>
                  <Input
                    id="teamMotto"
                    value={customization.team_branding.motto || ""}
                    onChange={(e) => updateTeamBranding({ motto: e.target.value })}
                    placeholder="Enter your team's motto or slogan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">Team Description</Label>
                  <Textarea
                    id="teamDescription"
                    value={customization.team_branding.description || ""}
                    onChange={(e) => updateTeamBranding({ description: e.target.value })}
                    placeholder="Describe your team's playstyle and goals"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Strategy & Notes
              </CardTitle>
              <CardDescription>Keep track of your draft strategy, player preferences, and team notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategyNotes">Strategy Notes</Label>
                <Textarea
                  id="strategyNotes"
                  value={customization.strategy_notes}
                  onChange={(e) => updateCustomization({ strategy_notes: e.target.value })}
                  placeholder="Write your draft strategy, player targets, team composition plans..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  These notes are private and only visible to you as the team captain.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {draftType === "auction" && (
          <TabsContent value="auction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Auction Draft Settings
                </CardTitle>
                <CardDescription>Configure your bidding strategy and auction preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxBid">Maximum Bid Amount</Label>
                    <Input
                      id="maxBid"
                      type="number"
                      value={customization.auction_settings.max_bid}
                      onChange={(e) => updateAuctionSettings({ max_bid: Number(e.target.value) })}
                      min={1}
                      max={customization.budget_remaining}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bidIncrement">Bid Increment</Label>
                    <Select
                      value={customization.auction_settings.bid_increment.toString()}
                      onValueChange={(value) => updateAuctionSettings({ bid_increment: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">$1</SelectItem>
                        <SelectItem value="5">$5</SelectItem>
                        <SelectItem value="10">$10</SelectItem>
                        <SelectItem value="25">$25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Bidding</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically bid up to your maximum for target players
                    </p>
                  </div>
                  <Switch
                    checked={customization.auction_settings.auto_bid}
                    onCheckedChange={(checked) => updateAuctionSettings({ auto_bid: checked })}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Target Players</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availablePlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <input
                          type="checkbox"
                          checked={customization.auction_settings.target_players?.includes(player.id) || false}
                          onChange={(e) => {
                            const targets = customization.auction_settings.target_players || []
                            if (e.target.checked) {
                              updateAuctionSettings({ target_players: [...targets, player.id] })
                            } else {
                              updateAuctionSettings({ target_players: targets.filter((id) => id !== player.id) })
                            }
                          }}
                          className="rounded"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{player.username}</p>
                          <p className="text-xs text-muted-foreground">{player.elo_rating} ELO</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {draftType === "snake" && (
          <TabsContent value="snake" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Snake Draft Settings
                </CardTitle>
                <CardDescription>Set your draft strategy and player preferences for snake draft.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="draftStrategy">Draft Strategy</Label>
                  <Select
                    value={customization.snake_draft_settings.draft_strategy || ""}
                    onValueChange={(value) => updateSnakeDraftSettings({ draft_strategy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your draft strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_available">Best Available Player</SelectItem>
                      <SelectItem value="position_based">Position-Based Drafting</SelectItem>
                      <SelectItem value="elo_focused">ELO-Focused Strategy</SelectItem>
                      <SelectItem value="balanced">Balanced Team Building</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Priority Players</Label>
                  <p className="text-sm text-muted-foreground">
                    Select players you want to prioritize in your draft picks
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availablePlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <input
                          type="checkbox"
                          checked={customization.snake_draft_settings.player_targets?.includes(player.id) || false}
                          onChange={(e) => {
                            const targets = customization.snake_draft_settings.player_targets || []
                            if (e.target.checked) {
                              updateSnakeDraftSettings({ player_targets: [...targets, player.id] })
                            } else {
                              updateSnakeDraftSettings({ player_targets: targets.filter((id) => id !== player.id) })
                            }
                          }}
                          className="rounded"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{player.username}</p>
                          <p className="text-xs text-muted-foreground">{player.elo_rating} ELO</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          #{availablePlayers.indexOf(player) + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={loadCustomization} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <Button onClick={saveCustomization} disabled={saving} size="lg">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Team Customization
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
