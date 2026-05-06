
# מביך רצח — V8 Supabase Ready

זו גרסה שמחוברת ל־Supabase Realtime ברמת קוד, עם fallback מקומי אם אין env vars.

## מה יש

- Next.js
- `/room/[code]`
- Lobby
- Host / Guest
- Supabase Realtime hooks
- Local fallback
- Secrets
- Chaos Events
- Roasts
- Reputation
- End-game stats
- Share moments
- Sound + confetti
- Supabase schema

## התקנה

```bash
npm install
npm run dev
```

## Supabase

1. צור Project חדש ב־Supabase.
2. SQL Editor → הרץ `supabase/schema.sql`.
3. Enable Realtime לטבלאות:
   - rooms
   - players
4. העתק `.env.example` ל־`.env.local`.
5. מלא:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ENABLE_SUPABASE=true
```

6. הרץ:

```bash
npm run dev
```

## Vercel

ב־Vercel → Project Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ENABLE_SUPABASE=true`

ואז redeploy.

## הערה חשובה

זה MVP Realtime.
בגרסה רצינית צריך להקשיח RLS ולהסתיר hands בשרת/Edge Functions.
