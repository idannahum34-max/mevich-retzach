
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { PACKS } from '@/lib/packs';
import { beep } from '@/lib/sound';
import { supabase, hasSupabase } from '@/lib/supabase';
import {
  CHAOS_EVENTS, ROASTS, GameState, Player, Submission, getGuestId, shuffle, titleForPlayer
} from '@/lib/game';

const packIds = Object.keys(PACKS);
function allQuestions(selected: string[]) { return selected.flatMap((id) => [...(PACKS as any)[id].questions]); }
function allAnswers(selected: string[]) { return selected.flatMap((id) => [...(PACKS as any)[id].answers]); }

export const EXTRA_HOST_LINES = [
  'החדר הזה התחיל כמשחק ונגמר כראיה.',
  'אני לא אומר שאתם צריכים טיפול קבוצתי, אבל כבר פתחתי לכם קובץ.',
  'מישהו פה יימחק הודעות הלילה.',
  'זה לא ערב חברים. זו חקירה חברתית.',
  'אני מתחיל להבין למה אתם נפגשים רק פעם בחודש.',
  'זה הרגע שבו קבוצת הוואטסאפ משתתקת ל־3 ימים.',
  'אני מקווה שאין פה עורכי דין.',
  'אם זה היה מוקלט, הייתם עוברים דירה.',
];

function uid() { return Math.random().toString(36).slice(2); }

function blankPlayer(id: string, name: string, isHost = false): Player {
  return { id, name, score: 0, hand: [], isHost, wins: 0, chaos: 0, votes: 0, reputation: [] };
}

export default function RoomPage() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code || 'ROOM').toUpperCase();
  const isHostFromUrl = search.get('host') === '1';

  const [joined, setJoined] = useState(false);
  const [guestName, setGuestName] = useState(isHostFromUrl ? 'מארח/ת' : '');
  const [roomName, setRoomName] = useState('ערב כאוס');
  const [selectedPacks, setSelectedPacks] = useState<string[]>(packIds.filter((id) => (PACKS as any)[id].free));
  const [players, setPlayers] = useState<Player[]>([]);
  const [secretInput, setSecretInput] = useState('');
  const [secrets, setSecrets] = useState<string[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [questionDeck, setQuestionDeck] = useState<string[]>([]);
  const [answerDeck, setAnswerDeck] = useState<string[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const myId = typeof window !== 'undefined' ? (isHostFromUrl ? 'host-local' : getGuestId()) : '';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${code}` : `/room/${code}`;

  const totalCards = useMemo(() => ({
    q: selectedPacks.flatMap((id) => [...(PACKS as any)[id].questions]).length,
    a: selectedPacks.flatMap((id) => [...(PACKS as any)[id].answers]).length,
  }), [selectedPacks]);

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      if (isHostFromUrl && players.length === 0) setPlayers([blankPlayer('host-local', 'מארח/ת', true)]);
      return;
    }

    async function initRoom() {
      const { data: existing } = await supabase!.from('rooms').select('*').eq('id', code).maybeSingle();
      if (!existing && isHostFromUrl) {
        await supabase!.from('rooms').insert({
          id: code,
          name: roomName,
          host_id: myId,
          phase: 'lobby',
          game_state: {},
          selected_packs: selectedPacks,
          secrets: []
        });
      }
      await pullRemote();
    }

    async function pullRemote() {
      const { data: room } = await supabase!.from('rooms').select('*').eq('id', code).maybeSingle();
      const { data: playerRows } = await supabase!.from('players').select('*').eq('room_id', code).order('created_at');
      if (room) {
        setRoomName(room.name || 'ערב כאוס');
        setSelectedPacks(room.selected_packs?.length ? room.selected_packs : selectedPacks);
        setSecrets(room.secrets || []);
        if (room.game_state && Object.keys(room.game_state).length) setState(room.game_state as GameState);
      }
      if (playerRows) {
        setPlayers(playerRows.map((p: any) => ({
          id: p.id, name: p.name, score: p.score || 0, hand: p.hand || [], isHost: p.is_host,
          wins: 0, chaos: 0, votes: 0, reputation: []
        })));
      }
    }

    initRoom();
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${code}` }, pullRemote)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${code}` }, pullRemote)
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [code, isHostFromUrl]);

  async function persistRoom(nextState?: GameState) {
    if (!hasSupabase || !supabase) return;
    await supabase.from('rooms').upsert({
      id: code,
      name: roomName,
      host_id: 'host-local',
      phase: nextState?.phase || state?.phase || 'lobby',
      game_state: nextState || state || {},
      selected_packs: selectedPacks,
      secrets,
      updated_at: new Date().toISOString()
    });
  }

  async function persistPlayers(nextPlayers: Player[]) {
    if (!hasSupabase || !supabase) return;
    for (const p of nextPlayers) {
      await supabase.from('players').upsert({
        id: p.id, room_id: code, name: p.name, score: p.score, hand: p.hand, is_host: Boolean(p.isHost), connected: true
      });
    }
  }

  function flash(message: string) { setToast(message); setTimeout(() => setToast(null), 1400); }
  function copyInvite() { beep('tap'); navigator.clipboard.writeText(inviteUrl); flash('הלינק הועתק'); }

  async function joinRoom() {
    beep('tap');
    const name = guestName.trim() || (isHostFromUrl ? 'מארח/ת' : 'שחקן/ית');
    const id = isHostFromUrl ? 'host-local' : getGuestId();
    const newPlayer = blankPlayer(id, name, isHostFromUrl);
    const nextPlayers = players.some((p) => p.id === id) ? players.map((p) => p.id === id ? { ...p, name } : p) : [...players, newPlayer];
    setPlayers(nextPlayers);
    setJoined(true);
    if (hasSupabase && supabase) {
      await supabase.from('players').upsert({ id, room_id: code, name, score: 0, hand: [], is_host: isHostFromUrl, connected: true });
    }
  }

  async function addFakePlayer() {
    beep('tap');
    const names = ['נועה', 'עומר', 'דנה', 'יובל', 'רון', 'מאי', 'גל', 'אורי'];
    const p = blankPlayer(uid(), names[Math.floor(Math.random() * names.length)], false);
    const next = [...players, p];
    setPlayers(next);
    await persistPlayers(next);
  }

  async function addSecret() {
    if (!secretInput.trim()) return;
    beep('tap');
    const next = [...secrets, secretInput.trim()];
    setSecrets(next); setSecretInput(''); flash('הסוד נשמר לחדר');
    if (hasSupabase && supabase) await supabase.from('rooms').upsert({ id: code, name: roomName, secrets: next, selected_packs: selectedPacks, game_state: state || {}, phase: state?.phase || 'lobby' });
  }

  function suspense(message: string, cb: () => void, delay = 550) {
    setOverlay(message); beep('tick');
    setTimeout(() => { setOverlay(null); cb(); }, delay);
  }

  function maybeEvent(round: number) { if (round < 2) return null; return Math.random() < 0.55 ? CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)] : null; }
  function maybeSecret() { if (!secrets.length) return null; return Math.random() < 0.42 ? secrets[Math.floor(Math.random() * secrets.length)] : null; }

  async function startGame() {
    beep('boom');
    const clean = players.filter((p) => p.name.trim());
    if (clean.length < 2) return alert('צריך לפחות 2 שחקנים');

    const answers = shuffle(allAnswers(selectedPacks));
    const questions = shuffle(allQuestions(selectedPacks));
    const withHands = clean.map((p) => ({ ...p, hand: answers.splice(0, 7), score: 0, wins: 0, chaos: 0, votes: 0, reputation: [] }));
    const firstQuestion = questions.pop() || 'מה כבר יכול לקרות?';
    setAnswerDeck(answers); setQuestionDeck(questions); setCurrentPlayerIndex(0);

    suspense('החדר נטען. החברויות בסכנה.', async () => {
      const nextState: GameState = {
        roomId: code, roomName, phase: 'choose', round: 1, judgeIndex: 0, currentQuestion: firstQuestion,
        players: withHands, submissions: [], selectedPacks, event: maybeEvent(1), secretDrop: maybeSecret()
      };
      setState(nextState); await persistPlayers(withHands); await persistRoom(nextState);
    }, 450);
  }

  function drawAnswer(deck: string[], fallback: string[]) {
    const next = [...deck]; if (!next.length) next.push(...shuffle(fallback));
    const card = next.pop()!; setAnswerDeck(next); return card;
  }

  async function saveState(nextState: GameState) {
    setState(nextState);
    await persistRoom(nextState);
    await persistPlayers(nextState.players);
  }

  async function nextRound() {
    if (!state) return;
    const topScore = Math.max(...state.players.map((p) => p.score));
    if (topScore >= 7 || state.round >= 8) {
      const ended = { ...state, phase: 'end' as const };
      await saveState(ended); return;
    }
    const qDeck = [...questionDeck]; if (!qDeck.length) qDeck.push(...shuffle(allQuestions(state.selectedPacks)));
    const q = qDeck.pop()!; setQuestionDeck(qDeck);
    suspense('אני בוחר שאלה בעייתית במיוחד...', async () => {
      const nextState = { ...state, phase: 'choose' as const, round: state.round + 1, judgeIndex: state.round % state.players.length, currentQuestion: q, submissions: [], winner: undefined, event: maybeEvent(state.round + 1), secretDrop: maybeSecret() };
      setCurrentPlayerIndex(0); await saveState(nextState);
    }, 520);
  }

  async function selectCard(cardIndex: number) {
    if (!state) return;
    beep('tap');
    const player = state.players[currentPlayerIndex];
    const newPlayers = [...state.players];
    const newHand = [...player.hand];
    const chosen = newHand.splice(cardIndex, 1)[0];
    newHand.push(drawAnswer(answerDeck, allAnswers(state.selectedPacks)));
    newPlayers[currentPlayerIndex] = { ...player, hand: newHand };
    const submissions = [...state.submissions, { id: uid(), playerId: player.id, playerName: player.name, card: chosen, votes: 0 }];
    const targetSubmissions = state.event?.mode === 'double' ? Math.max(2, (state.players.length - 1) * 2) : state.players.length - 1;
    const nextIndex = currentPlayerIndex + 1;

    if (submissions.length >= targetSubmissions || nextIndex >= state.players.length) {
      suspense('התשובות נאספות. זה לא נראה טוב.', async () => {
        await saveState({ ...state, players: newPlayers, submissions: shuffle(submissions), phase: 'vote' });
      }, 450);
      return;
    }
    setCurrentPlayerIndex(nextIndex);
    await saveState({ ...state, players: newPlayers, submissions });
  }

  async function skipJudge() {
    beep('tap');
    if (!state) return;
    const nextIndex = currentPlayerIndex + 1;
    if (nextIndex >= state.players.length) await saveState({ ...state, phase: 'vote' });
    else setCurrentPlayerIndex(nextIndex);
  }

  async function chooseWinner(submission: Submission) {
    if (!state) return;
    beep('win');
    const nextPlayers = state.players.map((p) => {
      if (p.id !== submission.playerId) return p;
      const wins = p.wins + 1; const chaos = p.chaos + (state.event ? 2 : 1);
      const reputation = [...p.reputation];
      if (wins >= 1) reputation.push('🔥 מסוכן'); if (chaos >= 4) reputation.push('🚨 סכנה לציבור'); if (wins >= 3) reputation.push('👑 משמיד חברויות');
      return { ...p, score: p.score + 1, wins, chaos, reputation };
    });
    const nextState = { ...state, players: nextPlayers, phase: 'reveal' as const, winner: submission };
    await saveState(nextState);
    confetti({ particleCount: 80, spread: 68, origin: { y: 0.65 } });
  }

  function shareMoment() {
    if (!state?.winner) return;
    beep('tap');
    const text = `מביך רצח 😂\\n${state.currentQuestion}\\n${state.winner.card}\\n— ${state.winner.playerName}`;
    if (navigator.share) navigator.share({ title: 'מביך רצח', text });
    else { navigator.clipboard.writeText(text); flash('הרגע הועתק'); }
  }

  function renderEnd() {
    if (!state) return null;
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    const chaosKing = [...state.players].sort((a, b) => b.chaos - a.chaos)[0] || ranked[0];
    const npc = [...state.players].sort((a, b) => a.score - b.score)[0] || ranked[ranked.length - 1];
    return (
      <>
        <h1 style={{ fontSize: 46 }}>המשחק נגמר 🏆</h1>
        <div className="shareBox revealAnim"><div className="big">{ranked[0].name} ניצח/ה</div><p style={{ color: '#111' }}>והרס/ה לפחות שתי חברויות בדרך.</p></div>
        <div className="roast">🤖 {ROASTS[Math.floor(Math.random() * ROASTS.length)]}</div>
        <h2>סטטיסטיקות חדר</h2>
        <div className="statsGrid">
          <div className="secretBox"><h3>🔥 הכי מסוכן</h3><p>{chaosKing.name}</p></div>
          <div className="secretBox"><h3>👻 NPC אנושי</h3><p>{npc.name}</p></div>
          <div className="secretBox"><h3>😬 קרינג׳ מקצועי</h3><p>{ranked[Math.floor(Math.random() * ranked.length)].name}</p></div>
          <div className="secretBox"><h3>🚨 סכנה לציבור</h3><p>{ranked[Math.floor(Math.random() * ranked.length)].name}</p></div><div className="secretBox"><h3>💀 לא להזמין לחתונות</h3><p>{ranked[Math.floor(Math.random() * ranked.length)].name}</p></div><div className="secretBox"><h3>🚩 דגל אדום מהלך</h3><p>{ranked[Math.floor(Math.random() * ranked.length)].name}</p></div>
        </div>
        <h2 style={{ marginTop: 22 }}>Reputation</h2>
        <div>{ranked.map((p) => <span key={p.id} className="badge">{p.name}: {titleForPlayer(p)}</span>)}</div>
        <div className="row" style={{ marginTop: 18 }}><button className="btn good" onClick={() => location.reload()}>משחק חדש</button><button className="btn secondary" onClick={shareMoment}>שתף</button></div>
      </>
    );
  }

  if (state) {
    const current = state.players[currentPlayerIndex];
    const isJudgeTurn = currentPlayerIndex === state.judgeIndex;
    const judge = state.players[state.judgeIndex];
    const roast = ROASTS[(state.round + state.players.length) % ROASTS.length];

    return (
      <main className="app">
        {overlay && <div className="overlay"><div className="overlayBox pulse"><h2>{overlay}</h2><p>אני לא אומר שזה ייגמר רע. אני רק אומר שהתחלנו.</p></div></div>}
        {toast && <div className="toast">{toast}</div>}
        <div className="top"><div className="logo">מביך <b>רצח</b></div><div className="pill">חדר {code} · {hasSupabase ? 'Realtime מחובר' : 'Local mode'}</div></div>
        <section className="gameGrid">
          <aside>
            <div className="question">
              <div><div className="tag">סיבוב {state.round} · שופט/ת: {judge?.name}</div><div className="text">{state.currentQuestion}</div></div>
              <div><b>{state.phase === 'choose' ? 'בחירת תשובות' : state.phase === 'vote' ? 'הצבעה' : state.phase === 'reveal' ? 'Reveal' : 'Chaos Complete'}</b><p>{state.event ? state.event.title : 'סיבוב רגיל. לכאורה.'}</p></div>
            </div>
            <div className="players">{state.players.map((p, i) => <div key={p.id} className="player"><span>{p.name} {i === state.judgeIndex ? '👑' : ''}</span><span className="score">{p.score}</span></div>)}</div>
            <div style={{ marginTop: 12 }}>{current && state.phase === 'choose' && <span className="badge">🃏 {current.hand.length} קלפים ביד</span>}{state.players.map((p) => <span key={p.id} className="badge">{p.name}: {titleForPlayer(p)}</span>)}</div>
          </aside>
          <section className="panel">
            {state.event && state.phase !== 'end' && <div className="event"><b>⚡ Chaos Event: {state.event.title}</b><p>{state.event.description}</p></div>}
            {state.secretDrop && state.phase === 'choose' && <div className="event"><b>🤫 Secret Drop</b><p>{state.secretDrop}</p></div>}
            {state.phase === 'choose' && current && (isJudgeTurn ? (
              <><h2>{current.name} הוא/היא השופט/ת 👑</h2><p>השופט מחכה. סמכות מוחלטת, אפס אחריות.</p><button className="btn" onClick={skipJudge}>הבא</button></>
            ) : (
              <><h2>תור של {current.name}</h2><p>{state.event?.mode === 'npc' ? 'יש לך {current.hand.length} קלפים ביד · בחר/י את הקלף הכי גרוע. כן, בכוונה.' : 'יש לך {current.hand.length} קלפים ביד · בחר/י קלף אחד. לא לחשוב יותר מדי — הקרינג׳ אוהב מהירות.'}</p><div className="hand">{current.hand.map((card, i) => <button key={i} className="answer" onClick={() => selectCard(i)}>{card}</button>)}</div></>
            ))}
            {state.phase === 'vote' && (
              <><h2>{state.event?.mode === 'democracy' ? 'הצבעה קבוצתית' : `${judge.name}, לבחור מנצח/ת`}</h2><p>{state.event?.mode === 'evil' ? 'השמות גלויים. לא הוגן. מצוין.' : 'התשובות אנונימיות עד ה־Reveal.'}</p><div className="subs">{state.submissions.map((s) => <button key={s.id} className="answer" onClick={() => chooseWinner(s)}>{s.card}{state.event?.mode === 'evil' && <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>{s.playerName}</div>}</button>)}</div></>
            )}
            {state.phase === 'reveal' && state.winner && (
              <><h2 className="pop">המנצח/ת: {state.winner.playerName} 🔥</h2><div className="shareBox revealAnim"><div className="small" style={{ color: '#555' }}>מביך רצח · {state.roomName}</div><div className="big">{state.currentQuestion}</div><p style={{ color: '#111', fontSize: 22, fontWeight: 1000 }}>{state.winner.card}</p><b>{state.winner.playerName} ניצח/ה</b></div><div className="roast">🤖 {roast}</div><div className="row"><button className="btn good" onClick={shareMoment}>שתף רגע</button><button className="btn" onClick={nextRound}>סיבוב הבא</button></div><h2 style={{ marginTop: 22 }}>כל התשובות</h2><div className="subs">{state.submissions.map((s) => <div key={s.id} className="answer">{s.card}<div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>{s.playerName}</div></div>)}</div></>
            )}
            {state.phase === 'end' && renderEnd()}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}
      <div className="top"><div className="logo">מביך <b>רצח</b></div><div className="pill">18+ · חדר {code} · {hasSupabase ? 'Realtime ready' : 'Local fallback'}</div></div>
      <section className="lobbyGrid">
        <div className="panel">
          <h1 style={{ fontSize: 48 }}>Lobby</h1>
          <p>משחק שיגרום לכם להבין למה יש קבוצות שנפגשות רק פעם בשנה. {hasSupabase ? 'Supabase פעיל.' : 'כרגע בלי Supabase — עובד במצב מקומי.'}</p>
          {!joined && <div className="notice" style={{ marginBottom: 14 }}><b>כניסה מהירה</b><input className="input" placeholder="השם שלך" value={guestName} onChange={(e) => setGuestName(e.target.value)} /><button className="btn good" onClick={joinRoom}>היכנס לחדר</button></div>}
          {isHostFromUrl && (
            <>
              <h2>הגדרות Host</h2><input className="input" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
              <h2>חבילות</h2>
              <div className="packGrid">{packIds.map((id) => { const pack = (PACKS as any)[id]; const active = selectedPacks.includes(id); return <div key={id} className={`pack ${active ? 'active' : ''} ${!pack.free ? 'locked' : ''}`} onClick={() => { beep('tap'); setSelectedPacks(active ? selectedPacks.filter((x) => x !== id) : [...selectedPacks, id]); }}><div className="emoji">{pack.emoji}</div><b>{pack.name}</b><p className="identity">{pack.tagline}</p></div>; })}</div>
              <h2 style={{ marginTop: 18 }}>סודות החבורה</h2><p>כל סוד יכול לקפוץ בזמן המשחק. זה מה שהופך את זה לאישי.</p>
              <div className="row"><input className="input" style={{ flex: 1, minWidth: 220 }} placeholder="סוד קטן ומביך..." value={secretInput} onChange={(e) => setSecretInput(e.target.value)} /><button className="btn secondary" onClick={addSecret}>הוסף סוד</button></div>
              <div style={{ marginTop: 8 }}>{secrets.map((s, i) => <span key={i} className="badge">🤫 סוד #{i + 1}</span>)}</div>
            </>
          )}
          <h2 style={{ marginTop: 18 }}>שחקנים בחדר</h2>
          <div className="players">{players.map((p) => <div key={p.id} className="player"><span>{p.name} {p.isHost ? '👑' : ''}</span><span className="small">{p.isHost ? 'Host' : 'Guest'}</span></div>)}</div>
          {isHostFromUrl && <div className="row" style={{ marginTop: 16 }}><button className="btn secondary" onClick={addFakePlayer}>+ שחקן דמו</button><button className="btn good" onClick={startGame}>התחל משחק</button></div>}
        </div>
        <aside className="codeBox">
          <div className="small" style={{ color: '#555' }}>קוד חדר</div><div className="code">{code}</div><p style={{ color: '#111' }}>שלח את הלינק לחברים</p><button className="copy" onClick={copyInvite}>העתק לינק</button><p style={{ color: '#555', fontSize: 13, wordBreak: 'break-all' }}>{inviteUrl}</p><div style={{ marginTop: 18, color: '#111' }}><b>{totalCards.q}</b> שאלות · <b>{totalCards.a}</b> תשובות</div>
        </aside>
      </section>
    </main>
  );
}
