import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const streamService = {
  async getStreams() {
    const { data, error } = await supabase
      .from("livestreams")
      .select(`
        *,
        games(title),
        tournaments(name)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((stream) => ({
      ...stream,
      game_title: stream.games?.title || "Unknown Game",
      tournament_name: stream.tournaments?.name,
    }))
  },

  async getStream(id: string) {
    const { data, error } = await supabase
      .from("livestreams")
      .select(`
        *,
        games(name, game, match_type),
        tournaments(name)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return {
      ...data,
      game_title: data.games?.name || "Unknown Game",
      tournament_name: data.tournaments?.name,
    }
  },

  async createStream(streamData: {
    game_id?: string
    tournament_id?: string
    title: string
    description: string
    stream_url: string
    platform: string
    chat_enabled?: boolean
  }) {
    const { data, error } = await supabase.from("livestreams").insert([streamData]).select().single()

    if (error) throw error
    return data
  },

  async updateStreamStatus(id: string, status: "offline" | "live" | "ended") {
    const updates: any = { status }

    if (status === "live") {
      updates.started_at = new Date().toISOString()
    } else if (status === "ended") {
      updates.ended_at = new Date().toISOString()
    }

    const { data, error } = await supabase.from("livestreams").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async sendChatMessage(streamId: string, message: string) {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("stream_chat")
      .insert([
        {
          stream_id: streamId,
          user_id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "Anonymous",
          message,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getChatMessages(streamId: string, limit = 50) {
    const { data, error } = await supabase
      .from("stream_chat")
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data.reverse() // Show oldest first
  },

  async joinStream(streamId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("stream_viewers").upsert([
      {
        stream_id: streamId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
    ])

    if (error) console.error("Error joining stream:", error)
  },

  async leaveStream(streamId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("stream_viewers")
      .update({ left_at: new Date().toISOString() })
      .eq("stream_id", streamId)
      .eq("user_id", user.id)

    if (error) console.error("Error leaving stream:", error)
  },
}
