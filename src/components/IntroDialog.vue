<template>
  <div class="intro-backdrop" @click.self="$emit('start')">
    <div
      ref="dialog"
      class="intro-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      aria-describedby="intro-story"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <button type="button" class="icon-btn intro-close" aria-label="Close introduction" @click="$emit('start')">
        <FontAwesomeIcon icon="times" />
      </button>

      <header class="intro-head">
        <img :src="lmLogo" alt="" class="intro-mark" aria-hidden="true" />
        <div>
          <p class="intro-kicker">Seven ways to see the Moon</p>
          <h1 id="intro-title" class="intro-title">Moon Maps</h1>
        </div>
      </header>

      <div id="intro-story" class="intro-story">
        <p>Every map here is the whole Moon, made by a different instrument. Some show what your eye would see. Others show height, chemistry or the age of the rock.</p>
        <p>Twelve astronauts and a growing fleet of robots have landed on it. Find their sites, compare the maps, and see what each one reveals.</p>
      </div>

      <ul class="intro-tips">
        <li><span class="tip-icon"><FontAwesomeIcon icon="arrows-alt" /></span>Drag to turn the Moon. Scroll or pinch to zoom.</li>
        <li><span class="tip-icon"><span class="tip-tabs">LRO · Elevation</span></span>Switch maps with the tabs or the ← → keys.</li>
        <li><span class="tip-icon"><FontAwesomeIcon icon="adjust" /></span>Compare blends two maps with a slider.</li>
        <li><span class="tip-icon"><span class="tip-marker"></span></span>Tap a marker on the surface to fly there.</li>
      </ul>

      <div class="intro-actions">
        <button ref="startBtn" type="button" class="btn btn-primary" @click="$emit('start')">
          Start exploring
        </button>
        <button type="button" class="btn btn-secondary" @click="$emit('tour', 'apollo')">
          <FontAwesomeIcon icon="route" /> Take the Apollo tour
        </button>
      </div>

      <footer class="intro-credits">
        <a class="intro-maker" href="https://www.rocketcenter.com/INTUITIVEPlanetarium" target="_blank" rel="noopener">
          <img :src="ipUssrcLogo" alt="INTUITIVE Planetarium at the U.S. Space &amp; Rocket Center" class="maker-logo" />
        </a>
        <p class="intro-author">
          <span class="credit-label">Created by:</span>
          <a href="https://github.com/astrodavid10" target="_blank" rel="noopener">A. David Weigel</a>
        </p>
        <p class="intro-data">
          Maps: NASA Lunar Reconnaissance Orbiter (LROC, LOLA), JAXA SELENE/Kaguya, NASA/DoD Clementine,
          USGS Astrogeology. Craters: Robbins (2019). Maria: LROC (Nelson et al. 2014). Photos: NASA.
        </p>
        <a class="intro-powered" href="https://worldwidetelescope.org" target="_blank" rel="noopener">
          <span class="credit-label">Powered by</span>
          <img :src="wwtLogo" alt="" aria-hidden="true" />
          <span>WorldWide Telescope</span>
        </a>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { trapTab } from "../a11y";
import lmLogo from "../assets/LM-12_w.svg";
import wwtLogo from "../assets/logo_wwt.png";
import ipUssrcLogo from "../assets/ip-ussrc.png";

export default defineComponent({
  name: "IntroDialog",
  emits: ["start", "tour"],

  data() {
    return { lmLogo, wwtLogo, ipUssrcLogo };
  },

  mounted() {
    // Focus the dialog container (standard ARIA dialog pattern); one Tab
    // reaches the first control.
    this.$nextTick(() => (this.$refs.dialog as HTMLElement | undefined)?.focus());
  },

  methods: {
    onKeydown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        this.$emit("start");
        return;
      }
      trapTab(this.$refs.dialog as HTMLElement, ev);
    },
  },
});
</script>

<style lang="less">
.intro-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: radial-gradient(ellipse at 30% 40%, rgba(11, 12, 16, 0.35), rgba(5, 6, 9, 0.82) 70%);
}

.intro-dialog {
  position: relative;
  width: min(36rem, 100%);
  max-height: calc(100% - 1rem);
  overflow-y: auto;
  padding: 1.6rem 1.8rem 1.2rem;
  border-radius: var(--radius-lg);
  background: var(--surface-strong);
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(var(--accent-rgb), 0.08);
  color: var(--text);
  outline: none;

  // Focus lands on the container programmatically; don't paint a ring around the whole dialog.
  &:focus-visible { outline: none; }
}

.intro-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}

.intro-head {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.9rem;
}

.intro-mark {
  width: 3.4rem;
  height: 3.4rem;
  flex-shrink: 0;
}

.intro-kicker {
  margin: 0;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.intro-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 2.8rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.01em;
}

.intro-story p {
  margin: 0 0 0.6rem;
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--text);
}

.intro-tips {
  list-style: none;
  margin: 0.9rem 0 1.1rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 0.45rem;

  li {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .tip-icon {
    display: inline-flex;
    justify-content: center;
    min-width: 5.5rem;
    color: var(--accent);
  }

  .tip-tabs {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    border: 1px solid var(--accent);
    white-space: nowrap;
  }

  .tip-marker {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--apollo-color);
  }
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}

.intro-credits {
  border-top: 1px solid var(--border);
  padding-top: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  text-align: center;

  .credit-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
}

.intro-maker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.6rem;

  .maker-logo {
    display: block;
    width: min(15rem, 70vw);
    height: auto;
  }
}

.intro-author {
  margin: -0.2rem 0 0;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.95rem;

  a {
    color: var(--accent-strong);
    font-weight: 700;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

.intro-data {
  margin: 0;
  max-width: 30rem;
  font-size: 0.74rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.intro-powered {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;

  img { width: 22px; height: 22px; display: block; }
  &:hover span:last-child { text-decoration: underline; }
}

@media (max-width: 520px) {
  .intro-dialog { padding: 1.2rem 1.1rem 1rem; }
  .intro-tips .tip-icon { min-width: 2.2rem; }
  .intro-tips .tip-tabs { display: none; }
  .intro-maker .maker-logo { width: min(12rem, 70vw); }
}
</style>
