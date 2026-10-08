<template>
  <svg class="loading-moon" viewBox="-24 -24 48 48" aria-hidden="true">
    <circle r="22" class="glow" />
    <circle r="18" class="dark" />
    <path :d="litPath" class="lit" />
    <circle r="18" class="rim" />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { prefersReducedMotion } from "../flight";

// One lunation per cycle. Transparent background, so it sits on any theme.
const CYCLE_MS = 2600;
const R = 18;

/** Lit region of a disk for illuminated fraction k, waxing or waning. */
function phasePath(k: number, waxing: boolean): string {
  const x = R * (1 - 2 * k); // terminator ellipse half-width (signed)
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = (x > 0) === waxing ? 0 : 1;
  return `M0,${-R} A${R},${R} 0 0 ${sweepOuter} 0,${R} A${Math.abs(x)},${R} 0 0 ${sweepInner} 0,${-R} Z`;
}

export default defineComponent({
  name: "LoadingMoon",

  data() {
    return { t: 0.25, raf: 0, start: 0 };
  },

  computed: {
    litPath(): string {
      // t: 0 new → 0.5 full → 1 new. Illumination follows (1 − cos)/2.
      const k = (1 - Math.cos(2 * Math.PI * this.t)) / 2;
      return phasePath(Math.max(0.001, k), this.t < 0.5);
    },
  },

  mounted() {
    if (prefersReducedMotion()) { return; }
    this.start = performance.now();
    const tick = (now: number): void => {
      this.t = ((now - this.start) % CYCLE_MS) / CYCLE_MS;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },

  beforeUnmount() {
    cancelAnimationFrame(this.raf);
  },
});
</script>

<style lang="less">
.loading-moon {
  width: 3.4rem;
  height: 3.4rem;
  overflow: visible;

  .glow { fill: rgba(var(--accent-rgb), 0.08); }
  .dark { fill: #172133; }
  .lit { fill: #e9eef5; }
  .rim { fill: none; stroke: rgba(var(--accent-rgb), 0.55); stroke-width: 0.8; }
}
</style>
