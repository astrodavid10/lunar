<template>
  <section
    ref="panel"
    class="explore-panel panel"
    role="dialog"
    aria-label="Explore the Moon"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <header class="panel-head">
      <div class="seg" role="group" aria-label="Show">
        <button type="button" class="seg-btn" :aria-pressed="view === 'sites'" @click="view = 'sites'">
          <FontAwesomeIcon icon="location-crosshairs" /> Sites
        </button>
        <button type="button" class="seg-btn" :aria-pressed="view === 'tours'" @click="view = 'tours'">
          <FontAwesomeIcon icon="route" /> Tours
        </button>
      </div>
      <button type="button" class="icon-btn" aria-label="Close explore panel" @click="$emit('close')">
        <FontAwesomeIcon icon="times" />
      </button>
    </header>

    <template v-if="view === 'sites'">
      <div class="chips" role="group" aria-label="Show on the map">
        <button
          v-for="p in programs"
          :key="p.id"
          type="button"
          class="chip"
          :class="`chip-${p.id}`"
          :aria-pressed="visiblePrograms.includes(p.id)"
          @click="$emit('toggle-program', p.id)"
        >
          <span class="chip-swatch" aria-hidden="true"></span>{{ p.label }}
        </button>
      </div>

      <label class="search">
        <span class="visually-hidden">Search sites</span>
        <input v-model="query" type="search" placeholder="Search sites, missions, crew…" />
      </label>

      <button type="button" class="whole-moon" @click="$emit('whole-moon')">
        <FontAwesomeIcon icon="globe" /> Whole Moon
      </button>

      <ul class="site-cards" aria-label="Sites">
        <li v-for="site in filtered" :key="site.id">
          <button
            type="button"
            class="site-card"
            :class="[`program-${site.program}`, { active: site.id === selectedId }]"
            :aria-current="site.id === selectedId ? 'true' : undefined"
            @click="$emit('select', site)"
          >
            <span class="card-thumb" :class="{ empty: !thumb(site) }" aria-hidden="true">
              <img v-if="thumb(site)" :src="thumb(site)" alt="" loading="lazy" />
              <span v-else class="thumb-mark"></span>
            </span>
            <span class="card-body">
              <span class="card-title">{{ site.name }}</span>
              <span class="card-meta" v-if="site.date || site.agency">
                {{ [site.date, site.agency].filter(Boolean).join(" · ") }}
              </span>
              <span class="card-summary">{{ site.summary }}</span>
            </span>
          </button>
        </li>
        <li v-if="filtered.length === 0" class="no-results">No sites match.</li>
      </ul>
    </template>

    <template v-else>
      <ul class="tour-list">
        <li v-for="tour in tours" :key="tour.id">
          <button type="button" class="tour-card" @click="$emit('tour', tour.id)">
            <span class="tour-name">{{ tour.name }}</span>
            <span class="tour-tagline">{{ tour.tagline }}</span>
            <span class="tour-meta">{{ tour.stops.length }} stops · about {{ Math.max(2, Math.round(tour.stops.length * 0.6)) }} min</span>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { PROGRAMS, Program, Site, SITES } from "../data/sites";
import { TOURS } from "../data/tours";
import { trapTab } from "../a11y";

export default defineComponent({
  name: "ExplorePanel",

  props: {
    selectedId: { type: String as PropType<string | null>, default: null },
    visiblePrograms: { type: Array as PropType<Program[]>, required: true },
    initialView: { type: String as PropType<"sites" | "tours">, default: "sites" },
  },

  emits: ["close", "select", "toggle-program", "tour", "whole-moon"],

  data() {
    return {
      view: this.initialView as "sites" | "tours",
      query: "",
      programs: PROGRAMS,
      tours: TOURS,
    };
  },

  computed: {
    filtered(): Site[] {
      const q = this.query.trim().toLowerCase();
      return SITES.filter(s => this.visiblePrograms.includes(s.program)).filter(s => {
        if (!q) { return true; }
        return [s.name, s.summary, s.agency, s.crew, s.date].some(v => v?.toLowerCase().includes(q));
      });
    },
  },

  mounted() {
    this.$nextTick(() => (this.$refs.panel as HTMLElement | undefined)?.focus());
  },

  methods: {
    thumb(site: Site): string | undefined {
      return site.photo?.src ?? site.orbital?.src;
    },
    onKeydown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        this.$emit("close");
        return;
      }
      trapTab(this.$refs.panel as HTMLElement, ev);
    },
  },
});
</script>

<style lang="less">
.explore-panel {
  position: absolute;
  left: 0.75rem;
  bottom: 5rem;
  top: 6.5rem;
  z-index: 30;
  width: min(23rem, calc(100vw - 1.5rem));
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  outline: none;
  &:focus-visible { outline: none; }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.seg-btn {
  min-height: 32px;
  padding: 0 0.9rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &[aria-pressed="true"] {
    background: var(--accent);
    color: var(--accent-ink);
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  --chip-color: var(--feature-color);
  min-height: 30px;
  padding: 0 0.7rem 0 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &.chip-apollo { --chip-color: var(--apollo-color); }
  &.chip-robotic { --chip-color: var(--robotic-color); }
  &.chip-artemis { --chip-color: var(--artemis-color); }

  .chip-swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--chip-color);
  }

  &[aria-pressed="true"] {
    color: var(--text);
    border-color: var(--chip-color);
    background: rgba(255, 255, 255, 0.06);
    .chip-swatch { background: var(--chip-color); }
  }
}

.search input {
  width: 100%;
  min-height: 36px;
  padding: 0 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;

  &::placeholder { color: var(--text-muted); opacity: 0.8; }
  &:focus { outline: 2px solid var(--focus); outline-offset: 1px; }
}

.whole-moon {
  align-self: flex-start;
  min-height: 30px;
  padding: 0 0.7rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  &:hover { background: rgba(255, 255, 255, 0.12); }
}

.site-cards,
.tour-list {
  list-style: none;
  margin: 0 -0.25rem 0 0;
  padding: 0 0.25rem 0 0;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.site-card {
  --card-color: var(--feature-color);
  width: 100%;
  display: flex;
  gap: 0.7rem;
  padding: 0.45rem;
  text-align: left;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  border-left: 3px solid var(--card-color);

  &.program-apollo { --card-color: var(--apollo-color); }
  &.program-robotic { --card-color: var(--robotic-color); }
  &.program-artemis { --card-color: var(--artemis-color); }

  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.active {
    background: rgba(242, 196, 109, 0.12);
    border-color: rgba(242, 196, 109, 0.35);
    border-left-color: var(--card-color);
  }
}

.card-thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: #15161b;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-mark {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #d8d3c8, #6f6a61 70%);
    box-shadow: inset -6px -4px 0 rgba(0, 0, 0, 0.35);
  }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.card-title {
  font-weight: 700;
  font-size: 0.98rem;
}

.card-meta {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
}

.card-summary {
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--text-muted);
}

.no-results {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.5rem;
}

.tour-card {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  cursor: pointer;

  &:hover { background: rgba(242, 196, 109, 0.1); border-color: rgba(242, 196, 109, 0.4); }

  .tour-name { font-weight: 700; font-size: 1.05rem; }
  .tour-tagline { color: var(--text-muted); font-size: 0.9rem; }
  .tour-meta { color: var(--accent); font-size: 0.78rem; font-weight: 600; margin-top: 0.2rem; }
}

@media (max-width: 640px) {
  .explore-panel {
    top: auto;
    bottom: 4.5rem;
    max-height: 62vh;
  }
}
</style>
