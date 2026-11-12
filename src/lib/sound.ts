/**
 * The bell is synthesised with WebAudio instead of shipping an mp3: one less
 * asset to download, one less file to cache, and it cannot be blocked as a
 * third-party request.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  type WithLegacy = typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as WithLegacy).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** A soft two-note chime. `up` rings for focus completed, down for a break ending. */
export function ringBell(up = true) {
  const ctx = audioContext();
  if (!ctx) return;
  // Browsers suspend the context until a user gesture; resume is a no-op otherwise.
  void ctx.resume();

  const notes = up ? [523.25, 783.99] : [783.99, 523.25];
  notes.forEach((frequency, i) => {
    const start = ctx.currentTime + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 1.2);
  });
}
