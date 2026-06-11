# World Cup 2026 Predictor — Deployment Guide

## What's been set up

- **Supabase project**: St Martins Signup (iynpdchjvajgctthhelj)
  - Tables: `wc_fixtures` (all 72 group stage games), `wc_predictions`, `wc_profiles`
  - Leaderboard view: `wc_leaderboard`
  - All Row Level Security policies in place
  - Auto-profile creation on signup
- **Next.js app**: Full app with auth, predictions, and leaderboard

---

## Step 1: Enable Google Login in Supabase

1. Go to [supabase.com](https://supabase.com) → your project → **Authentication → Providers**
2. Find **Google** and enable it
3. You need a Google OAuth Client ID and Secret:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project (or use existing)
   - Enable the **Google+ API**
   - Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URIs: `https://iynpdchjvajgctthhelj.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret back into Supabase
4. In Supabase → Authentication → URL Configuration, add your Vercel URL to **Site URL** after deployment

---

## Step 2: Deploy to Vercel

### Option A: Deploy via GitHub (recommended)

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Create a new repository (e.g. `worldcup-predictor`)
3. In the `worldcup-predictor` folder, open Terminal/Command Prompt and run:
   ```bash
   cd "path/to/worldcup-predictor"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/worldcup-predictor.git
   git push -u origin main
   ```
4. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
5. Add these environment variables in Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://iynpdchjvajgctthhelj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (from .env.local)
   NEXT_PUBLIC_ADMIN_EMAIL = barrywcleary@gmail.com
   ```
6. Click **Deploy** — Vercel gives you a free URL like `worldcup-predictor.vercel.app`

### Option B: Run locally only

```bash
cd worldcup-predictor
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Step 3: Update Supabase redirect URLs

After getting your Vercel URL:
1. Supabase → Authentication → URL Configuration
2. Set **Site URL** to `https://your-app.vercel.app`
3. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## How the app works

### For players
- Sign in with Google or email/password
- Browse fixtures by group (A–L tabs)
- Enter predicted home and away scores for each match
- Predictions are locked once a match kicks off
- Check the leaderboard to see standings

### For you (admin)
- Sign in with `barrywcleary@gmail.com`
- You'll see an **Admin** link in the nav
- After a match, enter the real score → points are instantly recalculated for all players

### Points system
- ⭐ 3 points — exact score correct
- ✓ 1 point — right result (win/draw/loss) but wrong score
- ✗ 0 points — wrong result

---

## Adding knockouts later

When the group stage is done, you can add knockout fixtures by running SQL in the Supabase dashboard:

```sql
INSERT INTO public.wc_fixtures (match_number, match_date, match_time, home_team, away_team, group_name)
VALUES (73, '2026-07-01', '20:00:00', 'TBC', 'TBC', 'Round of 32');
```

Update team names once they're known, and the prediction/points system works identically.
