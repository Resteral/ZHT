"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, MessageSquare, UserPlus } from "lucide-react"

// Mock Data
const MOCK_FRIENDS = [
    { id: "1", name: "ImperialHal", status: "online", avatarUrl: "/avatars/hal.jpg", game: "Apex Legends" },
    { id: "2", name: "Shroud", status: "offline", avatarUrl: "/avatars/shroud.jpg", lastSeen: "2h ago" },
    { id: "3", name: "Tarik", status: "in-game", avatarUrl: "/avatars/tarik.jpg", game: "Valorant" },
    { id: "4", name: "iiTzTimmy", status: "online", avatarUrl: "/avatars/timmy.jpg", game: "Menu" },
]

export function FriendsList() {
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Friends</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {MOCK_FRIENDS.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={friend.avatarUrl} />
                                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${friend.status === 'online' ? 'bg-green-500' :
                                        friend.status === 'in-game' ? 'bg-blue-500' :
                                            'bg-gray-500'
                                    }`} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">{friend.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {friend.status === 'in-game' ? `Playing ${friend.game}` :
                                        friend.status === 'online' ? 'Online' :
                                            friend.lastSeen}
                                </p>
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
