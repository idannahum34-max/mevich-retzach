
'use client';

import { useRouter } from 'next/navigation';
import { PACKS } from '@/lib/packs';
import { makeCode } from '@/lib/game';
import { beep } from '@/lib/sound';

export default function Home() {
  const router = useRouter();
  const questions = Object.values(PACKS).flatMap((p: any) => p.questions).length;
  const answers = Object.values(PACKS).flatMap((p: any) => p.answers).length;

  function createRoom() {
    beep('tap');
    router.push(`/room/${makeCode()}?host=1`);
  }

  return (
    <main className="app">
      <div className="top">
        <div className="logo">מביך <b>רצח</b></div>
        <div className="pill">18+ · V10 Verified</div>
      </div>

      <section className="hero">
        <div className="panel">
          <h1>פתח חדר. שלח לינק. תראה מי הכי מביך בחבורה.</h1>
          <p>משחק party ישראלי 18+ עם חדרים בזמן אמת, סודות, אירועי כאוס, מארח מרושע, סטטיסטיקות ו־Reveal שנועד לשיתוף.</p>
          <div className="kpis">
            <div><b>{questions}</b><span className="small">שאלות</span></div>
            <div><b>{answers}</b><span className="small">תשובות</span></div>
            <div><b>0</b><span className="small">הרשמות</span></div>
          </div>
          <div className="row">
            <button className="btn" onClick={createRoom}>פתח חדר עכשיו</button>
            <a className="btn secondary" href="/room/DEMO?host=1">דמו מהיר</a>
          </div>
          <div className="roast">🤖 “אני מתחיל להבין למה אין לכם קבוצת חברים נוספת.”</div>
        </div>

        <div className="cardHero">
          <div className="tag">קלף שאלה</div>
          <div className="q">מה הדבר הכי ישראלי להגיד לפני שעושים שטות?</div>
          <div><b>מביך רצח</b><br/><span>לא משחק. אירוע חברתי.</span></div>
        </div>
      </section>
    </main>
  );
}
