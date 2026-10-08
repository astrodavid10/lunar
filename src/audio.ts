// Sound for Moon Maps (audit L18): a short chime per site type, and terrain
// sonification that plays an elevation profile as pitch. Everything is
// synthesized with Web Audio, so there are no sample files to ship.

import type { Program } from "./data/sites";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let profileStop: (() => void) | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") { return null; }
  if (!ctx) {
    const audioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioCtor) { return null; }
    ctx = new audioCtor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") { void ctx.resume(); }
  return { ctx, out: master as GainNode };
}

// Each site type gets its own interval so they're distinguishable without
// looking: Apollo a bright fifth, robotic landers a glassy fourth, Artemis a
// rising major third, craters a low single bell.
const CHIMES: Record<Program, number[]> = {
  apollo: [659.25, 987.77],
  robotic: [783.99, 1046.5],
  artemis: [523.25, 659.25, 783.99],
  feature: [392.0],
};

export function chime(program: Program): void {
  const a = audio();
  if (!a) { return; }
  const now = a.ctx.currentTime;
  CHIMES[program].forEach((freq, i) => {
    const t0 = now + i * 0.07;
    const osc = a.ctx.createOscillator();
    const partial = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    osc.type = "sine";
    partial.type = "sine";
    osc.frequency.value = freq;
    partial.frequency.value = freq * 2.76; // inharmonic partial gives a bell timbre
    const pg = a.ctx.createGain();
    pg.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    osc.connect(g);
    partial.connect(pg).connect(g);
    g.connect(a.out);
    osc.start(t0);
    partial.start(t0);
    osc.stop(t0 + 1);
    partial.stop(t0 + 1);
  });
}

/** Map elevation (m) to frequency: −9 km → 110 Hz, +10.5 km → 1320 Hz, log-spaced. */
export function elevationToHz(m: number): number {
  const t = Math.min(1, Math.max(0, (m + 9000) / 19500));
  return 110 * Math.pow(12, t);
}

export function stopProfile(): void {
  profileStop?.();
  profileStop = null;
}

/**
 * Play an elevation profile as a gliding tone. `onProgress` gets 0–1 on each
 * animation frame so the caller can move a playhead; resolves when finished.
 */
export function playProfile(elevations: number[], durationMs: number, onProgress: (t: number) => void): Promise<void> {
  stopProfile();
  const a = audio();
  if (!a || elevations.length < 2) { return Promise.resolve(); }
  const { ctx: ac, out } = a;
  const t0 = ac.currentTime + 0.05;
  const dur = durationMs / 1000;

  const osc = ac.createOscillator();
  osc.type = "triangle";
  const shimmer = ac.createOscillator();
  shimmer.type = "sine";
  const shimmerGain = ac.createGain();
  shimmerGain.gain.value = 0.25;
  const g = ac.createGain();
  const freqs = new Float32Array(elevations.map(elevationToHz));
  osc.frequency.setValueCurveAtTime(freqs, t0, dur);
  shimmer.frequency.setValueCurveAtTime(freqs.map(f => f * 2), t0, dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.08);
  g.gain.setValueAtTime(0.28, t0 + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  shimmer.connect(shimmerGain).connect(g);
  g.connect(out);
  osc.start(t0);
  shimmer.start(t0);
  osc.stop(t0 + dur + 0.05);
  shimmer.stop(t0 + dur + 0.05);

  return new Promise((resolve) => {
    let raf = 0;
    let done = false;
    const finish = (): void => {
      if (done) { return; }
      done = true;
      cancelAnimationFrame(raf);
      try { osc.stop(); shimmer.stop(); } catch { /* already stopped */ }
      profileStop = null;
      resolve();
    };
    profileStop = finish;
    const tick = (): void => {
      const t = (ac.currentTime - t0) / dur;
      onProgress(Math.min(1, Math.max(0, t)));
      if (t >= 1) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
