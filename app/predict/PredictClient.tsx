'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { getFlag } from '@/lib/flags'
import type { Fixture, Prediction } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

type PredMap = Record<number, { home: string; away: string; saved: boolean; saving: boolean; error: string | null }>

function isMatchStarted(matchDate: string, matchTime: string): boolean {
  const dtStr = `${matchDate}T${matchTime}`
  const matchDt = new Date(dtStr)
  return new Date() >= matchDt
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

function pointsBadge(points: number | null) {
  if (points === null) return null
  const cls = points === 3 ? 'bg-green-600' : points === 1 ? 'bg-amber-600' : 'bg-slate-600'
  const label = points === 3 ? '3pts ⭐' : points === 1 ? '1pt ✓' : '0pts'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${cls}`}>
      {label}
    </span>
  )
}

export default function PredictClient({
  user,
  fixtures,
  initialPredictions,
}: {
  user: User
  fixtures: Fixture[]
  initialPredictions: Prediction[]
}) {
  const [activeGroup, setActiveGroup] = useState('A')
  const supabase = createClient()

  // Build prediction map keyed by fixture_id
  const [preds, setPreds] = useState<PredMap>(() => {
    const map: PredMap = {}
    for (const p of initialPredictions) {
      map[p.fixture_id] = {
        home: String(p.home_score),
        away: String(p.away_score),
        saved: true,
        saving: false,
        error: null,
      }
    }
    return map
  })

  const setScore = useCallback((fixtureId: number, side: 'home' | 'away', val: string) => {
    // Allow only digits 0-9
    if (val !== '' && !/^\d+$/.test(val)) return
    setPreds(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [side]: val,
        saved: false,
        saving: false,
        error: null,
      },
    }))
  }, [])

  const savePrediction = useCallback(async (fixture: Fixture) => {
    const p = preds[fixture.id]
    if (!p) return
    const home = parseInt(p.home)
    const away = parseInt(p.away)
    if (isNaN(home) || isNaN(away)) {
      setPreds(prev => ({
        ...prev,
        [fixture.id]: { ...prev[fixture.id], error: 'Enter both scores' },
      }))
      return
    }

    setPreds(prev => ({ ...prev, [fixture.id]: { ...prev[fixture.id], saving: true, error: null } }))

    const { error } = await supabase.from('wc_predictions').upsert(
      {
        user_id: user.id,
        fixture_id: fixture.id,
        home_score: home,
        away_score: away,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,fixture_id' }
    )

    if (error) {
      setPreds(prev => ({ ...prev, [fixture.id]: { ...prev[fixture.id], saving: false, error: error.message } }))
    } else {
      setPreds(prev => ({ ...prev, [fixture.id]: { ...prev[fixture.id], saving: false, saved: true } }))
    }
  }, [preds, supabase, user.id])

  const groupFixtures = fixtures.filter(f => f.group_name === `Group ${activeGroup}`)

  // Count predictions per group for badge
  const predCountByGroup: Record<string, number> = {}
  for (const f of fixtures) {
    const g = f.group_name.replace('Group ', '')
    if (preds[f.id]?.saved) {
      predCountByGroup[g] = (predCountByGroup[g] ?? 0) + 1
    }
  }

  const totalPreds = Object.values(preds).filter(p => p.saved).length

  return (
    <div className="min-h-screen bg-slate-900">
      <Header user={user} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-1.5">
            <span>Predictions submitted</span>
            <span className="font-medium text-white">{totalPreds} / {fixtures.length}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(totalPreds / fixtures.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {GROUPS.map(g => {
            const count = predCountByGroup[g] ?? 0
            const isActive = g === activeGroup
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {g}
                {count === 6 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Fixtures */}
        <div className="space-y-3">
          {groupFixtures.map(fixture => {
            const started = isMatchStarted(fixture.match_date, fixture.match_time)
            const pred = preds[fixture.id]
            const hasResult = fixture.home_score !== null && fixture.away_score !== null
            const points = initialPredictions.find(p => p.fixture_id === fixture.id)?.points ?? null

            return (
              <div
                key={fixture.id}
                className={`bg-slate-800 rounded-xl border ${
                  started ? 'border-slate-600 opacity-90' : 'border-slate-700'
                } p-4`}
              >
                {/* Meta row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">
                    #{fixture.match_number} · {formatDate(fixture.match_date)} · {formatTime(fixture.match_time)}
                  </span>
                  <div className="flex items-center gap-2">
                    {started && !hasResult && (
                      <span className="text-xs text-amber-400 font-medium">In progress / played</span>
                    )}
                    {hasResult && pointsBadge(points)}
                    {!started && pred?.saved && !pred?.saving && (
                      <span className="text-xs text-green-400">✓ Saved</span>
                    )}
                  </div>
                </div>

                {/* Teams + scores */}
                <div className="flex items-center gap-3">
                  {/* Home team */}
                  <div className="flex-1 flex items-center gap-2 justify-end">
                    <span className="text-sm font-semibold text-right leading-tight">
                      {getFlag(fixture.home_team)} {fixture.home_team}
                    </span>
                  </div>

                  {/* Score area */}
                  <div className="flex items-center gap-1.5">
                    {hasResult ? (
                      // Actual result
                      <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-3 py-1.5">
                        <span className="text-lg font-bold text-white">{fixture.home_score}</span>
                        <span className="text-slate-400 mx-0.5">–</span>
                        <span className="text-lg font-bold text-white">{fixture.away_score}</span>
                      </div>
                    ) : started ? (
                      // Locked — show prediction if any
                      <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg px-3 py-1.5">
                        <span className="text-lg font-bold text-slate-400">
                          {pred?.home ?? '?'}
                        </span>
                        <span className="text-slate-500 mx-0.5">–</span>
                        <span className="text-lg font-bold text-slate-400">
                          {pred?.away ?? '?'}
                        </span>
                      </div>
                    ) : (
                      // Prediction inputs
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={pred?.home ?? ''}
                          onChange={e => setScore(fixture.id, 'home', e.target.value)}
                          placeholder="0"
                          className="w-10 h-10 text-center text-lg font-bold bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <span className="text-slate-400 font-bold">–</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={pred?.away ?? ''}
                          onChange={e => setScore(fixture.id, 'away', e.target.value)}
                          placeholder="0"
                          className="w-10 h-10 text-center text-lg font-bold bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-semibold leading-tight">
                      {getFlag(fixture.away_team)} {fixture.away_team}
                    </span>
                  </div>
                </div>

                {/* Prediction shown below result if result is in */}
                {hasResult && pred?.saved && (
                  <div className="mt-2 text-center text-xs text-slate-400">
                    Your prediction: {pred.home} – {pred.away}
                  </div>
                )}

                {/* Save button + error */}
                {!started && !hasResult && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-red-400">{pred?.error ?? ''}</span>
                    <button
                      onClick={() => savePrediction(fixture)}
                      disabled={pred?.saving || (!pred?.home && pred?.home !== '0') || (!pred?.away && pred?.away !== '0')}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {pred?.saving ? 'Saving…' : pred?.saved ? 'Update' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
