"use client"

import { UpcomingContests } from "@/components/contests/upcoming-contests"
import { LiveContests } from "@/components/contests/live-contests"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Calendar } from "lucide-react"

export default function MatchesPage() {
    return (
        <div className="min-h-screen bg-background pt-20 pb-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6">All Contests</h1>

                <Tabs defaultValue="upcoming" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Upcoming</span>
                        </TabsTrigger>
                        <TabsTrigger value="live" className="flex items-center space-x-2">
                            <Zap className="h-4 w-4" />
                            <span>Live Now</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                        <UpcomingContests />
                    </TabsContent>

                    <TabsContent value="live">
                        <LiveContests />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
