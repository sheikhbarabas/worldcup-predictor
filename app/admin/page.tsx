import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect('/predict')
  }

  const { data: fixtures } = await supabase
    .from('wc_fixtures')
    .select('*')
    .order('match_date')
    .order('match_time')
    .order('match_number')

  return <AdminClient user={user} fixtures={fixtures ?? []} />
}
