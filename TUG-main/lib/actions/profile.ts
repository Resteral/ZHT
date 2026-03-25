"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"


export async function updateProfile(data: { username?: string, avatar_url?: string, steam_id?: string, epic_games_id?: string }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabase
        .from("users")
        .update({
            ...data,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

    if (error) {
        console.error("Failed to update profile", error)
        return { error: "Failed to update profile" }
    }

    revalidatePath("/settings")
    revalidatePath(`/profile/${user.id}`)
    return { success: true }
}

export async function updateSettings(settings: any) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabase
        .from("users")
        .update({
            settings: settings,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

    if (error) {
        console.error("Failed to update settings", error)
        return { error: "Failed to update settings" }
    }

    revalidatePath("/settings")
    return { success: true }
}
