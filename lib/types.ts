export interface ClanMember {
    id: string
    name: string
    role: "leader" | "officer" | "member"
    joinedAt: string
    avatarUrl?: string
}

export interface Clan {
    id: string
    name: string
    tag: string
    description: string
    level: number
    members: ClanMember[]
    wins: number
    losses: number
    avatarUrl?: string
    bannerUrl?: string
}

export interface Friend {
    id: string
    name: string
    status: "online" | "offline" | "in-game"
    avatarUrl?: string
}

export interface Message {
    id: string
    senderId: string
    receiverId: string
    content: string
    timestamp: string
    read: boolean
}
