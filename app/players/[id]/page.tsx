"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Users, TrendingUp, DollarSign, Calendar, Gamepad2, Medal } from "lucide-react"

interface UserProfile {
    id: string
    username: string
    avatar_url: string
    created_at: string
    total_games: number
    wins: number
    losses: number
    wallet: {
        total_winnings: number
    } | null
}

interface GameRating {
    game: string
    elo_rating: number
    wins: number
    losses: number
    total_games: number
}

export default function ProfilePage() {
    const params = useParams()
    const userId = params.id as string
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [gameRatings, setGameRatings] = useState<GameRating[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    useEffect(() => {
        async function fetchProfile() {
            if (!userId) return

            try {
                // Fetch User and Wallet
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select(`
            id, 
            username, 
            avatar_url, 
            created_at,
            total_games,
            wins,
            losses
          `)
                    .eq("id", userId)
                    .single()

                if (userError) throw userError

                const { data: walletData } = await supabase
                    .from("user_wallets")
                    .select("total_winnings")
                    .eq("user_id", userId)
                    .single()

                setProfile({
                    ...userData,
                    wallet: walletData
                })

                // Fetch Game Ratings
                const { data: ratingsData } = await supabase
                    .from("user_game_ratings")
                    .select("*")
                    .eq("user_id", userId)
                    .order("elo_rating", { ascending: false })

                setGameRatings(ratingsData || [])

            } catch (error) {
                console.error("Error fetching profile:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [userId, supabase])

    if (loading) {
        return (
            <div className="container mx-auto py-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h1 className="text-2xl font-bold">User Not Found</h1>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            {/* Profile Header */}
            <Card className="mb-8 border-none bg-gradient-to-r from-primary/10 to-transparent">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <Avatar className="h-32 w-32 border-4 border-primary/20">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-4xl">{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Joined {new Date(profile.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Trophy className="h-4 w-4" />
                                    {profile.wins} Wins
                                </div>
                                {profile.wallet && (
                                    <div className="flex items-center gap-1 text-green-500 font-medium">
                                        <DollarSign className="h-4 w-4" />
                                        ${profile.wallet.total_winnings.toLocaleString()} Earned
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Game Stats Column */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Gamepad2 className="h-6 w-6" />
                        Game Performance
                    </h2>

                    {gameRatings.length > 0 ? (
                        <div className="grid gap-4">
                            {gameRatings.map((rating) => (
                                <Card key={rating.game} className="hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                                                    <Trophy className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold">{rating.game}</h3>
                                                    <div className="text-sm text-muted-foreground">
                                                        {rating.total_games} Matches Played
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold flex items-center justify-end gap-1">
                                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                                    {rating.elo_rating}
                                                </div>
                                                <Badge variant="outline">
                                                    {Math.round((rating.wins / Math.max(rating.total_games, 1)) * 100)}% Win Rate
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                No game ratings found. User hasn't played ranked matches yet.
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Global Stats Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Medal className="h-6 w-6" />
                        Stats Overview
                    </h2>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Total Earnings</span>
                                <span className="font-bold text-green-500">${profile.wallet?.total_winnings.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Total Matches</span>
                                <span className="font-bold">{profile.total_games}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Wins</span>
                                <span className="font-bold">{profile.wins}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Losses</span>
                                <span className="font-bold">{profile.losses}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
