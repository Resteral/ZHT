"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { Bell, Trophy, Target, Users } from "lucide-react"

const supabase = createClient()

export function NotificationSystem({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return

    // Subscribe to user-specific notifications
    const channel = supabase
      .channel(`user_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new
          setNotifications((prev) => [notification, ...prev])

          // Show toast notification
          const getIcon = (type: string) => {
            switch (type) {
              case "tournament":
                return <Trophy className="h-4 w-4" />
              case "betting":
                return <Target className="h-4 w-4" />
              case "draft":
                return <Users className="h-4 w-4" />
              default:
                return <Bell className="h-4 w-4" />
            }
          }

          toast({
            title: notification.title,
            description: notification.message,
            action: getIcon(notification.type),
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return null // This component only handles notifications, no UI
}
