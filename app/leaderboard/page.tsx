import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import type { LeaderboardEntry } from '@/lib/types'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: entries } = await supabase
    .from('wc_leaderboard')
    .select('*')
    .limit(100)

  const leaderboard = (entries ?? []) as LeaderboardEntry[]

  return (
    <div className="min-h-screen bg-slate-900">
      <Header user={user} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">🏆 Leaderboard</h1>
        <p className="text-slate-400 text-sm mb-6">Group stage standings</p>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🌍</div>
            <p>No predictions scored yet — check back after the first matches!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => {
              const isMe = entry.id === user.id
              const rank = idx + 1
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isMe
                      ? 'bg-green-900/30 border-green-700'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-slate-400 font-bold text-sm">{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white">
                      {(entry.display_name ?? '?')[0].toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isMe ? 'text-green-300' : 'text-white'}`}>
                      {entry.display_name ?? 'Anonymous'}
                      {isMe && <span className="text-xs text-green-400 ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.exact_scores} exact · {entry.correct_results} result · {entry.predictions_scored} scored
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{entry.total_points}</span>
                    <p className="text-xs text-slate-400">pts</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-slate-700 text-sm text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">Points system</p>
          <p>⭐ <span className="text-white font-medium">3 points</span> — exact score (e.g. predict 2–1, result is 2–1)</p>
          <p>✓ <span className="text-white font-medium">1 point</span> — correct result (win/draw/loss right but wrong score)</p>
          <p>✗ <span className="text-white font-medium">0 points</span> — wrong result</p>
        </div>
      </main>
    </div>
  )
}
