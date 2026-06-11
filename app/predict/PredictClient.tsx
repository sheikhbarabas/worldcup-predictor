'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { getFlag } from '@/lib/flags'
import type { Fixture, Prediction } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

type PredMap = Record<number, { home: string; away: string; saved: boolean; saving: boolean; error: string | null }>

function isMatchStarted(matchDate: string, matchTime: string): boolean {
  const matchDt = new Date(`${matchDate}T${matchTime}Z`)
  return new Date() >= matchDt
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5) + ' GMT'
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
  const supabase = createClient()

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

  const [isSavingAll, setIsSavingAll] = useState(false)
  const [saveAllStatus, setSaveAllStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const setScore = useCallback((fixtureId: number, side: 'home' | 'away', val: string) => {
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
    setSaveAllStatus('idle')
  }, [])

  // Unsaved predictions that have both scores filled in and game hasn't started
  const unsavedCount = useMemo(() => {
    return fixtures.filter(f => {
      const p = preds[f.id]
      const started = isMatchStarted(f.match_date, f.match_time)
      return !started && p && !p.saved && p.home !== '' && p.away !== ''
    }).length
  }, [preds, fixtures])

  const saveAll = useCallback(async () => {
    const toSave = fixtures.filter(f => {
      const p = preds[f.id]
      const started = isMatchStarted(f.match_date, f.match_time)
      return !started && p && !p.saved && p.home !== '' && p.away !== ''
    })

    if (toSave.length === 0) return

    setIsSavingAll(true)
    setSaveAllStatus('idle')

    // Mark all as saving
    setPreds(prev => {
      const next = { ...prev }
      toSave.forEach(f => { next[f.id] = { ...next[f.id], saving: true, error: null } })
      return next
    })

    const upserts = toSave.map(f => ({
      user_id: user.id,
      fixture_id: f.id,
      home_score: parseInt(preds[f.id].home),
      away_score: parseInt(preds[f.id].away),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('wc_predictions').upsert(upserts, {
      onConflict: 'user_id,fixture_id',
    })

    if (error) {
      setPreds(prev => {
        const next = { ...prev }
        toSave.forEach(f => { next[f.id] = { ...next[f.id], saving: false, error: 'Failed to save' } })
        return next
      })
      setSaveAllStatus('error')
    } else {
      setPreds(prev => {
        const next = { ...prev }
        toSave.forEach(f => { next[f.id] = { ...next[f.id], saving: false, saved: true, error: null } })
        return next
      })
      setSaveAllStatus('success')
      setTimeout(() => setSaveAllStatus('idle'), 3000)
    }

    setIsSavingAll(false)
  }, [fixtures, preds, supabase, user.id])

  // Group fixtures by date
  const fixturesByDate = useMemo(() => {
    const groups: { date: string; fixtures: Fixture[] }[] = []
    for (const f of fixtures) {
      const last = groups[groups.length - 1]
      if (last && last.date === f.match_date) {
        last.fixtures.push(f)
      } else {
        groups.push({ date: f.match_date, fixtures: [f] })
      }
    }
    return groups
  }, [fixtures])

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

        {/* Save All button */}
        {unsavedCount > 0 && (
          <div className="mb-5 flex items-center justify-between bg-slate-800 border border-green-600/40 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{unsavedCount}</span> unsaved prediction{unsavedCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={saveAll}
              disabled={isSavingAll}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isSavingAll ? 'Saving…' : `Save All`}
            </button>
          </div>
        )}

        {saveAllStatus === 'success' && unsavedCount === 0 && (
          <div className="mb-5 flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-xl px-4 py-3">
            <span className="text-green-400 text-sm font-medium">✓ All predictions saved</span>
          </div>
        )}

        {saveAllStatus === 'error' && (
          <div className="mb-5 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3">
            <span className="text-red-400 text-sm">Failed to save some predictions. Please try again.</span>
          </div>
        )}

        {/* Fixtures grouped by date */}
        <div className="space-y-6">
          {fixturesByDate.map(({ date, fixtures: dayFixtures }) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {formatDate(date)}
                </h2>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              <div className="space-y-3">
                {dayFixtures.map(fixture => {
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
                          #{fixture.match_number} · {fixture.group_name} · {formatTime(fixture.match_time)}
                        </span>
                        <div className="flex items-center gap-2">
                          {started && !hasResult && (
                            <span className="text-xs text-amber-400 font-medium">In progress / played</span>
                          )}
                          {hasResult && pointsBadge(points)}
                          {!started && pred?.saved && !pred?.saving && (
                            <span className="text-xs text-green-400">✓ Saved</span>
                          )}
                          {!started && pred && !pred.saved && pred.home !== '' && pred.away !== '' && (
                            <span className="text-xs text-amber-400">Unsaved</span>
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
                            <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-3 py-1.5">
                              <span className="text-lg font-bold text-white">{fixture.home_score}</span>
                              <span className="text-slate-400 mx-0.5">–</span>
                              <span className="text-lg font-bold text-white">{fixture.away_score}</span>
                            </div>
                          ) : started ? (
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg px-3 py-1.5">
                              <span className="text-lg font-bold text-slate-400">{pred?.home ?? '?'}</span>
                              <span className="text-slate-500 mx-0.5">–</span>
                              <span className="text-lg font-bold text-slate-400">{pred?.away ?? '?'}</span>
                            </div>
                          ) : (
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

                      {/* Prediction shown below result */}
                      {hasResult && pred?.saved && (
                        <div className="mt-2 text-center text-xs text-slate-400">
                          Your prediction: {pred.home} – {pred.away}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
