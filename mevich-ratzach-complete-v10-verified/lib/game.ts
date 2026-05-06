
export type Player = { id: string; name: string; score: number; hand: string[]; isHost?: boolean; wins: number; chaos: number; votes: number; reputation: string[] };
export type Submission = { id: string; playerId: string; playerName: string; card: string; votes: number };
export type GamePhase = 'lobby' | 'choose' | 'vote' | 'reveal' | 'end';
export type ChaosEvent = { id: string; title: string; description: string; mode: 'normal' | 'double' | 'democracy' | 'evil' | 'npc' };
export type GameState = { roomId: string; roomName: string; phase: GamePhase; round: number; judgeIndex: number; currentQuestion: string; players: Player[]; submissions: Submission[]; winner?: Submission; selectedPacks: string[]; event?: ChaosEvent | null; secretDrop?: string | null };

export const CHAOS_EVENTS: ChaosEvent[] = [
  { id: 'double', title: 'Double Chaos', description: 'כל שחקן בוחר 2 תשובות. כאוס כפול, אחריות אפס.', mode: 'double' },
  { id: 'democracy', title: 'Democracy Collapse', description: 'כולם מצביעים. השופט מאבד כוח. המדינה מכירה את זה.', mode: 'democracy' },
  { id: 'evil', title: 'Evil Reveal', description: 'השמות נחשפים לפני הבחירה. זה לא הוגן. זה כל הקטע.', mode: 'evil' },
  { id: 'npc', title: 'NPC Round', description: 'כולם חייבים לבחור את הקלף הכי גרוע ביד. לפעמים זה מנצח.', mode: 'npc' },
];

export const ROASTS = [
  'אני מתחיל להבין למה אין לכם קבוצת חברים נוספת.',
  'החדר הזה הוא ראיה משפטית, לא משחק.',
  'המערכת ממליצה טיפול קבוצתי.',
  'זה היה לא חוקי ברמה מוסרית.',
  'מישהו פה צריך למחוק הודעות.',
  'החבורה הזאת לא תשרוד ארוחת חג.',
  'אני מבקש לא להיות מזוהה עם הסיבוב הזה.',
  'היה פה רגע. לא טוב, אבל רגע.',
  'אחד מכם צריך להתנצל, אבל אני לא אגיד מי.',
  'זה בדיוק למה לא נותנים לכם לבחור מוזיקה באוטו.',
];

export function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
export function makeCode() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
export function getGuestId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('mr_guest_id');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('mr_guest_id', id); }
  return id;
}
export function titleForPlayer(player: Player) {
  if (player.wins >= 4) return '👑 משמיד חברויות';
  if (player.chaos >= 7) return '🚨 סכנה לציבור';
  if (player.wins >= 2) return '🔥 מסוכן';
  if (player.votes === 0) return '👻 NPC אנושי';
  return '😶 עדיין נורמלי מדי';
}
