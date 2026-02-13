"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Check, X } from "lucide-react"
import { AddFriendDialog } from "./add-friend-dialog"
import { acceptFriendRequest, rejectFriendRequest, removeFriend } from "@/app/actions/social-actions"
import { toast } from "sonner"
import { useState } from "react"

interface Friend {
    id: string
    friendId: string
    name: string
    avatarUrl?: string
    status: string
    game?: string | null
}

interface PendingRequest {
    id: string
    senderId: string
    senderName: string
    senderAvatar?: string
    sentAt: string
}

interface FriendsListClientProps {
    initialFriends: Friend[]
    initialRequests: PendingRequest[]
}

export function FriendsListClient({ initialFriends, initialRequests }: FriendsListClientProps) {
    const [friends, setFriends] = useState(initialFriends)
    const [requests, setRequests] = useState(initialRequests)

    const handleAccept = async (requestId: string) => {
        try {
            await acceptFriendRequest(requestId)
            toast.success("Friend request accepted")
            // Optimistic update would require knowing the user details, but server revalidatePath handles it mostly on refresh
            // For instant feedback without refresh, we'd need the full user object, or just wait for revalidation.
            // Simply removing from requests list for now.
            setRequests((prev) => prev.filter((r) => r.id !== requestId))
        } catch (error: any) {
            toast.error(error.message || "Failed to accept request")
        }
    }

    const handleReject = async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId)
            toast.success("Friend request rejected")
            setRequests((prev) => prev.filter((r) => r.id !== requestId))
        } catch (error: any) {
            toast.error(error.message || "Failed to reject request")
        }
    }

    const handleRemove = async (friendshipId: string) => {
        if (!confirm("Are you sure you want to remove this friend?")) return

        try {
            await removeFriend(friendshipId)
            toast.success("Friend removed")
            setFriends((prev) => prev.filter((f) => f.id !== friendshipId))
        } catch (error: any) {
            toast.error(error.message || "Failed to remove friend")
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Friends ({friends.length})</CardTitle>
                <AddFriendDialog />
            </CardHeader>
            <CardContent className="space-y-6 pt-4 flex-1 overflow-y-auto">

                {/* Pending Requests Section */}
                {requests.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Requests ({requests.length})
                        </h4>
                        <div className="space-y-2">
                            {requests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={request.senderAvatar} />
                                            <AvatarFallback>{request.senderName[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm font-medium">{request.senderName}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-100" onClick={() => handleAccept(request.id)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100" onClick={() => handleReject(request.id)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Friends List */}
                <div className="space-y-4">
                    {friends.length === 0 && requests.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No friends yet. Add someone!
                        </div>
                    )}

                    {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={friend.avatarUrl} />
                                        <AvatarFallback>{friend.name[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div
                                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${friend.status === "online"
                                                ? "bg-green-500"
                                                : friend.status === "in-game"
                                                    ? "bg-blue-500"
                                                    : "bg-gray-500"
                                            }`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{friend.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {friend.status === "in-game"
                                            ? `Playing ${friend.game}`
                                            : friend.status === "online"
                                                ? "Online"
                                                : "Offline"}
                                    </p>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleRemove(friend.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
