'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/predict" className="flex items-center gap-2 font-bold text-white">
          <span className="text-xl">⚽</span>
          <span className="hidden sm:inline text-sm font-semibold text-slate-200">WC 2026</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/predict"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/predict'
                ? 'bg-green-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Predict
          </Link>
          <Link
            href="/leaderboard"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/leaderboard'
                ? 'bg-green-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🏆 Leaderboard
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/admin'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold text-white">
              {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
