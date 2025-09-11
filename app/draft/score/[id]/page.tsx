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
import { toast } from "sonner"
import { MatchStatsViewer } from "@/components/analytics/match-stats-viewer"
import { loadMatchResult as loadMatchResultUtil } from "@/lib/supabase/match-result"
import type { Match } from "@/lib/types/match" // Import Match type
import { createClient } from "@/lib/supabase/client" // Changed from supabase import to createClient

const supabase = createClient() // Initialize the client here

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
  team_assignment: number | null
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

const mvpBonusReward = 50 // Declare the variable here

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
  const [isUserParticipant, setIsUserParticipant] = useState(false)

  useEffect(() => {
    loadMatchData()
    setupRealTimeSubscriptions()
  }, [params.id])

  const setupRealTimeSubscriptions = () => {
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
    try {
      console.log("[v0] Loading match data for:", params.id)

      const { data: eloMatches, error: eloError } = await supabase
        .from("matches")
        .select(`
          *,
          match_participants(
            user_id,
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
            team_assignment: Math.floor(index / 4) + 1, // Assign teams based on order (4 players per team)
          }))
      }

      console.log("[v0] Processed participants:", participantsWithElo)
      console.log("[v0] Current user ID:", user?.id)
      console.log(
        "[v0] User is participant:",
        participantsWithElo.some((p) => p.user_id === user?.id),
      )

      if (participantsWithElo.length === 0) {
        throw new Error("No participants found for this match")
      }

      const team1 = participantsWithElo.filter((p) => p.team_assignment === 1)
      const team2 = participantsWithElo.filter((p) => p.team_assignment === 2)

      console.log("[v0] Team 1:", team1)
      console.log("[v0] Team 2:", team2)

      setMatchData(match)
      setParticipants(participantsWithElo)
      setTeam1Players(team1)
      setTeam2Players(team2)
      setIsUserParticipant(participantsWithElo.some((p) => p.user_id === user?.id))

      await Promise.all([loadScoreSubmissions(match), loadMatchResult()])
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading match data:", error)
      toast.error("Failed to load match data")
      setLoading(false)
    }
  }

  const calculateWinnerFromCSV = (csvSubmissions: ScoreSubmission[], matchParticipants: any[]) => {
    console.log("[v0] 🎯 Calculating winner from CSV data...")

    let team1Goals = 0
    let team2Goals = 0
    const processedPlayers = new Set()

    csvSubmissions.forEach((submission, index) => {
      if (!submission.csv_code?.trim()) {
        console.log(`[v0] Skipping submission ${index + 1}: no CSV data`)
        return
      }

      console.log(`[v0] Processing CSV submission ${index + 1}:`, submission.csv_code.substring(0, 100) + "...")

      try {
        const lines = submission.csv_code
          .trim()
          .split("\n")
          .filter((line) => line.trim())

        lines.forEach((line, lineIndex) => {
          const parts = line.split(",").map((p) => p.trim())

          if (parts.length < 6) {
            console.log(`[v0] Skipping line ${lineIndex + 1}: insufficient parts (${parts.length}, need at least 6)`)
            return
          }

          // Extract account ID from complex format like "1-S2-1-5822233"
          let accountId = parts[1]
          if (accountId && accountId.includes("-")) {
            const idParts = accountId.split("-")
            accountId = idParts[idParts.length - 1] // Get the last part
          }

          if (!accountId || processedPlayers.has(accountId)) {
            return // Skip if no account ID or already processed this player
          }

          const goals = Number.parseInt(parts[3]) || 0 // Goals are in column 4 (index 3)

          // Find which team this player is on based on match participants
          const participantIndex = matchParticipants.findIndex(
            (p) => p.users?.id?.toString().includes(accountId) || p.user_id?.toString().includes(accountId),
          )

          if (participantIndex !== -1) {
            const teamAssignment = Math.floor(participantIndex / 4) + 1 // 4 players per team

            if (teamAssignment === 1) {
              team1Goals += goals
            } else if (teamAssignment === 2) {
              team2Goals += goals
            }

            processedPlayers.add(accountId)
            console.log(`[v0] Player ${accountId}: ${goals} goals for Team ${teamAssignment}`)
          }
        })
      } catch (error) {
        console.error(`[v0] Error parsing CSV submission ${index + 1}:`, error)
      }
    })

    console.log(`[v0] 🏒 Final goal count: Team 1: ${team1Goals}, Team 2: ${team2Goals}`)
    console.log(`[v0] 🏆 Winner: ${team1Goals > team2Goals ? "Team 1" : team2Goals > team1Goals ? "Team 2" : "Draw"}`)

    return {
      team1_score: team1Goals,
      team2_score: team2Goals,
      winning_team: team1Goals > team2Goals ? 1 : team2Goals > team1Goals ? 2 : null,
    }
  }

  const loadScoreSubmissions = async (currentMatch?: any) => {
    try {
      console.log("[v0] Loading score submissions...")
      const { data: submissions, error } = await supabase
        .from("score_submissions")
        .select("*")
        .eq("match_id", params.id)
        .order("submitted_at", { ascending: false })

      if (error) {
        console.error("[v0] Error loading submissions:", error)
        return
      }

      console.log(`[v0] Found ${submissions?.length || 0} score submissions`)

      const { data: matchParticipants, error: participantsError } = await supabase
        .from("match_participants")
        .select(`
        user_id,
        users!inner(id, username)
      `)
        .eq("match_id", params.id)

      if (participantsError) {
        console.error("[v0] Error loading participants:", participantsError)
        return
      }

      console.log(`[v0] Found ${matchParticipants?.length || 0} match participants`)

      // Filter submissions to only include those from actual participants
      const validSubmissions =
        submissions?.filter((submission) => matchParticipants?.some((p) => p.user_id === submission.submitter_id)) || []

      console.log(`[v0] Valid submissions from participants: ${validSubmissions.length}`)

      // Add usernames to submissions with calculated team assignments
      const submissionsWithUsernames = validSubmissions.map((submission) => {
        const participant = matchParticipants?.find((p) => p.user_id === submission.submitter_id)
        const participantIndex = matchParticipants?.findIndex((p) => p.user_id === submission.submitter_id) || 0
        return {
          ...submission,
          username: participant?.users?.username || "Unknown",
          team_assignment: Math.floor(participantIndex / 4) + 1, // Calculate team based on participant order
        }
      })

      setSubmissions(submissionsWithUsernames)

      const activeMatch = currentMatch || matchData
      if (submissionsWithUsernames.length >= 5 && !matchResult && activeMatch?.status !== "completed") {
        console.log(
          `[v0] 🎯 AUTOMATIC COMPLETION TRIGGERED: ${submissionsWithUsernames.length} submissions received (5+ threshold met)`,
        )
        console.log("[v0] Match status:", activeMatch?.status)
        console.log("[v0] Match result exists:", !!matchResult)

        const csvSubmissions = submissionsWithUsernames.filter((s) => s.csv_code?.trim())

        if (csvSubmissions.length >= 3) {
          console.log(`[v0] 🏒 Using CSV data to determine winner (${csvSubmissions.length} CSV submissions found)`)

          const csvResult = calculateWinnerFromCSV(csvSubmissions, matchParticipants)

          console.log(
            `[v0] 🚀 AUTO-COMPLETING MATCH WITH CSV SCORES: Team 1: ${csvResult.team1_score}, Team 2: ${csvResult.team2_score}`,
          )

          await completeMatch(csvResult, submissionsWithUsernames, matchParticipants, activeMatch)
          return
        } else {
          console.log(`[v0] ⏳ Not enough CSV submissions yet: found ${csvSubmissions.length} (need at least 3)`)

          // Fallback to manual score consensus if not enough CSV data
          const consensusGroups: { [key: string]: any[] } = {}
          submissionsWithUsernames.forEach((submission) => {
            const key = `${submission.team1_score}-${submission.team2_score}`
            if (!consensusGroups[key]) consensusGroups[key] = []
            consensusGroups[key].push(submission)
          })

          const consensusEntries = Object.entries(consensusGroups)
          if (consensusEntries.length > 0) {
            const largestGroup = consensusEntries.reduce(
              (max, [key, group]) => (group.length > max.group.length ? { key, group } : max),
              { key: "", group: [] as any[] },
            )

            const consensusPercentage = (largestGroup.group.length / submissionsWithUsernames.length) * 100
            console.log(
              `[v0] Largest consensus group: ${largestGroup.key} with ${largestGroup.group.length} submissions (${consensusPercentage.toFixed(1)}%)`,
            )

            if (largestGroup.group.length >= 3) {
              const [team1Score, team2Score] = largestGroup.key.split("-").map(Number)
              console.log(
                `[v0] 🚀 AUTO-COMPLETING MATCH WITH MANUAL SCORES: Score ${team1Score}-${team2Score} with ${largestGroup.group.length} matching submissions`,
              )

              const consensusSubmission = {
                team1_score: team1Score,
                team2_score: team2Score,
              }

              await completeMatch(consensusSubmission, submissionsWithUsernames, matchParticipants, activeMatch)
              return
            } else {
              console.log(
                `[v0] ⏳ Not enough consensus yet: largest group has ${largestGroup.group.length} submissions (need at least 3)`,
              )
            }
          }
        }
      } else {
        console.log(`[v0] Auto-completion conditions not met:`)
        console.log(`[v0] - Submissions: ${submissionsWithUsernames.length} (need 5+)`)
        console.log(`[v0] - Match result exists: ${!!matchResult}`)
        console.log(`[v0] - Match status: ${activeMatch?.status}`)
      }

      const consensusGroups: { [key: string]: any[] } = {}
      submissionsWithUsernames.forEach((submission) => {
        const key = `${submission.team1_score}-${submission.team2_score}`
        if (!consensusGroups[key]) consensusGroups[key] = []
        consensusGroups[key].push(submission)
      })
      setConsensusGroups(consensusGroups)
    } catch (error) {
      console.error("[v0] Error in loadScoreSubmissions:", error)
    }
  }

  const handleCompleteMatch = async () => {
    const csvSubmissions = submissions.filter((s) => s.csv_code?.trim())

    if (csvSubmissions.length >= 3) {
      console.log("[v0] 🏒 Using CSV data for manual completion")
      const csvResult = calculateWinnerFromCSV(csvSubmissions, participants)
      await completeMatch(csvResult)
      toast.success("Match completed using CSV goal data!")
      return
    }

    // Fallback to manual score consensus
    const largestGroup = Object.values(consensusGroups).reduce(
      (max, current) => (current.length > max.length ? current : max),
      [],
    )

    const totalParticipants = matchData?.match_participants?.length || 8
    const requiredConsensus = Math.ceil(totalParticipants * 0.6)

    if (largestGroup.length < requiredConsensus) {
      toast.error(`Need ${requiredConsensus} matching submissions to complete match`)
      return
    }

    if (largestGroup.length > 0) {
      await completeMatch(largestGroup[0])
      toast.success("Match completed successfully!")
    }
  }

  async function completeMatch(
    consensusSubmission: any,
    submissions: any[] = [],
    participants: any[] = [],
    activeMatchData: any = null,
  ) {
    if (!activeMatchData || !user) {
      console.error("[v0] ❌ Missing required data for match completion")
      return
    }

    if (!consensusSubmission) {
      console.error("[v0] ❌ No consensus submission provided")
      return
    }

    try {
      console.log("[v0] 🎯 Starting match completion process...")
      console.log("[v0] Match ID:", params.id)
      console.log("[v0] Match data:", activeMatchData)
      console.log("[v0] Consensus submission:", consensusSubmission)
      console.log("[v0] Submissions count:", submissions.length)
      console.log("[v0] Participants count:", participants.length)

      const winningTeam =
        consensusSubmission.team1_score > consensusSubmission.team2_score
          ? 1
          : consensusSubmission.team2_score > consensusSubmission.team1_score
            ? 2
            : null

      console.log(`[v0] Winning team: ${winningTeam || "Draw"}`)

      let csvData = null

      // First, try to get CSV data from submissions
      const csvSubmissions = submissions.filter((s) => s.csv_code && s.csv_code.trim())
      if (csvSubmissions.length > 0) {
        // Use the most recent CSV submission or combine them
        csvData = csvSubmissions[csvSubmissions.length - 1].csv_code.trim()
        console.log("[v0] Using CSV data from submissions:", csvData.substring(0, 100) + "...")
      } else {
        // Fallback: create a basic CSV structure to satisfy not-null constraint
        csvData = `team,account_id,steals,goals,assists,shots,pickups,passes,passes_received,save_%,shots_on_goalie,shots_saved,goalie_minutes,skater
1,match-${params.id}-team1,0,${consensusSubmission.team1_score || 0},0,0,0,0,0,0,0,0,0,0
2,match-${params.id}-team2,0,${consensusSubmission.team2_score || 0},0,0,0,0,0,0,0,0,0,0`
        console.log("[v0] Using fallback CSV data structure")
      }

      console.log("[v0] CSV data found:", !!csvData)

      // Create match result
      const { data: existingResult } = await supabase
        .from("match_results")
        .select("id")
        .eq("match_id", params.id)
        .single()

      if (!existingResult) {
        console.log("[v0] Creating new match result...")
        const { error: resultError } = await supabase.from("match_results").insert({
          match_id: params.id,
          team1_score: consensusSubmission.team1_score,
          team2_score: consensusSubmission.team2_score,
          winning_team: winningTeam,
          total_submissions: submissions.length || 0,
          consensus_threshold: Math.ceil((participants.length || 8) * 0.6),
          validated_at: new Date().toISOString(),
          csv_code: csvData, // Now guaranteed to have a value
        })

        if (resultError) {
          console.error("[v0] ❌ Error creating match result:", resultError)
          toast.error("Failed to create match result")
          throw resultError
        } else {
          console.log("[v0] ✅ Match result created successfully")
        }
      } else {
        console.log("[v0] ℹ️ Match result already exists, skipping creation")
      }

      // Update match status
      console.log("[v0] Updating match status to completed...")
      const { error: matchError } = await supabase.from("matches").update({ status: "completed" }).eq("id", params.id)

      if (matchError) {
        console.error("[v0] ❌ Error updating match status:", matchError)
        toast.error("Failed to update match status")
        throw matchError
      } else {
        console.log("[v0] ✅ Match status updated to completed")
      }

      if (csvData) {
        console.log("[v0] 📊 Processing CSV data for analytics...")
        try {
          // Trigger CSV processing refresh
          const csvProcessEvent = new CustomEvent("csvProcessed", {
            detail: { matchId: params.id, csvData },
          })
          window.dispatchEvent(csvProcessEvent)
          console.log("[v0] ✅ CSV processing event dispatched")
        } catch (csvError) {
          console.error("[v0] ⚠️ CSV processing failed but match completed:", csvError)
        }
      }

      // Show success message
      toast.success("Match completed successfully!")

      // Reload match data to reflect changes
      console.log("[v0] Reloading match data...")
      await loadMatchData()

      console.log("[v0] 🎉 MATCH COMPLETION SUCCESSFUL!")
    } catch (error) {
      console.error("[v0] ❌ MATCH COMPLETION FAILED:", error)
      toast.error("Failed to complete match")
      throw error
    }
  }

  const submitScore = async () => {
    if (!user || !team1Score || !team2Score) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!isUserParticipant) {
      toast.error("Only match participants can submit scores")
      return
    }

    console.log("[v0] User validated as participant, proceeding with score submission")

    setIsSubmitting(true)

    try {
      if (userSubmission && !isRescoring) {
        toast.error("You have already submitted a score. Use the 'Rescore' button to update it.")
        return
      }

      if (userSubmission && isRescoring) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from("score_submissions")
          .update({
            team1_score: Number.parseInt(team1Score),
            team2_score: Number.parseInt(team2Score),
            csv_code: csvCode.trim() || null,
          })
          .eq("id", userSubmission.id)

        if (updateError) throw updateError
        toast.success("Score updated successfully!")
      } else {
        // Insert new submission
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
        console.log("[v0] CSV data submitted:", csvCode.trim())
      }

      setHasSubmitted(true)
      setIsRescoring(false)

      setTeam1Score("")
      setTeam2Score("")
      setCsvCode("")

      await loadScoreSubmissions()
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
                  <div className="space-y-2">
                    <Label htmlFor="csvCode">Hockey Stats CSV</Label>
                    <Textarea
                      id="csvCode"
                      value={csvCode}
                      onChange={(e) => setCsvCode(e.target.value)}
                      placeholder="1,1-S2-1-5822233,6,1,0,5,34,9,22,1.02,0,0,0,539/n2,1-S2-1-1839314,1,3,1,4,34,14,13,1.07,0,0,0,716"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong>Format:</strong> team,handle(or
                        account_id),steals,goals,assists,shots,pick_ups,passes,passes_received,possession,saves_allowed,saves,GoalTended,Skating_Time
                      </p>
                      <p>
                        <strong>Handle/Account ID:</strong> Use format like "1-S2-1-5822233" where the last part
                        (5822233) is the player's account ID, or use direct account ID/handle
                      </p>
                      <p>
                        <strong>Team:</strong> 1 or 2 (used for team assignment and statistics)
                      </p>
                      <p>
                        <strong>Separator:</strong> Use /n to separate users and teams (will be converted to line
                        breaks)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={submitScore} disabled={isSubmitting} className="flex-1">
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
                  <span className="text-sm text-muted-foreground">Auto-Complete At:</span>
                  <Badge
                    variant={submissions.length >= 5 ? "default" : "outline"}
                    className={submissions.length >= 5 ? "bg-green-600" : ""}
                  >
                    5 submissions
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consensus Needed:</span>
                  <Badge variant="outline">60% majority</Badge>
                </div>
                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Score Groups:</h4>
                  {Object.entries(consensusGroups).map(([score, groupSubmissions]) => (
                    <div key={score} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{score}</span>
                        <Badge
                          variant={
                            groupSubmissions.length >= Math.ceil((matchData?.match_participants?.length || 8) * 0.6)
                              ? "default"
                              : "outline"
                          }
                          className={
                            groupSubmissions.length >= Math.ceil((matchData?.match_participants?.length || 8) * 0.6)
                              ? "bg-green-600"
                              : ""
                          }
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
                <Button onClick={handleCompleteMatch} className="w-full bg-green-600 hover:bg-green-700">
                  Complete Match
                </Button>
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
              MVP Vote (No Consensus Required)
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
              Report Player (No Consensus Required)
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
                { value: "toxicity", label: "Toxicity" },
                { value: "cheating", label: "Cheating" },
                { value: "griefing", label: "Griefing" },
                { value: "afk", label: "AFK/Inactive" },
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
