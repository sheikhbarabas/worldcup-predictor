import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PredictClient from './PredictClient'

export default async function PredictPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [fixturesResult, predictionsResult] = await Promise.all([
    supabase.from('wc_fixtures').select('*').order('match_date').order('match_time').order('match_number'),
    supabase.from('wc_predictions').select('*').eq('user_id', user.id),
  ])

  return (
    <PredictClient
      user={user}
      fixtures={fixturesResult.data ?? []}
      initialPredictions={predictionsResult.data ?? []}
    />
  )
}
