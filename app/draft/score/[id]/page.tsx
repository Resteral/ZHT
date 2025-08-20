"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Trophy, Flag, Star, CheckCircle, Clock, BarChart3, Edit, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { MatchStatsViewer } from "@/components/analytics/match-stats-viewer"
import { loadMatchResult as loadMatchResultUtil } from "@/lib/supabase/match-result"
import type { Match } from "@/lib/types/match" // Import Match type

interface ScoreScreenPageProps {
  params: {
    id: string
  }
}

interface Participant {
  id: string
  user_id: string
  username: string
  elo_rating: number
}

interface ScoreSubmission {
  id: string
  submitter_id: string
  team1_score: number
  team2_score: number
  csv_code: string
  submitted_at: string
  is_validated: boolean
  submitter_username: string
}

interface MatchResult {
  team1_score: number
  team2_score: number
  winning_team: number | null
  csv_code: string
  total_submissions: number
}

export default function ScoreScreenPage({ params }: ScoreScreenPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [matchData, setMatchData] = useState<Match | null>(null) // Use Match type here
  const [participants, setParticipants] = useState<Participant[]>([])
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [csvCode, setCsvCode] = useState("")
  const [selectedMvp, setSelectedMvp] = useState("")
  const [flaggedPlayer, setFlaggedPlayer] = useState("")
  const [flagType, setFlagType] = useState("")
  const [flagDescription, setFlagDescription] = useState("")
  const [submissions, setSubmissions] = useState<ScoreSubmission[]>([])
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRescoring, setIsRescoring] = useState(false)
  const [userSubmission, setUserSubmission] = useState<ScoreSubmission | null>(null)
  const [consensusGroups, setConsensusGroups] = useState<{ [key: string]: ScoreSubmission[] }>({})
  const [team1Players, setTeam1Players] = useState<Participant[]>([])
  const [team2Players, setTeam2Players] = useState<Participant[]>([])

  useEffect(() => {
    loadMatchData()
    setupRealTimeSubscriptions()
  }, [params.id])

  const setupRealTimeSubscriptions = () => {
    const supabase = createClient()

    const submissionsSubscription = supabase
      .channel(`score-submissions-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "score_submissions",
          filter: `match_id=eq.${params.id}`,
        },
        () => {
          loadScoreSubmissions()
        },
      )
      .subscribe()

    const resultsSubscription = supabase
      .channel(`match-results-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `match_id=eq.${params.id}`,
        },
        () => {
          loadMatchResult()
        },
      )
      .subscribe()

    return () => {
      submissionsSubscription.unsubscribe()
      resultsSubscription.unsubscribe()
    }
  }

  const loadMatchData = async () => {
    const supabase = createClient()

    try {
      console.log("[v0] Loading match data for:", params.id)

      const { data: eloMatches, error: eloError } = await supabase
        .from("matches")
        .select(`
          *,
          match_participants(
            users(id, username, elo_rating)
          )
        `)
        .eq("id", params.id)

      if (eloError) {
        console.error("[v0] Error loading ELO matches:", eloError)
        throw new Error("Failed to load match data")
      }

      const match = eloMatches?.[0]
      if (!match) {
        throw new Error("Match not found")
      }

      console.log("[v0] Match loaded:", match)
      console.log("[v0] Match participants:", match.match_participants)

      let participantsWithElo = []

      if (match.match_participants && Array.isArray(match.match_participants)) {
        participantsWithElo = match.match_participants
          .filter((p: any) => p.users) // Only include participants with user data
          .map((p: any, index: number) => ({
            id: `participant_${index}`, // Generate a participant ID
            user_id: p.users.id,
            username: p.users.username,
            elo_rating: p.users.elo_rating || 1000,
            team_assignment: null, // Will be assigned below
          }))
      }

      console.log("[v0] Processed participants:", participantsWithElo)

      if (participantsWithElo.length === 0) {
        throw new Error("No participants found for this match")
      }

      const team1 = []
      const team2 = []

      try {
        if (match.description) {
          const draftState = JSON.parse(match.description)
          if (draftState.draft_state) {
            const { team1_captain, team1_players, team2_captain, team2_players } = draftState.draft_state

            // Assign team 1 players
            if (team1_captain) {
              const captain = participantsWithElo.find((p) => p.user_id === team1_captain)
              if (captain) {
                captain.team_assignment = 1
                team1.push(captain)
              }
            }

            if (team1_players && Array.isArray(team1_players)) {
              team1_players.forEach((playerId) => {
                const player = participantsWithElo.find((p) => p.user_id === playerId && p.user_id !== team1_captain)
                if (player) {
                  player.team_assignment = 1
                  team1.push(player)
                }
              })
            }

            // Assign team 2 players
            if (team2_captain) {
              const captain = participantsWithElo.find((p) => p.user_id === team2_captain)
              if (captain) {
                captain.team_assignment = 2
                team2.push(captain)
              }
            }

            if (team2_players && Array.isArray(team2_players)) {
              team2_players.forEach((playerId) => {
                const player = participantsWithElo.find((p) => p.user_id === playerId && p.user_id !== team2_captain)
                if (player) {
                  player.team_assignment = 2
                  team2.push(player)
                }
              })
            }
          }
        }
      } catch (parseError) {
        console.log("[v0] Could not parse draft state, using alternating assignment")
      }

      // If no team assignments from draft state, split alternately
      if (team1.length === 0 && team2.length === 0) {
        participantsWithElo.forEach((p: any, index: number) => {
          if (index % 2 === 0) {
            p.team_assignment = 1
            team1.push(p)
          } else {
            p.team_assignment = 2
            team2.push(p)
          }
        })
      }

      console.log("[v0] Team 1:", team1)
      console.log("[v0] Team 2:", team2)

      setMatchData(match)
      setParticipants(participantsWithElo)
      setTeam1Players(team1)
      setTeam2Players(team2)

      await Promise.all([loadScoreSubmissions(), loadMatchResult()])
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading match data:", error)
      toast.error("Failed to load match data")
      setLoading(false)
    }
  }

  const loadScoreSubmissions = async () => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("score_submissions")
        .select(`
          *,
          users!inner(username)
        `)
        .eq("match_id", params.id)
        .order("submitted_at", { ascending: false })

      if (error) throw error

      const submissionsWithUsernames = data.map((s) => ({
        ...s,
        submitter_username: s.users.username,
      }))

      setSubmissions(submissionsWithUsernames)

      const groups: { [key: string]: ScoreSubmission[] } = {}
      submissionsWithUsernames.forEach((submission) => {
        const key = `${submission.team1_score}-${submission.team2_score}`
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(submission)
      })
      setConsensusGroups(groups)

      const largestGroup = Object.values(groups).reduce(
        (max, current) => (current.length > max.length ? current : max),
        [],
      )

      if (largestGroup.length >= 6 && !matchResult && matchData?.status !== "completed") {
        // Use matchData here
        console.log("[v0] Consensus reached with", largestGroup.length, "matching submissions")
        await completeMatch(largestGroup[0])
      }

      const userSubmission = data.find((s) => s.submitter_id === user?.id)
      setHasSubmitted(!!userSubmission)
      setUserSubmission(userSubmission || null)

      if (userSubmission && isRescoring) {
        setTeam1Score(userSubmission.team1_score.toString())
        setTeam2Score(userSubmission.team2_score.toString())
        setCsvCode(userSubmission.csv_code || "")
      }
    } catch (error) {
      console.error("[v0] Error loading submissions:", error)
    }
  }

  const completeMatch = async (consensusSubmission: ScoreSubmission) => {
    const supabase = createClient()

    try {
      console.log("[v0] Completing match with consensus submission:", consensusSubmission)

      const winningTeam =
        consensusSubmission.team1_score > consensusSubmission.team2_score
          ? 1
          : consensusSubmission.team2_score > consensusSubmission.team1_score
            ? 2
            : null

      const { data: currentMatch, error: fetchError } = await supabase
        .from("matches")
        .select("status")
        .eq("id", params.id)
        .single()

      if (fetchError) {
        console.error("[v0] Error fetching current match status:", fetchError)
        throw fetchError
      }

      if (currentMatch?.status === "completed") {
        console.log("[v0] Match already completed, skipping update")
        return
      }

      const { error: matchError } = await supabase
        .from("matches")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (matchError) {
        console.error("[v0] Error updating match status:", matchError)
        throw matchError
      }

      console.log("[v0] Match status updated to completed")

      // Insert match result
      const { error: resultError } = await supabase.from("match_results").upsert(
        {
          match_id: params.id,
          team1_score: consensusSubmission.team1_score,
          team2_score: consensusSubmission.team2_score,
          winning_team: winningTeam,
          csv_code: consensusSubmission.csv_code,
          total_submissions:
            consensusGroups[`${consensusSubmission.team1_score}-${consensusSubmission.team2_score}`]?.length || 6,
          validated_at: new Date().toISOString(),
        },
        {
          onConflict: "match_id",
        },
      )

      if (resultError) {
        console.error("[v0] Error inserting match result:", resultError)
        throw resultError
      }

      const { data: participants, error: participantsError } = await supabase
        .from("match_participants")
        .select(`
          user_id,
          team_assignment,
          users (
            id,
            username,
            elo_rating,
            wins,
            losses,
            total_games
          )
        `)
        .eq("match_id", params.id)

      if (participantsError) {
        console.error("[v0] Error fetching participants:", participantsError)
      } else if (participants && participants.length > 0) {
        console.log("[v0] Updating player statistics for", participants.length, "participants")

        // Update player statistics for each participant
        for (const participant of participants) {
          const isWinner =
            (winningTeam === 1 && participant.team_assignment === 1) ||
            (winningTeam === 2 && participant.team_assignment === 2)

          const currentElo = participant.users?.elo_rating || 1200
          const currentWins = participant.users?.wins || 0
          const currentLosses = participant.users?.losses || 0
          const currentTotalGames = participant.users?.total_games || 0
          const kFactor = 32
          const expectedScore = 0.5 // Simplified - assumes equal opponents
          const actualScore = isWinner ? 1 : 0
          const eloChange = Math.round(kFactor * (actualScore - expectedScore))
          const newElo = Math.max(800, currentElo + eloChange)

          // Update user statistics
          const { error: statsError } = await supabase
            .from("users")
            .update({
              elo_rating: newElo,
              wins: isWinner ? currentWins + 1 : currentWins,
              losses: isWinner ? currentLosses : currentLosses + 1,
              total_games: currentTotalGames + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", participant.user_id)

          if (statsError) {
            console.error("[v0] Error updating player stats for", participant.user_id, ":", statsError)
          } else {
            console.log(
              "[v0] Updated stats for",
              participant.users?.username,
              "- ELO:",
              currentElo,
              "→",
              newElo,
              "Result:",
              isWinner ? "WIN" : "LOSS",
            )
          }

          // Record match history
          const { error: historyError } = await supabase.from("match_history").insert({
            player_id: participant.user_id,
            game: "hockey",
            match_type: "4v4_draft",
            result: isWinner ? "win" : "loss",
            player_score: isWinner
              ? participant.team_assignment === 1
                ? consensusSubmission.team1_score
                : consensusSubmission.team2_score
              : participant.team_assignment === 1
                ? consensusSubmission.team2_score
                : consensusSubmission.team1_score,
            opponent_score: isWinner
              ? participant.team_assignment === 1
                ? consensusSubmission.team2_score
                : consensusSubmission.team1_score
              : participant.team_assignment === 1
                ? consensusSubmission.team2_score
                : consensusSubmission.team1_score,
            elo_before: currentElo,
            elo_after: newElo,
            elo_change: eloChange,
            match_date: new Date().toISOString(),
          })

          if (historyError) {
            console.error("[v0] Error recording match history for", participant.user_id, ":", historyError)
          }

          // Record ELO history
          const { error: eloHistoryError } = await supabase.from("elo_history").insert({
            user_id: participant.user_id,
            old_rating: currentElo,
            new_rating: newElo,
            rating_change: eloChange,
            game_result: isWinner ? "win" : "loss",
            match_id: params.id,
            created_at: new Date().toISOString(),
          })

          if (eloHistoryError) {
            console.error("[v0] Error recording ELO history:", eloHistoryError)
          }
        }
      }

      const consensusSubmissions =
        consensusGroups[`${consensusSubmission.team1_score}-${consensusSubmission.team2_score}`] || []

      for (const submission of consensusSubmissions) {
        if (submission.csv_code && submission.csv_code.trim()) {
          console.log("[v0] Processing CSV data for submission:", submission.id)

          try {
            const csvLines = submission.csv_code.trim().split("\n")
            const headers = csvLines[0].split(",").map((h) => h.trim().toLowerCase())

            for (let i = 1; i < csvLines.length; i++) {
              const values = csvLines[i].split(",").map((v) => v.trim())
              const playerData: any = {}

              headers.forEach((header, index) => {
                playerData[header] = values[index]
              })

              if (playerData.id) {
                const { error: analyticsError } = await supabase.from("player_analytics").upsert(
                  {
                    match_id: params.id,
                    user_id: playerData.id,
                    kills: Number.parseInt(playerData.goals) || 0,
                    deaths: 0,
                    assists: Number.parseInt(playerData.assists) || 0,
                    damage_dealt: Number.parseInt(playerData.shots) || 0,
                    damage_taken: 0,
                    healing_done: 0,
                    accuracy: Number.parseFloat(playerData["save_%"]) || 0,
                    score: (Number.parseInt(playerData.goals) || 0) + (Number.parseInt(playerData.assists) || 0),
                    // Hockey-specific fields
                    steals: Number.parseInt(playerData.steals) || 0,
                    shots: Number.parseInt(playerData.shots) || 0,
                    pickups: Number.parseInt(playerData.pickups) || 0,
                    passes: Number.parseInt(playerData.passes) || 0,
                    passes_received: Number.parseInt(playerData.passes_received) || 0,
                    shots_on_goalie: Number.parseInt(playerData.shots_on_goalie) || 0,
                    shots_saved: Number.parseInt(playerData.shots_saved) || 0,
                    goalie_minutes: Number.parseFloat(playerData.goalie_minutes) || 0,
                    skater_minutes: Number.parseFloat(playerData.skater_minutes) || 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  {
                    onConflict: "match_id,user_id",
                  },
                )

                if (analyticsError) {
                  console.error("[v0] Error storing player analytics:", analyticsError)
                } else {
                  console.log("[v0] Successfully saved analytics for player:", playerData.id)
                }
              }
            }
          } catch (parseError) {
            console.error("[v0] Error parsing CSV for submission:", submission.id, parseError)
          }
        }
      }

      // Process MVP votes directly
      const { data: mvpVotes, error: mvpVotesError } = await supabase
        .from("mvp_votes")
        .select("mvp_player_id, voter_id")
        .eq("match_id", params.id)

      if (mvpVotesError) {
        console.error("[v0] Error fetching MVP votes:", mvpVotesError)
      } else if (mvpVotes && mvpVotes.length > 0) {
        // Count votes for each player
        const voteCounts: { [playerId: string]: number } = {}
        mvpVotes.forEach((vote) => {
          voteCounts[vote.mvp_player_id] = (voteCounts[vote.mvp_player_id] || 0) + 1
        })

        // Award MVP to players with 5+ votes
        for (const [playerId, voteCount] of Object.entries(voteCounts)) {
          if (voteCount >= 5) {
            const { error: mvpAwardError } = await supabase.from("player_mvp_awards").upsert(
              {
                player_id: playerId, // Fixed: use player_id instead of user_id
                match_id: params.id,
                awarded_at: new Date().toISOString(),
              },
              {
                onConflict: "player_id,match_id",
              },
            )

            if (mvpAwardError) {
              console.error("[v0] Error awarding MVP:", mvpAwardError)
            } else {
              console.log("[v0] MVP awarded to player:", playerId, "with", voteCount, "votes")
            }
          }
        }
      }

      // Process flag votes directly
      const { data: flagReports, error: flagReportsError } = await supabase
        .from("player_flags")
        .select("flagged_player_id, flag_type, reporter_id")
        .eq("match_id", params.id)

      if (flagReportsError) {
        console.error("[v0] Error fetching flag reports:", flagReportsError)
      } else if (flagReports && flagReports.length > 0) {
        // Count flag reports for each player by type
        const flagCounts: { [key: string]: number } = {}
        flagReports.forEach((report) => {
          const key = `${report.flagged_player_id}-${report.flag_type}`
          flagCounts[key] = (flagCounts[key] || 0) + 1
        })

        // Record flags for players with 3+ reports of the same type
        for (const [key, reportCount] of Object.entries(flagCounts)) {
          if (reportCount >= 3) {
            const [playerId, flagType] = key.split("-")
            const { error: flagRecordError } = await supabase.from("player_flag_summary").upsert(
              {
                player_id: playerId, // Fixed: use correct table and field names
                flag_type: flagType,
                flag_count: reportCount,
                last_flagged: new Date().toISOString(),
              },
              {
                onConflict: "player_id,flag_type",
              },
            )

            if (flagRecordError) {
              console.error("[v0] Error recording flag:", flagRecordError)
            } else {
              console.log("[v0] Flag recorded for player:", playerId, "type:", flagType, "with", reportCount, "reports")
            }
          }
        }
      }

      console.log("[v0] Match completion successful - status updated, results saved, stats processed")
      toast.success("Match completed! All statistics have been saved.")

      await loadMatchData()
      await loadMatchResult()
    } catch (error) {
      console.error("[v0] Error completing match:", error)
      toast.error("Failed to complete match properly")
    }
  }

  const handleScoreSubmission = async () => {
    if (!user || !team1Score || !team2Score) {
      toast.error("Please fill in team scores")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      if (isRescoring && userSubmission) {
        const { error: updateError } = await supabase
          .from("score_submissions")
          .update({
            team1_score: Number.parseInt(team1Score),
            team2_score: Number.parseInt(team2Score),
            csv_code: csvCode.trim() || null,
            submitted_at: new Date().toISOString(),
            is_validated: false,
          })
          .eq("id", userSubmission.id)

        if (updateError) throw updateError
        toast.success("Score updated successfully!")
      } else {
        const { error: submitError } = await supabase.from("score_submissions").insert({
          match_id: params.id,
          submitter_id: user.id,
          team1_score: Number.parseInt(team1Score),
          team2_score: Number.parseInt(team2Score),
          csv_code: csvCode.trim() || null,
        })

        if (submitError) throw submitError
        toast.success("Score submitted successfully!")
      }

      if (csvCode.trim()) {
        console.log("[v0] Parsing CSV data for hockey analytics:", csvCode.trim())

        try {
          const { parseHockeyCSV } = await import("@/lib/services/csv-hockey-parser")
          const parsedStats = parseHockeyCSV(csvCode.trim())

          console.log(`[v0] Successfully parsed ${parsedStats.length} hockey stats`)

          // Store in match results for analytics
          const { error: updateError } = await supabase.from("match_results").upsert({
            match_id: params.id,
            csv_data: csvCode.trim(),
            hockey_stats: parsedStats,
            updated_at: new Date().toISOString(),
          })

          if (updateError) {
            console.error("[v0] Error storing CSV data:", updateError)
          } else {
            console.log("[v0] CSV data stored successfully")
          }
        } catch (parseError) {
          console.error("[v0] Error in CSV parsing:", parseError)
          toast.error("Score submitted but failed to parse hockey statistics")
        }
      }

      setHasSubmitted(true)
      setIsRescoring(false)

      setTeam1Score("")
      setTeam2Score("")
      setCsvCode("")
    } catch (error) {
      console.error("[v0] Error submitting score:", error)
      toast.error("Failed to submit score")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMvpVote = async () => {
    if (!user || !selectedMvp) {
      toast.error("Please select an MVP")
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.from("mvp_votes").upsert(
        {
          match_id: params.id,
          voter_id: user.id,
          mvp_player_id: selectedMvp,
        },
        {
          onConflict: "match_id,voter_id",
        },
      )

      if (error) throw error

      toast.success("MVP vote submitted!")
      setSelectedMvp("")
    } catch (error) {
      console.error("[v0] Error voting for MVP:", error)
      toast.error("Failed to submit MVP vote")
    }
  }

  const handlePlayerFlag = async () => {
    if (!user || !flaggedPlayer || !flagType || !flagDescription) {
      toast.error("Please fill in all flag fields")
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.from("player_flags").insert({
        match_id: params.id,
        reporter_id: user.id,
        flagged_player_id: flaggedPlayer,
        flag_type: flagType,
        description: flagDescription.trim(),
      })

      if (error) throw error

      toast.success("Player flag submitted!")
      setFlaggedPlayer("")
      setFlagType("")
      setFlagDescription("")
    } catch (error) {
      console.error("[v0] Error flagging player:", error)
      toast.error("Failed to submit player flag")
    }
  }

  const handleStartRescoring = () => {
    setIsRescoring(true)
    if (userSubmission) {
      setTeam1Score(userSubmission.team1_score.toString())
      setTeam2Score(userSubmission.team2_score.toString())
      setCsvCode(userSubmission.csv_code || "")
    }
  }

  const handleCancelRescoring = () => {
    setIsRescoring(false)
    setTeam1Score("")
    setTeam2Score("")
    setCsvCode("")
  }

  const loadMatchResult = async () => {
    try {
      const result = await loadMatchResultUtil(params.id)
      setMatchResult(result)
    } catch (error) {
      console.error("[v0] Error loading match result:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading score screen...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match Score Submission</h1>
          <p className="text-muted-foreground">Submit your match results and vote for MVP</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/leagues")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Users className="h-5 w-5" />
              Team 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {team1Players.map((player) => (
                <div key={player.user_id} className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">{player.username}</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {player.elo_rating}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Users className="h-5 w-5" />
              Team 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {team2Players.map((player) => (
                <div key={player.user_id} className="flex items-center justify-between">
                  <span className="font-medium text-red-900">{player.username}</span>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                    {player.elo_rating}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {matchResult ? (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Match Result Validated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-800">
                Team 1: {matchResult.team1_score} - Team 2: {matchResult.team2_score}
              </div>
              {matchResult.winning_team && (
                <div className="text-lg text-green-700">Winner: Team {matchResult.winning_team}</div>
              )}
              <div className="text-sm text-green-600">
                Validated with {matchResult.total_submissions} matching submissions
              </div>
              <div className="text-xs text-green-600 font-mono">CSV Code: {matchResult.csv_code}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {isRescoring ? "Update Match Score" : "Submit Match Score"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSubmitted && !isRescoring ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">Score submitted!</p>
                    <p className="text-sm text-muted-foreground">Waiting for other players to submit matching scores</p>
                  </div>
                  <Button onClick={handleStartRescoring} variant="outline" className="w-full bg-transparent">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit/Rescore Match
                  </Button>
                </div>
              ) : (
                <>
                  {isRescoring && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-blue-800 text-sm font-medium">Editing your previous submission</p>
                      <p className="text-blue-600 text-xs">Your updated scores will replace your previous submission</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team1Score">Team 1 Score</Label>
                      <Input
                        id="team1Score"
                        type="number"
                        value={team1Score}
                        onChange={(e) => setTeam1Score(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team2Score">Team 2 Score</Label>
                      <Input
                        id="team2Score"
                        type="number"
                        value={team2Score}
                        onChange={(e) => setTeam2Score(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="csvCode">Hockey Stats CSV (Optional)</Label>
                    <Textarea
                      id="csvCode"
                      value={csvCode}
                      onChange={(e) => setCsvCode(e.target.value)}
                      placeholder="ID,steals,goals,assists,shots,pickups,passes,passes_received,save_%,shots_on_goalie,shots_saved,goalie_minutes,skater_minutes&#10;player1,2,1,3,8,5,12,10,85.5,4,3,0,15.2"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV format: ID, steals, goals, assists, shots, pickups, passes, passes received, save %, shots on
                      goalie, shots saved, goalie minutes, skater minutes
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleScoreSubmission} disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? "Submitting..." : isRescoring ? "Update Score" : "Submit Score"}
                    </Button>
                    {isRescoring && (
                      <Button onClick={handleCancelRescoring} variant="outline">
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Consensus Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Submissions:</span>
                  <Badge variant="outline">{submissions.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consensus Needed:</span>
                  <Badge variant="outline">6 matching</Badge>
                </div>
                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Score Groups:</h4>
                  {Object.entries(consensusGroups).map(([score, groupSubmissions]) => (
                    <div key={score} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{score}</span>
                        <Badge
                          variant={groupSubmissions.length >= 6 ? "default" : "outline"}
                          className={groupSubmissions.length >= 6 ? "bg-green-600" : ""}
                        >
                          {groupSubmissions.length} votes
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground pl-2">
                        {groupSubmissions.map((sub) => sub.submitter_username).join(", ")}
                      </div>
                    </div>
                  ))}
                  {Object.keys(consensusGroups).length === 0 && (
                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4" />
              MVP Vote (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {participants.map((participant) => (
                <Button
                  key={participant.user_id}
                  variant={selectedMvp === participant.user_id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMvp(participant.user_id)}
                  className="justify-start text-xs"
                >
                  {participant.username}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {participant.elo_rating}
                  </Badge>
                </Button>
              ))}
            </div>
            <Button
              onClick={handleMvpVote}
              disabled={!selectedMvp}
              size="sm"
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              Vote MVP
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flag className="h-4 w-4" />
              Report Player (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {participants.map((participant) => (
                <Button
                  key={participant.user_id}
                  variant={flaggedPlayer === participant.user_id ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setFlaggedPlayer(participant.user_id)}
                  className="justify-start text-xs"
                >
                  {participant.username}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "unsportsmanlike", label: "Unsportsmanlike" },
                { value: "cheating", label: "Cheating" },
                { value: "harassment", label: "Harassment" },
                { value: "griefing", label: "Griefing" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={flagType === option.value ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setFlagType(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Textarea
              value={flagDescription}
              onChange={(e) => setFlagDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              className="text-xs"
            />
            <Button
              onClick={handlePlayerFlag}
              disabled={!flaggedPlayer || !flagType || !flagDescription}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Submit Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Match Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MatchStatsViewer matchId={params.id} />
        </CardContent>
      </Card>
    </div>
  )
}
