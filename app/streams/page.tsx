"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Eye, Calendar, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { streamService } from "@/lib/services/stream-service"

interface Stream {
  id: string
  title: string
  description: string
  game_title: string
  tournament_name: string
  status: string
  viewer_count: number
  platform: string
  created_at: string
  started_at: string
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStreams()
  }, [])

  const loadStreams = async () => {
    try {
      const data = await streamService.getStreams()
      setStreams(data)
    } catch (error) {
      console.error("Error loading streams:", error)
    } finally {
      setLoading(false)
    }
  }

  const liveStreams = streams.filter((s) => s.status === "live")
  const upcomingStreams = streams.filter((s) => s.status === "offline")
  const endedStreams = streams.filter((s) => s.status === "ended")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500"
      case "offline":
        return "bg-gray-500"
      case "ended":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitch":
        return "🎮"
      case "youtube":
        return "📺"
      default:
        return "📡"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading streams...</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Game Streams</h1>
          <p className="text-muted-foreground">Watch live games and tournaments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">{liveStreams.length} Live</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Play className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStreams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveStreams.reduce((sum, s) => sum + s.viewer_count, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingStreams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streams.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stream Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live ({liveStreams.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingStreams.length})</TabsTrigger>
          <TabsTrigger value="ended">Ended ({endedStreams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          {liveStreams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No live streams</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingStreams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming streams</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-4">
          {endedStreams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ended streams</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {endedStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StreamCard({ stream }: { stream: Stream }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500"
      case "offline":
        return "bg-gray-500"
      case "ended":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitch":
        return "🎮"
      case "youtube":
        return "📺"
      default:
        return "📡"
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">{stream.title}</CardTitle>
            <CardDescription className="line-clamp-2">{stream.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(stream.status)}>
            {stream.status === "live" && <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />}
            {stream.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>{getPlatformIcon(stream.platform)}</span>
            <span className="text-muted-foreground">{stream.game_title}</span>
          </div>
          {stream.status === "live" && (
            <div className="flex items-center gap-1 text-red-500">
              <Eye className="h-4 w-4" />
              <span>{stream.viewer_count.toLocaleString()}</span>
            </div>
          )}
        </div>

        {stream.tournament_name && (
          <Badge variant="outline" className="text-xs">
            {stream.tournament_name}
          </Badge>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {stream.status === "live" ? "Started" : "Created"}{" "}
            {new Date(stream.started_at || stream.created_at).toLocaleDateString()}
          </div>
          <Link href={`/streams/${stream.id}`}>
            <Button size="sm" variant={stream.status === "live" ? "default" : "outline"}>
              {stream.status === "live" ? "Watch Live" : "View Details"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
