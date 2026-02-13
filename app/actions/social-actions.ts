"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendFriendRequest(targetUsername: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("You must be logged in to send friend requests")
    }

    // 1. Find target user by username
    const { data: targetUser, error: targetError } = await supabase
        .from("users")
        .select("id")
        .eq("username", targetUsername)
        .single()

    if (targetError || !targetUser) {
        throw new Error("User not found")
    }

    if (targetUser.id === user.id) {
        throw new Error("You cannot add yourself as a friend")
    }

    // 2. Check if friendship already exists
    const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id_1.eq.${user.id},user_id_1.eq.${targetUser.id}`)
        .or(`user_id_2.eq.${user.id},user_id_2.eq.${targetUser.id}`)
        .single()

    if (existingFriendship) {
        if (existingFriendship.status === "pending") {
            throw new Error("Friend request already pending")
        }
        if (existingFriendship.status === "accepted") {
            throw new Error("You are already friends with this user")
        }
        if (existingFriendship.status === "blocked") {
            throw new Error("Unable to send friend request")
        }
    }

    // 3. Create friend request
    // We align ids so user_id_1 < user_id_2 to enforce uniqueness if we wanted, 
    // but for requests, usually initiator is user_id_1. 
    // Let's stick to initiator = user_id_1 for simple request logic.

    const { error: insertError } = await supabase.from("friendships").insert({
        user_id_1: user.id,
        user_id_2: targetUser.id,
        status: "pending",
    })

    if (insertError) {
        throw new Error("Failed to send friend request")
    }

    revalidatePath("/clan")
    return { success: true }
}

export async function acceptFriendRequest(requestId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Verify the request is for this user
    const { data: request, error: fetchError } = await supabase
        .from("friendships")
        .select("*")
        .eq("id", requestId)
        .single()

    if (fetchError || !request) throw new Error("Request not found")

    if (request.user_id_2 !== user.id) {
        throw new Error("You can only accept requests sent to you")
    }

    const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId)

    if (error) throw new Error("Failed to accept request")

    revalidatePath("/clan")
    return { success: true }
}

export async function rejectFriendRequest(requestId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Verify request target
    const { data: request } = await supabase.from("friendships").select("*").eq("id", requestId).single()
    if (!request || request.user_id_2 !== user.id) throw new Error("Unauthorized")

    const { error } = await supabase.from("friendships").delete().eq("id", requestId)

    if (error) throw new Error("Failed to reject request")

    revalidatePath("/clan")
    return { success: true }
}

export async function removeFriend(friendshipId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId)
        // Ensure user is part of the friendship
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)

    if (error) throw new Error("Failed to remove friend")

    revalidatePath("/clan")
    return { success: true }
}

export async function getFriends(userId: string) {
    const supabase = await createClient()

    // Get accepted friendships where user is either id_1 or id_2
    const { data, error } = await supabase
        .from("friendships")
        .select(`
            id,
            user_id_1,
            user_id_2,
            status,
            user1:users!friendships_user_id_1_fkey(id, username, avatar_url, status),
            user2:users!friendships_user_id_2_fkey(id, username, avatar_url, status)
        `)
        .eq("status", "accepted")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)

    if (error) {
        console.error("Error fetching friends:", error)
        return []
    }

    // Map to a cleaner Friend object
    return data.map((f: any) => {
        const isUser1 = f.user_id_1 === userId
        const friendUser = isUser1 ? f.user2 : f.user1
        return {
            id: f.id, // friendship id
            friendId: friendUser.id,
            name: friendUser.username,
            avatarUrl: friendUser.avatar_url,
            status: friendUser.status || "offline", // Assuming 'status' is on users table or we mock it
            game: null // We'd need a separate presence system for 'Game'
        }
    })
}

export async function getPendingRequests(userId: string) {
    const supabase = await createClient()

    // Requests sent TO the user (user_id_2)
    const { data, error } = await supabase
        .from("friendships")
        .select(`
            id,
            created_at,
            sender:users!friendships_user_id_1_fkey(id, username, avatar_url)
        `)
        .eq("user_id_2", userId)
        .eq("status", "pending")

    if (error) {
        console.error("Error fetching requests:", error)
        return []
    }

    return data.map((r: any) => ({
        id: r.id,
        senderId: r.sender.id,
        senderName: r.sender.username,
        senderAvatar: r.sender.avatar_url,
        sentAt: r.created_at
    }))
}
