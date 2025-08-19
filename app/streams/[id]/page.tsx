"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Users, Eye, Send, MessageCircle, Play } from "lucide-react"
import Link from "next/link"
import { streamService } from "@/lib/services/stream-service"
import { useRealtimeStream } from "@/lib/hooks/use-realtime"

interface StreamPageProps {
  params: { id: string }
}

export default function StreamPage({ params }: StreamPageProps) {
  const [stream, setStream] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessage, setChatMessage] = useState("")
  const { chatMessages, viewerCount } = useRealtimeStream(params.id)

  useEffect(() => {
    loadStream()
  }, [params.id])

  const loadStream = async () => {
    try {
      const data = await streamService.getStream(params.id)
      setStream(data)
    } catch (error) {
      console.error("Error loading stream:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return

    try {
      await streamService.sendChatMessage(params.id, chatMessage)
      setChatMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const getEmbedUrl = (streamUrl: string, platform: string) => {
    if (platform === "twitch") {
      const channelName = streamUrl.split("/").pop()
      return `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}`
    } else if (platform === "youtube") {
      const videoId = streamUrl.split("v=")[1]?.split("&")[0]
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`
    }
    return streamUrl
  }

  if (loading) {
    return <div className="text-center py-8">Loading stream...</div>
  }

  if (!stream) {
    return <div className="text-center py-8">Stream not found</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/streams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Streams
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{stream.title}</h1>
          <p className="text-muted-foreground">{stream.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {stream.status === "live" && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <Badge variant="destructive">LIVE</Badge>
              <div className="flex items-center gap-1 text-sm">
                <Eye className="h-4 w-4" />
                <span>{viewerCount || stream.viewer_count}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {stream.status === "live" ? (
                  <iframe
                    src={getEmbedUrl(stream.stream_url, stream.platform)}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Stream is {stream.status}</p>
                      {stream.status === "offline" && (
                        <p className="text-sm opacity-75 mt-2">Check back later for the live stream</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stream Info */}
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{stream.game_title}</CardTitle>
                  {stream.tournament_name && <CardDescription>Tournament: {stream.tournament_name}</CardDescription>}
                </div>
                <Badge variant="outline">
                  {stream.platform === "twitch" ? "🎮" : stream.platform === "youtube" ? "📺" : "📡"} {stream.platform}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stream.status === "live" ? "Started" : "Created"} on{" "}
                {new Date(stream.started_at || stream.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Chat
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{viewerCount || stream.viewer_count}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {stream.status === "live"
                        ? "No messages yet. Be the first to chat!"
                        : "Chat will be available when stream is live"}
                    </p>
                  ) : (
                    chatMessages.map((message: any, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-primary">{message.username}:</span>
                        <span className="ml-2">{message.message}</span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              {stream.status === "live" && stream.chat_enabled && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={sendChatMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
