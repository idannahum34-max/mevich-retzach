# מביך רצח — Final Vercel Fixed

זו החבילה המעודכנת והנקייה להעלאה ל־GitHub + Vercel.

## תיקון חשוב

נוספו:
- `@types/react`
- `@types/react-dom`
- `@types/node`

זה מתקן את שגיאת Vercel:

`Please install @types/react`

## הרצה מקומית

```bash
npm install
npm run build
npm run dev
```

אם `npm run build` עובר — Vercel אמור לעבור.

## אם כבר יש לך Repo קיים

מחק את הקבצים הישנים או החלף אותם בתוכן החבילה הזאת, ואז:

```bash
git add .
git commit -m "Fix Vercel build and final package"
git push
```

## Vercel Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ENABLE_SUPABASE=true
```

אחרי הוספת ENV ב־Vercel: לעשות Redeploy.

## Supabase

פתח Project חדש, לא את הקיים שלך.

SQL Editor → להריץ:
`supabase/schema.sql`

ואז להפעיל Realtime על:
- rooms
- players

## בדיקה

1. פתח חדר במחשב
2. העתק לינק
3. פתח בטלפון
4. הכנס שם
5. ודא שהשחקן מופיע בלובי
6. התחל משחק
7. ודא שרואים כמה קלפים יש ביד
