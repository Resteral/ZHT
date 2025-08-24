"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Eye, MessageSquare, Edit, Trash2, Pin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Announcement {
  id: string
  title: string
  content: string
  author: { name: string; avatar?: string }
  published_at: string
  status: string
  priority: string
  views: number
  comments: number
  pinned: boolean
}

export function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(`
          id,
          title,
          content,
          created_at,
          status,
          priority,
          view_count,
          is_pinned,
          users!announcements_author_id_fkey (
            username,
            display_name
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedAnnouncements =
        data?.map((announcement) => ({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          author: {
            name: announcement.users?.username || "Unknown",
            avatar: undefined,
          },
          published_at: announcement.created_at,
          status: announcement.status,
          priority: announcement.priority,
          views: announcement.view_count || 0,
          comments: 0,
          pinned: announcement.is_pinned || false,
        })) || []

      setAnnouncements(formattedAnnouncements)
    } catch (error) {
      console.error("Error loading announcements:", error)
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      default:
        return "bg-green-500"
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default"
      case "draft":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">No Announcements</h3>
        <p className="text-muted-foreground">No announcements have been posted yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {announcement.pinned && <Pin className="h-4 w-4 text-primary" />}
              <h3 className="font-semibold text-sm">{announcement.title}</h3>
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(announcement.priority)}`} />
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusVariant(announcement.status)}>
                {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
              </Badge>
              <Button size="sm" variant="ghost">
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={announcement.author.avatar || "/placeholder.svg"} alt={announcement.author.name} />
                <AvatarFallback>{announcement.author.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{announcement.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(announcement.published_at).toLocaleDateString()}
              </span>
            </div>

            {announcement.status === "published" && (
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{announcement.views}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{announcement.comments}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
