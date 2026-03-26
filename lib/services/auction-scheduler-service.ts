"use client"

import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const auctionSchedulerService = {
  async getSchedulerSettings() {
    const { data, error } = await supabase.from("auction_scheduler_settings").select("*")

    if (error) throw error

    // Convert to key-value object
    const settings: Record<string, string> = {}
    data.forEach((setting) => {
      settings[setting.setting_key] = setting.setting_value
    })

    return settings
  },

  async updateSchedulerSetting(key: string, value: string) {
    const { error } = await supabase
      .from("auction_scheduler_settings")
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() })

    if (error) throw error
  },

  async getScheduleTemplates() {
    const { data, error } = await supabase
      .from("auction_schedule_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async createScheduleTemplate(templateData: any) {
    const { data, error } = await supabase.from("auction_schedule_templates").insert(templateData).select().single()

    if (error) throw error
    return data
  },

  async updateScheduleTemplate(id: string, updates: any) {
    const { data, error } = await supabase
      .from("auction_schedule_templates")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async toggleTemplate(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("auction_schedule_templates")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
  },

  async getScheduledAuctions(limit = 50) {
    const { data, error } = await supabase
      .from("scheduled_auctions")
      .select(`
        *,
        template:auction_schedule_templates(name, game),
        auction_league:auction_leagues(name, status, participant_count:auction_league_participants(count))
      `)
      .order("scheduled_start_time", { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  },

  async createAuctionFromTemplate(templateId: string, scheduledTime: string) {
    const { data, error } = await supabase.rpc("create_auction_from_template", {
      template_id_param: templateId,
      scheduled_time: scheduledTime,
    })

    if (error) throw error
    return data
  },

  async processScheduledAuctions() {
    const { error } = await supabase.rpc("process_scheduled_auctions")
    if (error) throw error
  },

  async getSchedulerAnalytics(days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("scheduled_auctions")
      .select(`
        status,
        participant_count,
        template:auction_schedule_templates(game, name),
        created_at
      `)
      .gte("created_at", startDate.toISOString())

    if (error) throw error
    return data
  },

  async getUpcomingAuctions(hours = 24) {
    const endTime = new Date()
    endTime.setHours(endTime.getHours() + hours)

    const { data, error } = await supabase
      .from("scheduled_auctions")
      .select(`
        *,
        template:auction_schedule_templates(name, game),
        auction_league:auction_leagues(name)
      `)
      .gte("scheduled_start_time", new Date().toISOString())
      .lte("scheduled_start_time", endTime.toISOString())
      .order("scheduled_start_time", { ascending: true })

    if (error) throw error
    return data
  },
}
