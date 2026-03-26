export interface Match {
  id: string
  creator_id: string
  name: string
  description: string
  match_type: string
  status: string
  created_at: string
  updated_at?: string
  max_participants: number
  match_participants?: Array<{
    users: {
      id: string
      username: string
      elo_rating: number
    }
  }>
}

export interface MatchResult {
  id: string
  match_id: string
  team1_score: number
  team2_score: number
  winning_team: number | null
  csv_code: string | null
  total_submissions: number
  validated_at: string
}

export interface ScoreSubmission {
  id: string
  match_id: string
  submitter_id: string
  team1_score: number
  team2_score: number
  csv_code: string | null
  submitted_at: string
  is_validated: boolean
}
