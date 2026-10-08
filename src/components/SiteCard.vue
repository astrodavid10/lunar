<template>
  <article class="site-detail panel" :class="`program-${site.program}`" aria-labelledby="site-detail-title">
    <header class="detail-head">
      <div>
        <p class="detail-kicker">
          <span class="detail-badge">{{ programLabel }}</span>
          <span v-if="site.date">{{ site.date }}</span>
          <span v-if="site.agency"> · {{ site.agency }}</span>
        </p>
        <h2 id="site-detail-title" class="detail-title">{{ site.name }}</h2>
        <p class="detail-crew" v-if="site.crew">{{ site.crew }}</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close site details" @click="$emit('close')">
        <FontAwesomeIcon icon="times" />
      </button>
    </header>

    <div class="detail-images" v-if="images.length">
      <figure v-for="img in images" :key="img.src">
        <a :href="img.link" target="_blank" rel="noopener" :aria-label="`${img.alt} (opens NASA image page)`">
          <img :src="img.src" :alt="img.alt" loading="lazy" />
        </a>
        <figcaption>{{ img.caption }} · {{ img.credit }}</figcaption>
      </figure>
    </div>

    <p class="detail-text">{{ site.description }}</p>

    <div class="detail-look" v-if="site.lookFor">
      <p><strong>What to look for.</strong> {{ site.lookFor }}</p>
      <button
        v-if="layerLabel && !onPreferredLayer"
        type="button"
        class="btn btn-small"
        @click="$emit('show-layer', site.layer)"
      >
        Switch to {{ layerLabel }}
      </button>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Program, Site } from "../data/sites";

const PROGRAM_SINGULAR: Record<Program, string> = {
  apollo: "Apollo",
  robotic: "Robotic lander",
  artemis: "Artemis IV candidate region",
  feature: "Crater or basin",
};
import { layerById } from "../data/layers";

export default defineComponent({
  name: "SiteCard",

  props: {
    site: { type: Object as PropType<Site>, required: true },
    currentLayerId: { type: String, default: "" },
  },

  emits: ["close", "show-layer"],

  computed: {
    programLabel(): string {
      return PROGRAM_SINGULAR[this.site.program];
    },
    images(): { src: string; alt: string; credit: string; link: string; caption: string }[] {
      const out = [];
      if (this.site.photo) { out.push({ ...this.site.photo, caption: "On the surface" }); }
      if (this.site.orbital) { out.push({ ...this.site.orbital, caption: "From orbit (LRO)" }); }
      return out;
    },
    layerLabel(): string {
      return layerById(this.site.layer)?.tabLabel ?? "";
    },
    onPreferredLayer(): boolean {
      return this.site.layer === this.currentLayerId;
    },
  },
});
</script>

<style lang="less">
.site-detail {
  --card-color: var(--feature-color);
  position: absolute;
  right: 0.75rem;
  top: 6.5rem;
  z-index: 25;
  width: min(23rem, calc(100vw - 1.5rem));
  max-height: calc(100% - 12rem);
  overflow-y: auto;
  border-top: 3px solid var(--card-color);

  &.program-apollo { --card-color: var(--apollo-color); }
  &.program-robotic { --card-color: var(--robotic-color); }
  &.program-artemis { --card-color: var(--artemis-color); }
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.detail-kicker {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.detail-badge {
  color: var(--card-color);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 0.3rem;
}

.detail-title {
  margin: 0.1rem 0 0;
  font-size: 1.45rem;
  line-height: 1.15;
}

.detail-crew {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--accent);
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.5rem;
  margin: 0.8rem 0 0.4rem;

  figure { margin: 0; }
  a { display: block; border-radius: 8px; overflow: hidden; }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: #15161b;
  }
  figcaption {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    line-height: 1.3;
    color: var(--text-muted);
  }
}

.detail-text {
  margin: 0.6rem 0;
  font-size: 0.92rem;
  line-height: 1.55;
}

.detail-look {
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  background: rgba(242, 196, 109, 0.08);
  border: 1px solid rgba(242, 196, 109, 0.25);

  p {
    margin: 0 0 0.5rem;
    font-size: 0.88rem;
    line-height: 1.5;
  }
  strong { color: var(--accent); }
}

@media (max-width: 640px) {
  .site-detail {
    top: auto;
    bottom: 4.5rem;
    max-height: 55vh;
  }
}
</style>
