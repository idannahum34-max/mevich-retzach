
# Supabase Step-by-Step

## אל תיגע בפרויקט Supabase קיים
פתח Project חדש בשם:
`mevich-ratzach`

## SQL
לך ל:
SQL Editor → New Query

הדבק את:
`supabase/schema.sql`

Run.

## Realtime
לך ל:
Database → Replication / Publications

הפעל Realtime על:
- rooms
- players

## API keys
לך ל:
Project Settings → API

העתק:
- Project URL
- anon public key

## Vercel
Project → Settings → Environment Variables

הוסף:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_ENABLE_SUPABASE=true

## בדיקה
1. פתח חדר מהמחשב.
2. העתק לינק.
3. פתח בטלפון.
4. הכנס שם.
5. בדוק שהוא מופיע בלובי.
