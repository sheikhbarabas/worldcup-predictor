'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { getFlag } from '@/lib/flags'
import type { Fixture } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

function calcPoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  if (predHome === actualHome && predAway === actualAway) return 3
  const predResult = predHome > predAway ? 'H' : predHome < predAway ? 'A' : 'D'
  const actualResult = actualHome > actualAway ? 'H' : actualHome < actualAway ? 'A' : 'D'
  return predResult === actualResult ? 1 : 0
}

export default function AdminClient({ user, fixtures }: { user: User; fixtures: Fixture[] }) {
  const supabase = createClient()
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>(() => {
    const m: Record<number, { home: string; away: string }> = {}
    for (const f of fixtures) {
      m[f.id] = {
        home: f.home_score !== null ? String(f.home_score) : '',
        away: f.away_score !== null ? String(f.away_score) : '',
      }
    }
    return m
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  async function saveResult(fixture: Fixture) {
    const s = scores[fixture.id]
    const home = parseInt(s.home)
    const away = parseInt(s.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setErrors(p => ({ ...p, [fixture.id]: 'Enter valid scores' }))
      return
    }

    setSaving(p => ({ ...p, [fixture.id]: true }))
    setErrors(p => ({ ...p, [fixture.id]: '' }))

    // Update fixture score
    const { error: fErr } = await supabase
      .from('wc_fixtures')
      .update({ home_score: home, away_score: away })
      .eq('id', fixture.id)

    if (fErr) {
      setErrors(p => ({ ...p, [fixture.id]: fErr.message }))
      setSaving(p => ({ ...p, [fixture.id]: false }))
      return
    }

    // Fetch all predictions for this fixture and recalculate points
    const { data: preds } = await supabase
      .from('wc_predictions')
      .select('id, home_score, away_score')
      .eq('fixture_id', fixture.id)

    if (preds && preds.length > 0) {
      await Promise.all(
        preds.map(p =>
          supabase
            .from('wc_predictions')
            .update({ points: calcPoints(p.home_score, p.away_score, home, away) })
            .eq('id', p.id)
        )
      )
    }

    setSaving(p => ({ ...p, [fixture.id]: false }))
    setSaved(p => ({ ...p, [fixture.id]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [fixture.id]: false })), 2000)
  }

  const pendingFixtures = fixtures.filter(f => f.home_score === null)
  const completedFixtures = fixtures.filter(f => f.home_score !== null)

  function FixtureRow({ fixture }: { fixture: Fixture }) {
    const s = scores[fixture.id]
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
        <span className="text-xs text-slate-400 w-6 text-center">#{fixture.match_number}</span>
        <span className="flex-1 text-sm text-right truncate">
          {getFlag(fixture.home_team)} {fixture.home_team}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="0"
            value={s.home}
            onChange={e => setScores(p => ({ ...p, [fixture.id]: { ...p[fixture.id], home: e.target.value } }))}
            className="w-10 h-9 text-center font-bold bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min="0"
            value={s.away}
            onChange={e => setScores(p => ({ ...p, [fixture.id]: { ...p[fixture.id], away: e.target.value } }))}
            className="w-10 h-9 text-center font-bold bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <span className="flex-1 text-sm truncate">
          {getFlag(fixture.away_team)} {fixture.away_team}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {errors[fixture.id] && <span className="text-xs text-red-400">{errors[fixture.id]}</span>}
          {saved[fixture.id] && <span className="text-xs text-green-400">✓ Saved</span>}
          <button
            onClick={() => saveResult(fixture)}
            disabled={saving[fixture.id]}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
          >
            {saving[fixture.id] ? '…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header user={user} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">⚙️ Admin — Enter Results</h1>
        <p className="text-slate-400 text-sm mb-8">
          Points are automatically recalculated for all players when you save a score.
        </p>

        {pendingFixtures.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">
              Awaiting results ({pendingFixtures.length})
            </h2>
            <div className="space-y-2">
              {pendingFixtures.map(f => <FixtureRow key={f.id} fixture={f} />)}
            </div>
          </section>
        )}

        {completedFixtures.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
              Completed ({completedFixtures.length})
            </h2>
            <div className="space-y-2">
              {completedFixtures.map(f => <FixtureRow key={f.id} fixture={f} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
