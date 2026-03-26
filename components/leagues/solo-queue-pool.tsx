"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Clock, Zap, Target, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

interface QueuedPlayer {
  id: string
  username: string
  elo_rating: number
  queue_time: string
  preferred_format: string
}

interface MatchmakingPool {
  format: string
  players: QueuedPlayer[]
  estimated_wait: number
}

export function SoloQueuePool() {
  const [pools, setPools] = useState<MatchmakingPool[]>([])
  const [userInQueue, setUserInQueue] = useState<string | null>(null)
  const [queueTime, setQueueTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    loadQueuePools()
    const interval = setInterval(loadQueuePools, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (userInQueue) {
      const timer = setInterval(() => {
        setQueueTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [userInQueue])

  const loadQueuePools = async () => {
    try {
      const { data: queueData } = await supabase
        .from("solo_queue")
        .select(`
          *,
          users(username, elo_rating)
        `)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })

      if (queueData) {
        // Group players by format
        const poolsMap: { [key: string]: QueuedPlayer[] } = {}

        queueData.forEach((entry: any) => {
          const format = entry.preferred_format || "4v4"
          if (!poolsMap[format]) {
            poolsMap[format] = []
          }
          poolsMap[format].push({
            id: entry.user_id,
            username: entry.users?.username || "Unknown",
            elo_rating: entry.users?.elo_rating || 1000,
            queue_time: entry.created_at,
            preferred_format: format,
          })
        })

        // Convert to pools array
        const poolsArray = Object.entries(poolsMap).map(([format, players]) => ({
          format,
          players,
          estimated_wait: Math.max(1, Math.ceil((8 - players.length) * 2)), // Estimate 2 minutes per missing player
        }))

        setPools(poolsArray)

        // Check if current user is in queue
        const userQueue = queueData.find((entry: any) => entry.user_id === user?.id)
        if (userQueue) {
          setUserInQueue(userQueue.preferred_format)
          const queueStart = new Date(userQueue.created_at).getTime()
          setQueueTime(Math.floor((Date.now() - queueStart) / 1000))
        } else {
          setUserInQueue(null)
          setQueueTime(0)
        }
      }
    } catch (error) {
      console.error("Error loading queue pools:", error)
    }
  }

  const joinQueue = async (format: string) => {
    if (!user || loading) return

    setLoading(true)
    try {
      const { error } = await supabase.from("solo_queue").insert({
        user_id: user.id,
        preferred_format: format,
        status: "waiting",
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setUserInQueue(format)
      setQueueTime(0)
      await loadQueuePools()
    } catch (error) {
      console.error("Error joining queue:", error)
    } finally {
      setLoading(false)
    }
  }

  const leaveQueue = async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      const { error } = await supabase.from("solo_queue").delete().eq("user_id", user.id).eq("status", "waiting")

      if (error) throw error

      setUserInQueue(null)
      setQueueTime(0)
      await loadQueuePools()
    } catch (error) {
      console.error("Error leaving queue:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-500" />
            Solo Queue Pool
          </CardTitle>
          <CardDescription>
            Join the matchmaking pool and get automatically matched with other solo players
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userInQueue ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-green-700">In Queue: {userInQueue}</p>
                    <p className="text-sm text-green-600">Queue time: {formatTime(queueTime)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={leaveQueue}
                  disabled={loading}
                  className="border-red-500/20 text-red-600 hover:bg-red-500/10 bg-transparent"
                >
                  Leave Queue
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {["1v1", "2v2", "3v3", "4v4"].map((format) => {
                const pool = pools.find((p) => p.format === format)
                const playerCount = pool?.players.length || 0
                const maxPlayers = Number.parseInt(format) * 2

                return (
                  <Card key={format} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{format}</CardTitle>
                        <Badge variant="outline">
                          {playerCount}/{maxPlayers}
                        </Badge>
                      </div>
                      <CardDescription>Est. wait: {pool?.estimated_wait || 5}min</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(playerCount / maxPlayers) * 100}%` }}
                          />
                        </div>
                        <Button className="w-full" size="sm" onClick={() => joinQueue(format)} disabled={loading}>
                          <Zap className="h-3 w-3 mr-1" />
                          Join {format}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {pools.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {pools.map((pool) => (
            <Card key={pool.format}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  {pool.format} Queue ({pool.players.length})
                </CardTitle>
                <CardDescription>Players waiting for {pool.format} matches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pool.players.map((player, index) => {
                    const waitTime = Math.floor((Date.now() - new Date(player.queue_time).getTime()) / 1000)

                    return (
                      <div key={player.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs min-w-[2rem]">
                            #{index + 1}
                          </Badge>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {player.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{player.username}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" />
                            <span>{player.elo_rating}</span>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>{formatTime(waitTime)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {pool.players.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No players in {pool.format} queue</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
