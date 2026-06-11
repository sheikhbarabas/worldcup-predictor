export type Fixture = {
  id: number
  match_number: number
  match_date: string
  match_time: string
  home_team: string
  away_team: string
  group_name: string
  home_score: number | null
  away_score: number | null
  created_at: string
}

export type Prediction = {
  id: number
  user_id: string
  fixture_id: number
  home_score: number
  away_score: number
  points: number | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type LeaderboardEntry = {
  id: string
  display_name: string | null
  avatar_url: string | null
  predictions_scored: number
  total_points: number
  exact_scores: number
  correct_results: number
}
