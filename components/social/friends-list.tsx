import { createClient } from "@/lib/supabase/server"
import { getFriends, getPendingRequests } from "@/app/actions/social-actions"
import { FriendsListClient } from "./friends-list-client"

export async function FriendsList() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    const [friends, requests] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id)
    ])

    return <FriendsListClient initialFriends={friends} initialRequests={requests} />
}
