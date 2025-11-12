"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Clock, Zap, Trophy, Star, X } from "lucide-react"
import { lobbyQueueService, type LobbyQueue } from "@/lib/services/lobby-queue-service"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function QueuePage() {
  const [queues, setQueues] = useState<LobbyQueue[]>([])
  const [userQueue, setUserQueue] = useState<{
    type: string
    format: string
    count: number
    joinedAt: Date
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && user) {
      loadQueues()
      const interval = setInterval(loadQueues, 3000) // Update every 3 seconds
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const loadQueues = async () => {
    try {
      const allQueues = await lobbyQueueService.getAllQueues()
      setQueues(allQueues)

      // Check if user is in any queue
      const userInQueue = allQueues.find((queue) => queue.queued_users.some((u) => u.user_id === user?.id))

      if (userInQueue) {
        const userEntry = userInQueue.queued_users.find((u) => u.user_id === user?.id)
        if (userEntry) {
          setUserQueue({
            type: userInQueue.queue_type,
            format: userInQueue.game_format,
            count: userInQueue.player_count,
            joinedAt: new Date(Date.now() - userEntry.wait_time * 1000),
          })
        }
      } else {
        setUserQueue(null)
      }
    } catch (error) {
      console.error("[v0] Error loading queues:", error)
    }
  }

  const joinQueue = async (type: "maxed" | "unmaxed", format: "snake_draft" | "auction_draft", count: number) => {
    if (!user) {
      toast.error("Please log in to join a queue")
      return
    }

    setLoading(true)
    try {
      await lobbyQueueService.joinQueue(user.id, type, format, count)
      toast.success(`Joined ${type} ${format.replace("_", " ")} queue!`)
      await loadQueues()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join queue")
    } finally {
      setLoading(false)
    }
  }

  const leaveQueue = async () => {
    if (!user) return

    setLoading(true)
    try {
      await lobbyQueueService.leaveQueue(user.id)
      toast.success("Left queue")
      setUserQueue(null)
      await loadQueues()
    } catch (error) {
      toast.error("Failed to leave queue")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to join matchmaking queues</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matchmaking Queues</h1>
          <p className="text-muted-foreground">Join a queue and get matched automatically</p>
        </div>
      </div>

      {userQueue && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-semibold text-green-700">
                    In Queue: {userQueue.type} - {userQueue.format.replace("_", " ")}
                  </p>
                  <p className="text-sm text-green-600">
                    Waiting for {userQueue.count}v{userQueue.count} match
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={leaveQueue}
                disabled={loading}
                className="border-red-500/20 text-red-600 hover:bg-red-500/10 bg-transparent"
              >
                <X className="h-4 w-4 mr-2" />
                Leave Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Maxed Queues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranked Queues
            </CardTitle>
            <CardDescription>Competitive matches - requires full lobby</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queues
              .filter((q) => q.queue_type === "maxed")
              .map((queue) => (
                <Card key={`${queue.queue_type}-${queue.game_format}-${queue.player_count}`} className="relative">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{queue.game_format.replace("_", " ")}</p>
                          <p className="text-sm text-muted-foreground">
                            {queue.player_count}v{queue.player_count}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {queue.current_players}/{queue.required_players}
                        </Badge>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(queue.current_players / queue.required_players) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Est: {formatWaitTime(queue.estimated_wait_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {queue.current_players} waiting
                        </span>
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => joinQueue("maxed", queue.game_format as any, queue.player_count)}
                        disabled={loading || !!userQueue}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Join Ranked
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </CardContent>
        </Card>

        {/* Unmaxed Queues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Quick Play Queues
            </CardTitle>
            <CardDescription>Casual matches - starts 10s after minimum players</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queues
              .filter((q) => q.queue_type === "unmaxed")
              .map((queue) => (
                <Card key={`${queue.queue_type}-${queue.game_format}-${queue.player_count}`} className="relative">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{queue.game_format.replace("_", " ")}</p>
                          <p className="text-sm text-muted-foreground">
                            {queue.player_count}v{queue.player_count}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {queue.current_players}/{Math.floor(queue.required_players / 2)}+
                        </Badge>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((queue.current_players / (queue.required_players / 2)) * 100, 100)}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Est: {formatWaitTime(Math.min(queue.estimated_wait_time, 30))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {queue.current_players} waiting
                        </span>
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        variant="secondary"
                        onClick={() => joinQueue("unmaxed", queue.game_format as any, queue.player_count)}
                        disabled={loading || !!userQueue}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Join Quick Play
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Queue Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {queues
          .filter((q) => q.queued_users.length > 0)
          .map((queue) => (
            <Card key={`detail-${queue.queue_type}-${queue.game_format}`}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {queue.queue_type === "maxed" ? "Ranked" : "Quick Play"} - {queue.game_format.replace("_", " ")} (
                  {queue.queued_users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queue.queued_users.map((queuedUser, index) => (
                    <div key={queuedUser.user_id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <Badge variant="secondary" className="text-xs min-w-[2rem]">
                        #{index + 1}
                      </Badge>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {queuedUser.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{queuedUser.username}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{queuedUser.elo_rating}</span>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>{formatTime(queuedUser.wait_time)}</span>
                        </div>
                      </div>
                      {queuedUser.user_id === user?.id && (
                        <Badge variant="default" className="bg-green-500">
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
