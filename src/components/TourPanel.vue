<template>
  <section class="tour-panel panel" aria-labelledby="tour-stop-title">
    <header class="tour-head">
      <p class="tour-kicker">{{ tour.name }} · Stop {{ index + 1 }} of {{ tour.stops.length }}</p>
      <button type="button" class="icon-btn" aria-label="End tour" @click="$emit('exit')">
        <FontAwesomeIcon icon="times" />
      </button>
    </header>
    <h2 id="tour-stop-title" class="tour-title">{{ stop.title }}</h2>

    <div class="tour-beats" aria-live="polite">
      <transition-group name="beat">
        <p v-for="(beat, i) in stop.beats.slice(0, revealed)" :key="`${index}-${i}`" class="tour-beat">{{ beat }}</p>
      </transition-group>
    </div>

    <div class="tour-progress" aria-hidden="true">
      <span v-for="(s, i) in tour.stops" :key="i" class="dot" :class="{ done: i < index, current: i === index }"></span>
    </div>

    <footer class="tour-nav">
      <button type="button" class="btn btn-secondary btn-small" :disabled="index === 0" @click="$emit('step', -1)">
        <FontAwesomeIcon icon="chevron-left" /> Back
      </button>
      <button v-if="revealed < stop.beats.length" type="button" class="btn btn-ghost btn-small" @click="revealAll">
        Show all
      </button>
      <button v-if="index < tour.stops.length - 1" type="button" class="btn btn-primary btn-small" @click="$emit('step', 1)">
        Next <FontAwesomeIcon icon="chevron-right" />
      </button>
      <button v-else type="button" class="btn btn-primary btn-small" @click="$emit('exit')">
        Finish
      </button>
    </footer>
  </section>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import type { Tour, TourStop } from "../data/tours";
import { prefersReducedMotion } from "../flight";

const BEAT_MS = 4200;

export default defineComponent({
  name: "TourPanel",

  props: {
    tour: { type: Object as PropType<Tour>, required: true },
    index: { type: Number, required: true },
    /** False while flying; beats start revealing once the camera arrives. */
    arrived: { type: Boolean, default: true },
  },

  emits: ["step", "exit"],

  data() {
    return {
      revealed: 0,
      timer: 0,
    };
  },

  computed: {
    stop(): TourStop {
      return this.tour.stops[this.index];
    },
  },

  watch: {
    index() { this.restart(); },
    arrived(v: boolean) { if (v) { this.restart(); } },
  },

  mounted() {
    this.restart();
  },

  beforeUnmount() {
    window.clearInterval(this.timer);
  },

  methods: {
    restart(): void {
      window.clearInterval(this.timer);
      if (prefersReducedMotion()) {
        this.revealed = this.stop.beats.length;
        return;
      }
      this.revealed = this.arrived ? 1 : 0;
      if (!this.arrived) { return; }
      this.timer = window.setInterval(() => {
        if (this.revealed >= this.stop.beats.length) {
          window.clearInterval(this.timer);
          return;
        }
        this.revealed += 1;
      }, BEAT_MS);
    },
    revealAll(): void {
      window.clearInterval(this.timer);
      this.revealed = this.stop.beats.length;
    },
  },
});
</script>

<style lang="less">
.tour-panel {
  position: absolute;
  left: 50%;
  bottom: 2.4rem;
  transform: translateX(-50%);
  z-index: 25;
  width: min(34rem, calc(100vw - 1.5rem));
}

.tour-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tour-kicker {
  margin: 0;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tour-title {
  margin: 0.1rem 0 0.5rem;
  font-size: 1.35rem;
  line-height: 1.2;
}

.tour-beats {
  min-height: 4.5rem;
}

.tour-beat {
  margin: 0 0 0.5rem;
  font-size: 0.98rem;
  line-height: 1.55;
}

.beat-enter-active { transition: opacity 0.6s ease, transform 0.6s ease; }
.beat-enter-from { opacity: 0; transform: translateY(6px); }

.tour-progress {
  display: flex;
  gap: 6px;
  margin: 0.4rem 0 0.7rem;

  .dot {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.15);
    &.done { background: rgba(242, 196, 109, 0.5); }
    &.current { background: var(--accent); }
  }
}

.tour-nav {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .tour-panel {
    bottom: 4.4rem;
    max-height: 48vh;
    overflow-y: auto;
  }
  .tour-title { font-size: 1.15rem; }
  .tour-beat { font-size: 0.9rem; }
}
</style>
