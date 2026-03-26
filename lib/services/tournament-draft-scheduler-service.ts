import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export interface DraftSchedule {
  id: string
  tournament_id: string
  draft_type: "auction" | "snake" | "linear"
  scheduled_date: string
  duration_minutes: number
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  settings: {
    max_teams: number
    players_per_team: number
    auction_budget?: number
    pick_time_limit: number
    auto_start: boolean
    notification_settings: {
      notify_24h: boolean
      notify_1h: boolean
      notify_15m: boolean
    }
  }
  created_at: string
  updated_at: string
}

export interface ScheduleTemplate {
  id: string
  name: string
  tournament_type: string
  draft_type: "auction" | "snake" | "linear"
  schedule_type: "one_time" | "recurring"
  frequency?: "daily" | "weekly" | "monthly"
  day_of_week?: number
  time_of_day: string
  duration_minutes: number
  max_teams: number
  players_per_team: number
  entry_fee: number
  prize_pool: number
  settings: Record<string, any>
  is_active: boolean
  created_at: string
}

export const tournamentDraftSchedulerService = {
  async createDraftSchedule(tournamentId: string, scheduleData: Partial<DraftSchedule>): Promise<DraftSchedule> {
    try {
      const { data, error } = await supabase
        .from("draft_schedules")
        .insert({
          tournament_id: tournamentId,
          draft_type: scheduleData.draft_type || "snake",
          scheduled_date: scheduleData.scheduled_date,
          duration_minutes: scheduleData.duration_minutes || 120,
          status: "scheduled",
          settings: JSON.stringify(scheduleData.settings || {}),
        })
        .select()
        .single()

      if (error) throw error

      // Schedule notifications
      await this.scheduleNotifications(
        data.id,
        scheduleData.scheduled_date!,
        scheduleData.settings?.notification_settings,
      )

      return {
        ...data,
        settings: typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings,
      }
    } catch (error) {
      console.error("Error creating draft schedule:", error)
      throw error
    }
  },

  async updateDraftSchedule(scheduleId: string, updates: Partial<DraftSchedule>): Promise<DraftSchedule> {
    try {
      const { data, error } = await supabase
        .from("draft_schedules")
        .update({
          ...updates,
          settings: updates.settings ? JSON.stringify(updates.settings) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)
        .select()
        .single()

      if (error) throw error

      return {
        ...data,
        settings: typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings,
      }
    } catch (error) {
      console.error("Error updating draft schedule:", error)
      throw error
    }
  },

  async getDraftSchedule(scheduleId: string): Promise<DraftSchedule | null> {
    try {
      const { data, error } = await supabase.from("draft_schedules").select("*").eq("id", scheduleId).single()

      if (error) return null

      return {
        ...data,
        settings: typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings,
      }
    } catch (error) {
      console.error("Error getting draft schedule:", error)
      return null
    }
  },

  async getTournamentDraftSchedules(tournamentId: string): Promise<DraftSchedule[]> {
    try {
      const { data, error } = await supabase
        .from("draft_schedules")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("scheduled_date", { ascending: true })

      if (error) throw error

      return data.map((schedule) => ({
        ...schedule,
        settings: typeof schedule.settings === "string" ? JSON.parse(schedule.settings) : schedule.settings,
      }))
    } catch (error) {
      console.error("Error getting tournament draft schedules:", error)
      return []
    }
  },

  async getUpcomingDrafts(hours = 24): Promise<DraftSchedule[]> {
    try {
      const now = new Date()
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000)

      const { data, error } = await supabase
        .from("draft_schedules")
        .select(`
          *,
          tournament:tournaments(name, created_by)
        `)
        .eq("status", "scheduled")
        .gte("scheduled_date", now.toISOString())
        .lte("scheduled_date", endTime.toISOString())
        .order("scheduled_date", { ascending: true })

      if (error) throw error

      return data.map((schedule) => ({
        ...schedule,
        settings: typeof schedule.settings === "string" ? JSON.parse(schedule.settings) : schedule.settings,
      }))
    } catch (error) {
      console.error("Error getting upcoming drafts:", error)
      return []
    }
  },

  async cancelDraftSchedule(scheduleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("draft_schedules")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)

      if (error) throw error

      // Cancel notifications
      await this.cancelNotifications(scheduleId)
    } catch (error) {
      console.error("Error cancelling draft schedule:", error)
      throw error
    }
  },

  async startScheduledDraft(scheduleId: string): Promise<void> {
    try {
      const schedule = await this.getDraftSchedule(scheduleId)
      if (!schedule || schedule.status !== "scheduled") {
        throw new Error("Invalid schedule or draft already started")
      }

      // Update schedule status
      await supabase
        .from("draft_schedules")
        .update({
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)

      // Initialize and start the draft
      const { tournamentDraftService } = await import("./tournament-draft-service")
      await tournamentDraftService.initializeDraft(schedule.tournament_id)

      // Auto-start if enabled
      if (schedule.settings.auto_start) {
        const { data: tournament } = await supabase
          .from("tournaments")
          .select("created_by")
          .eq("id", schedule.tournament_id)
          .single()

        if (tournament) {
          await tournamentDraftService.startDraft(schedule.tournament_id, tournament.created_by)
        }
      }

      // Send start notifications
      await this.sendDraftStartNotifications(schedule.tournament_id)
    } catch (error) {
      console.error("Error starting scheduled draft:", error)
      throw error
    }
  },

  async scheduleNotifications(scheduleId: string, scheduledDate: string, notificationSettings?: any): Promise<void> {
    try {
      const draftDate = new Date(scheduledDate)
      const notifications = []

      if (notificationSettings?.notify_24h) {
        notifications.push({
          schedule_id: scheduleId,
          notification_type: "24_hour_reminder",
          scheduled_for: new Date(draftDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          status: "scheduled",
        })
      }

      if (notificationSettings?.notify_1h) {
        notifications.push({
          schedule_id: scheduleId,
          notification_type: "1_hour_reminder",
          scheduled_for: new Date(draftDate.getTime() - 60 * 60 * 1000).toISOString(),
          status: "scheduled",
        })
      }

      if (notificationSettings?.notify_15m) {
        notifications.push({
          schedule_id: scheduleId,
          notification_type: "15_minute_reminder",
          scheduled_for: new Date(draftDate.getTime() - 15 * 60 * 1000).toISOString(),
          status: "scheduled",
        })
      }

      if (notifications.length > 0) {
        await supabase.from("draft_notifications").insert(notifications)
      }
    } catch (error) {
      console.error("Error scheduling notifications:", error)
    }
  },

  async cancelNotifications(scheduleId: string): Promise<void> {
    try {
      await supabase
        .from("draft_notifications")
        .update({ status: "cancelled" })
        .eq("schedule_id", scheduleId)
        .eq("status", "scheduled")
    } catch (error) {
      console.error("Error cancelling notifications:", error)
    }
  },

  async sendDraftStartNotifications(tournamentId: string): Promise<void> {
    try {
      // Get all tournament participants
      const { data: participants } = await supabase
        .from("tournament_player_pool")
        .select("user_id, users(username)")
        .eq("tournament_id", tournamentId)

      const { data: captains } = await supabase
        .from("tournament_teams")
        .select("team_captain, users(username)")
        .eq("tournament_id", tournamentId)

      const { data: tournament } = await supabase.from("tournaments").select("name").eq("id", tournamentId).single()

      const allUsers = [
        ...(participants || []).map((p) => ({ user_id: p.user_id, username: p.users?.username })),
        ...(captains || []).map((c) => ({ user_id: c.team_captain, username: c.users?.username })),
      ]

      // Remove duplicates
      const uniqueUsers = allUsers.filter(
        (user, index, self) => index === self.findIndex((u) => u.user_id === user.user_id),
      )

      // Send notifications
      const notifications = uniqueUsers.map((user) => ({
        user_id: user.user_id,
        title: "Draft Starting Now!",
        message: `The draft for ${tournament?.name} is starting now. Join the draft room to participate.`,
        type: "draft",
        data: { tournament_id: tournamentId },
      }))

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications)
      }
    } catch (error) {
      console.error("Error sending draft start notifications:", error)
    }
  },

  async processScheduledDrafts(): Promise<void> {
    try {
      const now = new Date()
      const { data: dueDrafts } = await supabase
        .from("draft_schedules")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_date", now.toISOString())

      for (const draft of dueDrafts || []) {
        try {
          await this.startScheduledDraft(draft.id)
        } catch (error) {
          console.error(`Error starting draft ${draft.id}:`, error)
        }
      }
    } catch (error) {
      console.error("Error processing scheduled drafts:", error)
    }
  },

  async processPendingNotifications(): Promise<void> {
    try {
      const now = new Date()
      const { data: dueNotifications } = await supabase
        .from("draft_notifications")
        .select(`
          *,
          draft_schedule:draft_schedules(
            tournament_id,
            tournament:tournaments(name)
          )
        `)
        .eq("status", "scheduled")
        .lte("scheduled_for", now.toISOString())

      for (const notification of dueNotifications || []) {
        try {
          await this.sendScheduledNotification(notification)

          // Mark as sent
          await supabase
            .from("draft_notifications")
            .update({ status: "sent", sent_at: now.toISOString() })
            .eq("id", notification.id)
        } catch (error) {
          console.error(`Error sending notification ${notification.id}:`, error)
        }
      }
    } catch (error) {
      console.error("Error processing pending notifications:", error)
    }
  },

  async sendScheduledNotification(notification: any): Promise<void> {
    try {
      const tournamentId = notification.draft_schedule.tournament_id
      const tournamentName = notification.draft_schedule.tournament.name

      // Get participants to notify
      const { data: participants } = await supabase
        .from("tournament_player_pool")
        .select("user_id")
        .eq("tournament_id", tournamentId)

      const { data: captains } = await supabase
        .from("tournament_teams")
        .select("team_captain")
        .eq("tournament_id", tournamentId)

      const allUserIds = [...(participants || []).map((p) => p.user_id), ...(captains || []).map((c) => c.team_captain)]

      const uniqueUserIds = [...new Set(allUserIds)]

      const getNotificationMessage = (type: string) => {
        switch (type) {
          case "24_hour_reminder":
            return `Draft for ${tournamentName} starts in 24 hours. Make sure you're ready!`
          case "1_hour_reminder":
            return `Draft for ${tournamentName} starts in 1 hour. Join the draft room soon.`
          case "15_minute_reminder":
            return `Draft for ${tournamentName} starts in 15 minutes! Join now.`
          default:
            return `Draft reminder for ${tournamentName}`
        }
      }

      const notifications = uniqueUserIds.map((userId) => ({
        user_id: userId,
        title: "Draft Reminder",
        message: getNotificationMessage(notification.notification_type),
        type: "draft",
        data: { tournament_id: tournamentId },
      }))

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications)
      }
    } catch (error) {
      console.error("Error sending scheduled notification:", error)
    }
  },

  // Template management
  async createScheduleTemplate(templateData: Partial<ScheduleTemplate>): Promise<ScheduleTemplate> {
    try {
      const { data, error } = await supabase
        .from("tournament_schedule_templates")
        .insert({
          ...templateData,
          settings: JSON.stringify(templateData.settings || {}),
        })
        .select()
        .single()

      if (error) throw error

      return {
        ...data,
        settings: typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings,
      }
    } catch (error) {
      console.error("Error creating schedule template:", error)
      throw error
    }
  },

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    try {
      const { data, error } = await supabase
        .from("tournament_schedule_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      return data.map((template) => ({
        ...template,
        settings: typeof template.settings === "string" ? JSON.parse(template.settings) : template.settings,
      }))
    } catch (error) {
      console.error("Error getting schedule templates:", error)
      return []
    }
  },

  async toggleTemplate(templateId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("tournament_schedule_templates")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)

      if (error) throw error
    } catch (error) {
      console.error("Error toggling template:", error)
      throw error
    }
  },
}
