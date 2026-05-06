
export function beep(type: 'tap' | 'boom' | 'tick' | 'win' = 'tap') {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const settings = { tap: [420, 0.035, 0.025], tick: [760, 0.04, 0.018], boom: [95, 0.16, 0.12], win: [620, 0.22, 0.08] } as const;
  const [freq, dur, vol] = settings[type];
  osc.frequency.value = freq; osc.type = type === 'boom' ? 'sawtooth' : 'sine'; gain.gain.value = vol; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur);
}
