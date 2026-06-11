'use client'

import { Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const next = searchParams.get('next') ?? '/predict'

    // createBrowserClient handles PKCE code exchange automatically via
    // detectSessionInUrl (true by default). Calling exchangeCodeForSession
    // manually races with that and causes "PKCE verifier not found" because
    // both paths compete for the same one-time verifier cookie.
    //
    // Instead, subscribe to onAuthStateChange. After initialize() completes it
    // fires INITIAL_SESSION (or SIGNED_IN) with the established session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        subscription.unsubscribe()
        router.replace(next)
      } else if (event === 'INITIAL_SESSION' && !session) {
        subscription.unsubscribe()
        router.replace('/?error=auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-lg">Signing you in…</div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-white text-lg">Signing you in…</div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
