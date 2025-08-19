"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Play, Square, Edit, Eye, Users } from "lucide-react"
import Link from "next/link"
import { streamService } from "@/lib/services/stream-service"

export default function AdminStreamsPage() {
  const [streams, setStreams] = useState<any[]>([])
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

  const updateStreamStatus = async (id: string, status: "offline" | "live" | "ended") => {
    try {
      await streamService.updateStreamStatus(id, status)
      loadStreams()
    } catch (error) {
      console.error("Error updating stream status:", error)
    }
  }

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

  if (loading) {
    return <div className="text-center py-8">Loading streams...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stream Management</h1>
          <p className="text-muted-foreground">Manage livestreams for games and tournaments</p>
        </div>
        <Link href="/admin/streams/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Stream
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Streams</CardTitle>
            <Play className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streams.filter((s) => s.status === "live").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {streams.filter((s) => s.status === "live").reduce((sum, s) => sum + s.viewer_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ended Today</CardTitle>
            <Square className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                streams.filter(
                  (s) => s.status === "ended" && new Date(s.ended_at).toDateString() === new Date().toDateString(),
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Streams</CardTitle>
          <CardDescription>{streams.length} streams total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream Details</TableHead>
                <TableHead>Game/Tournament</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Viewers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{stream.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{stream.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{stream.game_title}</div>
                      {stream.tournament_name && (
                        <Badge variant="outline" className="text-xs">
                          {stream.tournament_name}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{stream.platform === "twitch" ? "🎮" : stream.platform === "youtube" ? "📺" : "📡"}</span>
                      <span className="capitalize">{stream.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(stream.status)}>
                      {stream.status === "live" && <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />}
                      {stream.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{stream.viewer_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {stream.status === "offline" && (
                        <Button
                          size="sm"
                          onClick={() => updateStreamStatus(stream.id, "live")}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {stream.status === "live" && (
                        <Button size="sm" variant="outline" onClick={() => updateStreamStatus(stream.id, "ended")}>
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/admin/streams/${stream.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/streams/${stream.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
