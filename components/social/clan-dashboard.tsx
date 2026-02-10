"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Shield, Plus } from "lucide-react"

// Mock Data
const MOCK_CLAN = {
    id: "1",
    name: "Team Solomid",
    tag: "TSM",
    description: "North American esports organization. Bay Life.",
    level: 15,
    wins: 142,
    losses: 89,
    members: [
        { id: "1", name: "ImperialHal", role: "leader", joinedAt: "2019-01-01", avatarUrl: "/avatars/hal.jpg" },
        { id: "2", name: "Reps", role: "officer", joinedAt: "2019-01-01", avatarUrl: "/avatars/reps.jpg" },
        { id: "3", name: "Verhulst", role: "member", joinedAt: "2021-12-01", avatarUrl: "/avatars/verhulst.jpg" },
    ]
}

export function ClanDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage src="/images/teams/tsm.png" />
                        <AvatarFallback>{MOCK_CLAN.tag}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            [{MOCK_CLAN.tag}] {MOCK_CLAN.name}
                            <Badge variant="outline" className="ml-2">Lvl {MOCK_CLAN.level}</Badge>
                        </h2>
                        <p className="text-muted-foreground">{MOCK_CLAN.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Shield className="mr-2 h-4 w-4" />
                        Manage Clan
                    </Button>
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Member
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Wins</CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_CLAN.wins}</div>
                        <p className="text-xs text-muted-foreground">Win Rate: {((MOCK_CLAN.wins / (MOCK_CLAN.wins + MOCK_CLAN.losses)) * 100).toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Members</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_CLAN.members.length}/50</div>
                        <p className="text-xs text-muted-foreground">Active: {MOCK_CLAN.members.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clan Elo</CardTitle>
                        <Shield className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1850</div>
                        <p className="text-xs text-muted-foreground">Rank: Diamond</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="members" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="matches">Match History</TabsTrigger>
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                </TabsList>
                <TabsContent value="members" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clan Roster</CardTitle>
                            <CardDescription>Manage your clan members and roles.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {MOCK_CLAN.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.avatarUrl} />
                                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">Joined {member.joinedAt}</p>
                                            </div>
                                        </div>
                                        <Badge variant={member.role === 'leader' ? 'default' : member.role === 'officer' ? 'secondary' : 'outline'}>
                                            {member.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="matches">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Matches</CardTitle>
                            <CardDescription>View your clan's recent performance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                No recent matches found.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
