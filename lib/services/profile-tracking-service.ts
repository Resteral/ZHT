import { createClient } from "@/lib/supabase/client"

export interface ProfileView {
  id: string
  viewer_id?: string
  viewed_profile_id: string
  viewed_at: string
  page_source: string
  view_duration?: number
}

export interface ProfileInteraction {
  id: string
  user_id: string
  target_user_id: string
  interaction_type: "view" | "follow" | "challenge" | "message"
  metadata: Record<string, any>
  created_at: string
}

export async function trackProfileView(
  viewedProfileId: string,
  pageSource: string,
  viewDuration?: number,
): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from("profile_views").insert({
      viewer_id: user?.id,
      viewed_profile_id: viewedProfileId,
      page_source: pageSource,
      view_duration: viewDuration,
    })
  } catch (error) {
    console.error("Error tracking profile view:", error)
  }
}

export async function trackProfileInteraction(
  targetUserId: string,
  interactionType: "view" | "follow" | "challenge" | "message",
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("profile_interactions").insert({
      user_id: user.id,
      target_user_id: targetUserId,
      interaction_type: interactionType,
      metadata,
    })
  } catch (error) {
    console.error("Error tracking profile interaction:", error)
  }
}

export async function getProfileViews(profileId: string): Promise<ProfileView[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("profile_views")
      .select("*")
      .eq("viewed_profile_id", profileId)
      .order("viewed_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching profile views:", error)
    return []
  }
}

export async function getProfileAnalytics(profileId: string) {
  try {
    const supabase = createClient()

    // Get view counts by page source
    const { data: viewsBySource } = await supabase
      .from("profile_views")
      .select("page_source")
      .eq("viewed_profile_id", profileId)

    // Get recent interactions
    const { data: interactions } = await supabase
      .from("profile_interactions")
      .select("*")
      .eq("target_user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20)

    // Calculate analytics
    const totalViews = viewsBySource?.length || 0
    const sourceBreakdown =
      viewsBySource?.reduce(
        (acc, view) => {
          acc[view.page_source] = (acc[view.page_source] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return {
      totalViews,
      sourceBreakdown,
      recentInteractions: interactions || [],
    }
  } catch (error) {
    console.error("Error fetching profile analytics:", error)
    return {
      totalViews: 0,
      sourceBreakdown: {},
      recentInteractions: [],
    }
  }
}
