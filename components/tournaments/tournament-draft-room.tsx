"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Gavel, Users, MessageCircle, Trophy, Star, Target, Crown, Timer, Zap, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTournamentDraft, useTournamentDraftChat } from "@/lib/hooks/use-tournament-draft"
import { CaptainTeamCustomization } from "./captain-team-customization"

interface TournamentDraftRoomProps {
  tournamentId: string
  userRole: "organizer" | "participant" | "spectator"
  tournament?: any
  isCreator?: boolean
}

export function TournamentDraftRoom({
  tournamentId,
  userRole,
  tournament,
  isCreator = false,
}: TournamentDraftRoomProps) {
  const { user } = useAuth()
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [showTeamCustomization, setShowTeamCustomization] = useState(false)

  const {
    draftState,
    draftSettings,
    teams,
    availablePlayers,
    draftHistory,
    loading,
    error,
    startDraft,
    draftPlayer,
    placeBid,
    startPlayerAuction,
    pauseDraft,
    setPassDecision,
    isConnected,
    lastUpdate,
  } = useTournamentDraft(tournamentId, user?.id)

  const { messages: chatMessages, sendMessage } = useTournamentDraftChat(tournamentId, user?.id)

  const getCurrentTeam = () => {
    if (!draftState || !teams.length) return null
    if (draftState.status === "choosing_order") {
      return teams.find((t) => t.id === draftState.current_team_id) || null
    }
    return teams[draftState.current_team_index]
  }

  const isUserTurn = () => {
    const currentTeam = getCurrentTeam()
    return currentTeam && user && currentTeam.captain_id === user.id
  }

  const isUserCaptain = () => {
    if (!user || !teams.length) return false
    return teams.some((team) => team.captain_id === user.id)
  }

  const handleDraftPlayer = async (playerId: string) => {
    const currentTeam = getCurrentTeam()
    if (!currentTeam) return

    if (draftSettings?.draft_type === "auction") {
      setSelectedPlayer(availablePlayers.find((p) => p.id === playerId))
    } else {
      await draftPlayer(playerId, currentTeam.id)
    }
  }

  const handlePlaceBid = async () => {
    if (!selectedPlayer || !bidAmount) return

    const currentTeam = getCurrentTeam()
    if (!currentTeam) return

    const bid = Number(bidAmount)
    await placeBid(selectedPlayer.id, currentTeam.id, bid)
    setSelectedPlayer(null)
    setBidAmount("")
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    await sendMessage(newMessage)
    setNewMessage("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading draft room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  const minParticipants =
    (draftSettings?.num_teams || draftSettings?.max_teams) * (draftSettings?.players_per_team || 4)

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="font-medium">Reconnecting to draft room...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Initiative Selection Protocol */}
      {draftState?.status === "choosing_order" && (
        <Card className="border-primary/50 bg-primary/5 backdrop-blur-xl shadow-[0_0_30px_rgba(var(--primary),0.1)] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
          <CardContent className="pt-10 pb-10 relative z-10">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-bounce-slow shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                <Zap className="size-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Strategic Initiative</h3>
                <div className="flex items-center justify-center gap-3">
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/50 text-amber-500 font-black italic">COMMAND PHASE</Badge>
                    <p className="text-muted-foreground font-bold">
                        <strong>{getCurrentTeam()?.captain_name}</strong> holds the initiative
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4 max-w-lg mx-auto">
                    <p className="text-sm italic text-muted-foreground leading-relaxed">
                        "As the 2nd highest ranked captain, you possess the tactical advantage. Choose to command the first pick, or defer the opening move to claim superior mid-round positioning."
                    </p>
                </div>
              </div>
              
              {isUserTurn() ? (
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mt-4">
                    <Button 
                        onClick={() => setPassDecision(false)} 
                        className="flex-1 h-20 bg-primary hover:bg-primary/80 text-white font-black uppercase italic tracking-widest rounded-2xl border-t border-white/20 shadow-2xl transition-all hover:scale-[1.02]"
                    >
                        <div className="flex flex-col items-center">
                            <span>Claim #1 Pick</span>
                            <span className="text-[10px] opacity-70 font-mono font-normal normal-case mt-1">Direct snake: 1, 2, 2, 1, 1, 2</span>
                        </div>
                    </Button>
                    <Button 
                        onClick={() => setPassDecision(true)} 
                        variant="outline"
                        className="flex-1 h-20 border-primary/30 hover:bg-primary/10 text-primary font-black uppercase italic tracking-widest rounded-2xl transition-all hover:scale-[1.02]"
                    >
                        <div className="flex flex-col items-center">
                            <span>Strategic Pass</span>
                            <span className="text-[10px] opacity-70 font-mono font-normal normal-case mt-1">Gain picks #3 and #4 instead</span>
                        </div>
                    </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 bg-white/5 rounded-2xl px-8 border border-white/5">
                    <div className="flex items-center gap-3">
                        <Timer className="size-5 text-primary animate-pulse" />
                        <p className="text-white font-black uppercase tracking-widest text-sm italic">Transmission Incoming...</p>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase font-mono tracking-tighter">Waiting for {getCurrentTeam()?.captain_name} to deploy strategy</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="absolute -bottom-10 -right-10 size-40 bg-primary/10 blur-[50px]" />
        </Card>
      )}

      {/* Existing Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-purple-500" />
              Tournament Player Pool Draft
              {draftState?.status === "active" && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
              )}
              {tournament?.creator && isCreator && (
                <Badge variant="outline" className="text-xs ml-2">
                  <Crown className="h-3 w-3 mr-1" />
                  Host
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={draftState?.status === "active" ? "default" : "secondary"}>
                {draftState?.status === "active" ? "Live Draft" : draftState?.status || "Waiting"}
              </Badge>
              {draftState?.status === "active" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {Math.floor((draftState.time_remaining || 0) / 60)}:
                  {((draftState.time_remaining || 0) % 60).toString().padStart(2, "0")}
                </Badge>
              )}
              {isUserCaptain() && (
                <Button variant="outline" size="sm" onClick={() => setShowTeamCustomization(!showTeamCustomization)}>
                  <Settings className="h-3 w-3 mr-1" />
                  Team Settings
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {draftSettings?.draft_type === "auction"
              ? "Auction Draft"
              : draftSettings?.draft_type === "snake"
                ? "Snake Draft"
                : "Linear Draft"}{" "}
            • {draftSettings?.num_teams || draftSettings?.max_teams} teams • {draftSettings?.players_per_team} players
            per team
            {draftState && (
              <span className="ml-2">
                • Round {draftState.current_round} • Pick {draftState.current_pick}
              </span>
            )}
            {tournament?.player_pool_settings?.captain_selection_method && (
              <span className="ml-2">
                • Captain Selection: {tournament.player_pool_settings.captain_selection_method.replace("_", " ")}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        {draftState?.status === "waiting" && userRole === "organizer" && (
          <CardContent>
            <Button onClick={startDraft} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Start Draft
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Teams */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Team Rosters & Ownership
              </CardTitle>
              <CardDescription>
                Each team has one owner/captain who makes draft picks and manages the roster
                {isCreator && tournament?.player_pool_settings?.captain_selection_method === "creator_choice" && (
                  <span className="text-primary ml-2">• You can edit team owners in tournament management</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {teams.map((team, index) => (
                  <Card
                    key={team.id}
                    className={`${
                      draftState?.current_team_index === index && draftState?.status === "active"
                        ? "border-amber-500 bg-amber-5 dark:bg-amber-950/20"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {team.name}
                            <Crown className="h-4 w-4 text-amber-500" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            <strong>Owner:</strong> {team.captain_name}
                            {user?.id === team.captain_id && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Your Team
                              </Badge>
                            )}
                            {isCreator && tournament?.created_by === user?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                Host Control
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {team.players.length}/{draftSettings?.players_per_team}
                          </Badge>
                          {draftSettings?.draft_type === "auction" && (
                            <div className="text-sm text-emerald-700 font-medium">${team.budget_remaining}</div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 min-h-[120px]">
                        {team.players.length > 0 ? (
                          team.players.map((player) => (
                            <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {player.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{player.username}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>ELO: {player.elo_rating}</span>
                                  {player.draft_cost && <span className="text-emerald-700">${player.draft_cost}</span>}
                                  {player.id === team.captain_id && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Captain
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No players drafted</p>
                              <p className="text-xs">Captain: {team.captain_name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Players */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Available Players ({availablePlayers.length})
              </CardTitle>
              <CardDescription>Players ranked by CSV performance (Goals + Assists + Saves)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {availablePlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPlayer?.id === player.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPlayer(player)}
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
                          <span>{player.total_score}</span>
                        </div>
                        <span>
                          {player.csv_stats.goals}G {player.csv_stats.assists}A {player.csv_stats.saves}S
                        </span>
                      </div>
                    </div>
                    {isUserTurn() && draftSettings && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDraftPlayer(player.id)
                        }}
                      >
                        {draftSettings.draft_type === "auction" ? "Bid" : "Draft"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Draft Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium">{msg.users?.username || "Unknown"}:</span> {msg.message}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Draft Progress */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Draft Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Players Drafted</span>
                  <span>
                    {draftHistory.length}/{minParticipants}
                  </span>
                </div>
                <Progress value={(draftHistory.length / minParticipants) * 100} />
                {draftState && (
                  <div className="text-xs text-muted-foreground">
                    Round {draftState.current_round} • Pick {draftState.current_pick}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
              {lastUpdate && (
                <div className="text-xs text-muted-foreground mt-1">
                  Last update: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auction Bidding Modal */}
      {draftSettings?.draft_type === "auction" && selectedPlayer && isUserTurn() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-lg w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Set Price for {selectedPlayer.username}
              </CardTitle>
              <CardDescription>
                Current bid: ${draftState?.auction_state?.current_bid || 1} • Your budget: $
                {getCurrentTeam()?.budget_remaining || 0}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-700">
                  ${draftState?.auction_state?.current_bid || 1}
                </div>
                <div className="text-sm text-muted-foreground">Current Highest Bid</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ELO: {selectedPlayer.elo_rating} • CSV Score: {selectedPlayer.total_score}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter your bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 text-lg font-semibold"
                    min={(draftState?.auction_state?.current_bid || 0) + 1}
                    max={getCurrentTeam()?.budget_remaining || 0}
                  />
                  <Button
                    onClick={handlePlaceBid}
                    disabled={!bidAmount || Number(bidAmount) <= (draftState?.auction_state?.current_bid || 0)}
                    className="px-6"
                  >
                    Bid ${bidAmount}
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    onClick={() => setBidAmount(((draftState?.auction_state?.current_bid || 0) + 10).toString())}
                    variant="outline"
                    size="sm"
                    disabled={
                      (draftState?.auction_state?.current_bid || 0) + 10 > (getCurrentTeam()?.budget_remaining || 0)
                    }
                  >
                    +$10
                  </Button>
                  <Button
                    onClick={() => setBidAmount(((draftState?.auction_state?.current_bid || 0) + 25).toString())}
                    variant="outline"
                    size="sm"
                    disabled={
                      (draftState?.auction_state?.current_bid || 0) + 25 > (getCurrentTeam()?.budget_remaining || 0)
                    }
                  >
                    +$25
                  </Button>
                  <Button
                    onClick={() => setBidAmount(((draftState?.auction_state?.current_bid || 0) + 50).toString())}
                    variant="outline"
                    size="sm"
                    disabled={
                      (draftState?.auction_state?.current_bid || 0) + 50 > (getCurrentTeam()?.budget_remaining || 0)
                    }
                  >
                    +$50
                  </Button>
                  <Button
                    onClick={() =>
                      setBidAmount(
                        Math.min(
                          getCurrentTeam()?.budget_remaining || 0,
                          (draftState?.auction_state?.current_bid || 0) + 100,
                        ).toString(),
                      )
                    }
                    variant="outline"
                    size="sm"
                    className="text-orange-600"
                    disabled={
                      (draftState?.auction_state?.current_bid || 0) + 100 > (getCurrentTeam()?.budget_remaining || 0)
                    }
                  >
                    Max
                  </Button>
                </div>

                <div className="text-xs">
                  {Number(bidAmount) <= (draftState?.auction_state?.current_bid || 0) && bidAmount && (
                    <span className="text-red-500">
                      ⚠️ Must bid higher than ${draftState?.auction_state?.current_bid || 0}
                    </span>
                  )}
                  {Number(bidAmount) > (getCurrentTeam()?.budget_remaining || 0) && (
                    <span className="text-red-500">
                      ⚠️ Exceeds budget (${getCurrentTeam()?.budget_remaining || 0} available)
                    </span>
                  )}
                  {Number(bidAmount) > (draftState?.auction_state?.current_bid || 0) &&
                    Number(bidAmount) <= (getCurrentTeam()?.budget_remaining || 0) && (
                      <span className="text-green-600">✅ Valid bid</span>
                    )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedPlayer(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
