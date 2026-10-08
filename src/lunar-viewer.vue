<template>
  <div id="main-content" :class="{ 'kiosk-ui': kioskMode, attract: attractMode }">
    <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>

    <SurfaceOverlay
      v-if="mapsLoaded"
      ref="overlay"
      :sites="visibleSites"
      :selected-id="selectedSiteId"
      :show-labels="showLabels"
      :show-maria="showMaria"
      :show-craters="showCraters"
      :subsolar="subsolar"
      :listen-mode="listenOpen"
      :profile="profile"
      :playhead="playhead"
      :hud-visible="!isLoading && !attractMode && !(isNarrow && dockOpen)"
      @select="onMarkerSelect"
      @hover="onMarkerHover"
      @listen-line="onListenLine"
    />

    <!-- Loading / boot error (audit L4, E3) -->
    <transition name="fade">
      <div class="modal" id="modal-loading" v-show="isLoading || bootError">
        <div class="loading-box" v-if="!bootError" role="status">
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading the Moon…</p>
        </div>
        <div class="boot-error" v-else role="alert">
          <h2>The Moon maps couldn't be loaded</h2>
          <p>{{ bootError }}</p>
          <button v-if="bootRetryable" type="button" class="btn btn-primary" @click="retryBoot">Try again</button>
          <p v-if="bootRetryInS" class="boot-auto">Trying again automatically in {{ bootRetryInS }} seconds.</p>
        </div>
      </div>
    </transition>

    <template v-if="!isLoading">
      <!-- Title chip (L6): persistent name of the app + current map -->
      <button type="button" class="title-chip" @click="openIntro" aria-label="About Moon Maps">
        <img :src="lmLogo" alt="" aria-hidden="true" />
        <span class="title-text">
          <span class="title-name">Moon Maps</span>
          <span class="title-map">{{ currentLayer?.displayName ?? shortName(currentMapName) }}</span>
        </span>
      </button>

      <!-- Layer tabs (L13, L15): named, ≥ 24 px targets -->
      <nav class="layer-bar" aria-label="Moon maps">
        <button type="button" class="icon-btn layer-step" aria-label="Previous map" @click="moveLeft">
          <FontAwesomeIcon icon="chevron-left" />
        </button>
        <div class="layer-tabs" role="group" aria-label="Choose a map">
          <button
            v-for="(name, i) in planetaryMaps"
            :key="name"
            type="button"
            class="layer-tab"
            :aria-pressed="i === curMapIndex"
            :title="shortName(name)"
            @click="switchToMap(i)"
          >
            {{ layerByName(name)?.tabLabel ?? shortName(name) }}
          </button>
        </div>
        <span class="layer-current" aria-hidden="true">{{ currentLayer?.tabLabel ?? shortName(currentMapName) }}</span>
        <button type="button" class="icon-btn layer-step" aria-label="Next map" @click="moveRight">
          <FontAwesomeIcon icon="chevron-right" />
        </button>
      </nav>
      <p class="layer-caption" aria-live="polite">
        <span v-if="!compareOpen">{{ currentLayer?.caption }}</span>
        <span v-else-if="comparePromptText">{{ comparePromptText }}</span>
        <span v-else>Drag the slider to blend {{ compareLayer?.tabLabel }} and {{ currentLayer?.tabLabel }}.</span>
      </p>

      <!-- Right-side tools (L15: real buttons with names) -->
      <div class="tools" role="toolbar" aria-label="Map tools" aria-orientation="vertical">
        <button type="button" class="icon-btn" aria-label="Zoom in" title="Zoom in" @click="zoomBy(1 / 1.5)">
          <FontAwesomeIcon icon="magnifying-glass-plus" />
        </button>
        <button type="button" class="icon-btn" aria-label="Zoom out" title="Zoom out" @click="zoomBy(1.5)">
          <FontAwesomeIcon icon="magnifying-glass-minus" />
        </button>
        <span class="tools-sep" aria-hidden="true"></span>
        <button type="button" class="icon-btn" :aria-pressed="compareOpen" aria-label="Compare two maps" title="Compare two maps"
                :disabled="planetaryMaps.length < 2" @click="toggleCompare">
          <FontAwesomeIcon icon="adjust" />
        </button>
        <div class="overlays-anchor">
          <button type="button" class="icon-btn" :class="{ 'has-active': overlayCount > 0 }" :aria-expanded="overlaysOpen"
                  aria-controls="overlays-menu" aria-label="Map overlays" title="Map overlays" @click="overlaysOpen = !overlaysOpen">
            <FontAwesomeIcon icon="layer-group" />
            <span v-if="overlayCount" class="badge" aria-hidden="true">{{ overlayCount }}</span>
          </button>
          <transition name="rise">
            <div v-if="overlaysOpen" id="overlays-menu" class="overlays-menu panel" role="group" aria-label="Map overlays"
                 @keydown.esc.stop="overlaysOpen = false">
              <button type="button" role="switch" class="overlay-switch" :aria-checked="showMaria" @click="showMaria = !showMaria">
                <span class="sw" aria-hidden="true"></span>
                <span class="sw-text"><b>Maria</b><small>Where ancient lava flooded the basins</small></span>
                <span class="sw-key key-maria" aria-hidden="true"></span>
              </button>
              <button type="button" role="switch" class="overlay-switch" :aria-checked="showCraters" @click="showCraters = !showCraters">
                <span class="sw" aria-hidden="true"></span>
                <span class="sw-text"><b>Craters</b><small>1.3 million rims, sharper as you zoom in</small></span>
                <span class="sw-key key-craters" aria-hidden="true"></span>
              </button>
              <button type="button" role="switch" class="overlay-switch" :aria-checked="showLabels" @click="showLabels = !showLabels">
                <span class="sw" aria-hidden="true"></span>
                <span class="sw-text"><b>Names &amp; grid</b><small>Seas, craters and latitude lines</small></span>
                <span class="sw-key key-grid" aria-hidden="true"></span>
              </button>
              <p class="overlay-credit">
                Maria: LROC (Nelson et al. 2014). Craters: Robbins (2019) lunar crater database.
              </p>
            </div>
          </transition>
        </div>
        <button type="button" class="icon-btn" :aria-pressed="tonightOpen" aria-label="Tonight's Moon: sunlight and phase" title="Tonight's Moon"
                @click="toggleTonight">
          <FontAwesomeIcon icon="moon" />
        </button>
        <button type="button" class="icon-btn" :aria-pressed="listenOpen" aria-label="Listen to the terrain" title="Listen to the terrain"
                @click="toggleListen">
          <FontAwesomeIcon icon="headphones" />
        </button>
        <button type="button" class="icon-btn" :aria-pressed="soundOn" :aria-label="soundOn ? 'Turn site sounds off' : 'Turn site sounds on'"
                :title="soundOn ? 'Site sounds on' : 'Site sounds off'" @click="soundOn = !soundOn">
          <FontAwesomeIcon :icon="soundOn ? 'volume-high' : 'volume-xmark'" />
        </button>
        <span class="tools-sep" aria-hidden="true"></span>
        <button type="button" class="icon-btn" aria-label="About this map" title="About this map" @click="showLayerInfo = true">
          <FontAwesomeIcon icon="circle-info" />
        </button>
        <button type="button" class="icon-btn" aria-label="Help" title="Help" @click="showHelp = true">
          <FontAwesomeIcon icon="question-circle" />
        </button>
        <button v-if="kioskMode" type="button" class="icon-btn" aria-label="Take this view home" title="Take this view home" @click="openTakeHome">
          <FontAwesomeIcon icon="qrcode" />
        </button>
      </div>

      <!-- Bottom-left launchers -->
      <div class="launchers">
        <button type="button" class="btn launcher" :aria-pressed="explorePanel === 'sites'" @click="openExplore('sites')">
          <FontAwesomeIcon icon="rocket" /> Explore
        </button>
        <button type="button" class="btn launcher" :aria-pressed="explorePanel === 'tours'" @click="openExplore('tours')">
          <FontAwesomeIcon icon="route" /> Tours
        </button>
        <button v-if="prevMapIndex >= 0 && !compareOpen" type="button" class="icon-btn launcher-icon"
                :aria-label="`Back to ${shortName(planetaryMaps[prevMapIndex])}`" :title="`Back to ${shortName(planetaryMaps[prevMapIndex])}`"
                @click="goToPrevious">
          <FontAwesomeIcon icon="rotate-left" />
        </button>
      </div>

      <transition name="rise">
        <ExplorePanel
          v-if="explorePanel"
          :key="explorePanel"
          :initial-view="explorePanel"
          :selected-id="selectedSiteId"
          :visible-programs="visiblePrograms"
          @close="closeExplore"
          @select="onCardSelect"
          @toggle-program="toggleProgram"
          @tour="startTour"
          @whole-moon="flyWholeMoon"
        />
      </transition>

      <transition name="rise">
        <SiteCard
          v-if="selectedSite && !tour"
          :key="selectedSite.id"
          :site="selectedSite"
          :current-layer-id="currentLayer?.id ?? ''"
          @close="selectedSiteId = null"
          @show-layer="switchToLayerId"
        />
      </transition>

      <!-- Bottom-center dock: compare, tonight, listen, tour -->
      <div class="dock">
        <transition name="rise">
          <TourPanel
            v-if="tour"
            :tour="tour.def"
            :index="tour.index"
            :arrived="tourArrived"
            @step="stepTour"
            @exit="exitTour"
          />
        </transition>

        <transition name="rise">
          <section v-if="compareOpen" class="dock-panel panel compare-panel" aria-label="Compare maps">
            <label class="cmp-pick">
              <span class="visually-hidden">Map to compare with</span>
              <select :value="compareIndex" @change="setCompareIndex(Number(($event.target as HTMLSelectElement).value))">
                <option v-for="(name, i) in planetaryMaps" :key="name" :value="i" :disabled="i === curMapIndex">
                  {{ layerByName(name)?.tabLabel ?? shortName(name) }}
                </option>
              </select>
            </label>
            <input
              type="range"
              class="cmp-range"
              min="0"
              max="100"
              v-model.number="manualOpacity"
              @input="applyManualOpacity"
              :aria-label="`Blend from ${compareLayer?.tabLabel} to ${currentLayer?.tabLabel}`"
              :aria-valuetext="`${manualOpacity}% ${currentLayer?.tabLabel}`"
            />
            <span class="cmp-label">{{ currentLayer?.tabLabel ?? shortName(currentMapName) }}</span>
            <button type="button" class="icon-btn" aria-label="Close compare" @click="toggleCompare">
              <FontAwesomeIcon icon="times" />
            </button>
          </section>
        </transition>

        <transition name="rise">
          <section v-if="tonightOpen && lighting" class="dock-panel panel tonight-panel" aria-label="Tonight's Moon">
            <div class="tonight-phase">
              <svg viewBox="-20 -20 40 40" class="phase-icon" aria-hidden="true">
                <circle r="18" fill="#2a2b31" />
                <path :d="phasePath" fill="#e8e4da" />
              </svg>
              <div>
                <p class="tonight-name">{{ lighting.phaseName }}</p>
                <p class="tonight-meta">{{ Math.round(lighting.illuminated * 100) }}% lit · {{ tonightDateLabel }}</p>
              </div>
            </div>
            <div class="tonight-controls">
              <button type="button" class="icon-btn" :aria-label="tonightPlaying ? 'Pause the lunar month' : 'Play a lunar month'"
                      @click="toggleTonightPlay">
                <FontAwesomeIcon :icon="tonightPlaying ? 'pause' : 'play'" />
              </button>
              <input
                type="range"
                class="tonight-range"
                min="-15"
                max="15"
                step="0.25"
                v-model.number="tonightOffsetDays"
                aria-label="Days from today"
                :aria-valuetext="tonightDateLabel"
              />
              <button type="button" class="btn btn-small btn-ghost" @click="tonightOffsetDays = 0">Today</button>
              <button type="button" class="icon-btn" aria-label="Close tonight's Moon" @click="toggleTonight">
                <FontAwesomeIcon icon="times" />
              </button>
            </div>
          </section>
        </transition>

        <transition name="rise">
          <section v-if="listenOpen" class="dock-panel panel listen-panel" aria-label="Listen to the terrain">
            <div class="listen-head">
              <p class="listen-hint" v-if="!profile">
                Drag a line across the Moon to hear its shape. Higher ground plays a higher note.
              </p>
              <div class="listen-chart" v-else>
                <svg :viewBox="`0 0 ${chart.w} ${chart.h}`" preserveAspectRatio="none" aria-hidden="true">
                  <path :d="chart.area" class="chart-area" />
                  <path :d="chart.line" class="chart-line" />
                  <line v-if="playhead >= 0" :x1="playhead * chart.w" :x2="playhead * chart.w" y1="0" :y2="chart.h" class="chart-head" />
                </svg>
                <p class="listen-stats">{{ profileSummary }}</p>
              </div>
              <button type="button" class="icon-btn" aria-label="Close listen tool" @click="toggleListen">
                <FontAwesomeIcon icon="times" />
              </button>
            </div>
            <div class="listen-actions">
              <button type="button" class="btn btn-small btn-secondary" @click="listenAcrossView">
                <FontAwesomeIcon icon="arrows-alt" /> Across the view
              </button>
              <button v-if="profile" type="button" class="btn btn-small btn-primary" @click="playCurrentProfile">
                <FontAwesomeIcon icon="play" /> Play again
              </button>
            </div>
            <p class="listen-msg" v-if="listenMessage" role="status">{{ listenMessage }}</p>
          </section>
        </transition>
      </div>

      <!-- Legends: both while comparing (L12) -->
      <div class="legends" v-if="legends.length && !(isNarrow && dockOpen)">
        <figure v-for="l in legends" :key="l.src" class="legend">
          <figcaption>{{ l.label }}</figcaption>
          <img :src="l.src" :alt="l.alt" />
        </figure>
      </div>

      <!-- Attract-loop caption (kiosk) -->
      <transition name="fade">
        <div v-if="attractMode" class="attract-caption" aria-hidden="true">
          <p class="attract-name" v-if="attractSite">{{ attractSite.name }}</p>
          <p class="attract-summary" v-if="attractSite">{{ attractSite.summary }}</p>
          <p class="attract-cta">Touch anywhere to explore the Moon</p>
        </div>
      </transition>

      <div class="credits">
        <span>Powered by</span>
        <a href="https://worldwidetelescope.org" target="_blank" rel="noopener" aria-label="WorldWide Telescope">
          <img alt="WorldWide Telescope" :src="wwtLogo" />
        </a>
      </div>
    </template>

    <!-- Layer info (focus-managed dialog) -->
    <transition name="fade">
      <div class="overlay-backdrop" v-if="showLayerInfo" @click.self="showLayerInfo = false">
        <div ref="infoDialog" class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="info-title" tabindex="-1"
             @keydown="dialogKeydown($event, 'showLayerInfo')">
          <button type="button" class="icon-btn dialog-close" aria-label="Close" @click="showLayerInfo = false">
            <FontAwesomeIcon icon="times" />
          </button>
          <h2 id="info-title">{{ currentLayer?.displayName ?? shortName(currentMapName) }}</h2>
          <p class="info-caption">{{ currentLayer?.caption }}</p>
          <p>{{ currentLayer?.description }}</p>
          <img v-if="currentLayer?.legendSrc" :src="currentLayer.legendSrc" :alt="currentLayer.legendAlt" class="info-legend" />
          <p class="info-credit" v-if="currentLayer">Credit: {{ currentLayer.credit }}</p>
        </div>
      </div>
    </transition>

    <!-- Help -->
    <transition name="fade">
      <div class="overlay-backdrop" v-if="showHelp" @click.self="showHelp = false">
        <div ref="helpDialog" class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1"
             @keydown="dialogKeydown($event, 'showHelp')">
          <button type="button" class="icon-btn dialog-close" aria-label="Close help" @click="showHelp = false">
            <FontAwesomeIcon icon="times" />
          </button>
          <h2 id="help-title">How to explore</h2>
          <dl class="help-list">
            <div><dt><FontAwesomeIcon icon="arrows-alt" /></dt><dd>Drag to turn the Moon. Scroll, pinch, or use + and − to zoom.</dd></div>
            <div><dt>← →</dt><dd>Step through the maps with the tabs at the top or the arrow keys.</dd></div>
            <div><dt><FontAwesomeIcon icon="rocket" /></dt><dd><b>Explore</b> lists every site. Tap one, or a marker on the surface, to fly there.</dd></div>
            <div><dt><FontAwesomeIcon icon="route" /></dt><dd><b>Tours</b> tell the story of Apollo, the south pole, and the Moon's impacts.</dd></div>
            <div><dt><FontAwesomeIcon icon="adjust" /></dt><dd><b>Compare</b> blends two maps with a slider.</dd></div>
            <div><dt><FontAwesomeIcon icon="layer-group" /></dt><dd><b>Overlays</b> outline the dark lava seas (maria), draw 1.3 million crater rims, and label features with a latitude grid. With craters on, the panel at the bottom right counts how crowded the ground is: more craters means older ground.</dd></div>
            <div><dt><FontAwesomeIcon icon="moon" /></dt><dd><b>Tonight's Moon</b> shows where the Sun is shining today, and lets you play a whole month.</dd></div>
            <div><dt><FontAwesomeIcon icon="headphones" /></dt><dd><b>Listen</b> turns the height of the ground along a line into sound.</dd></div>
            <div><dt>Esc</dt><dd>Closes the topmost panel.</dd></div>
          </dl>
          <div class="help-legend" aria-label="Marker key">
            <span class="key key-apollo">Apollo</span>
            <span class="key key-robotic">Robotic lander</span>
            <span class="key key-artemis">Artemis IV region</span>
            <span class="key key-feature">Crater or basin</span>
          </div>
        </div>
      </div>
    </transition>

    <IntroDialog v-if="showIntro && !isLoading && !attractMode" @start="closeIntro" @tour="startTourFromIntro" />

    <KioskQrModal v-if="qr" :url="qr.url" :title="qr.title" :auto-close-ms="qrAutoCloseMs" @close="qr = null" />
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from "vue";
import { WWTAwareComponent } from "@wwtelescope/engine-pinia";
import { WWTControl, Imageset } from "@wwtelescope/engine";

import SurfaceOverlay from "./components/SurfaceOverlay.vue";
import IntroDialog from "./components/IntroDialog.vue";
import ExplorePanel from "./components/ExplorePanel.vue";
import SiteCard from "./components/SiteCard.vue";
import TourPanel from "./components/TourPanel.vue";
import KioskQrModal from "./KioskQrModal.vue";

import { LAYER_META, LayerMeta, DEFAULT_LAYER_ID, layerById, layerByName, comparePrompt } from "./data/layers";
import { SITES, Site, Program, PROGRAMS, siteById } from "./data/sites";
import { Tour, tourById } from "./data/tours";
import { flyTo, cancelFlight, prefersReducedMotion } from "./flight";
import { wwtControl } from "./globe";
import { moonLighting, MoonLighting } from "./ephemeris";
import { loadElevation, elevationProfile, ProfileSample } from "./elevation";
import { chime, playProfile, stopProfile } from "./audio";
import { trapTab, isEditableTarget } from "./a11y";
import { withTimeout, hasWebGL, describeBootError, scheduleKioskRetry, markBootSucceeded } from "./boot";
import {
  createIdleWatcher, installKioskGuards, scheduleDailyReload,
  KIOSK_IDLE_MS, KIOSK_ATTRACT_DWELL_MS, KIOSK_QR_AUTOCLOSE_MS, KIOSK_RELOAD_HOUR, IdleWatcher,
} from "./kiosk";
import { statsInit, statsSessionStart, statsSessionEnd, statsTrack } from "./kioskStats";
import { boolParam, stringParam } from "./urlParams";

import lmLogo from "./assets/LM-12_w.svg";
import wwtLogo from "./assets/logo_wwt.png";

const MOON_WTML_URL = "https://web.wwtassets.org/kiosk/2022/moon/moon_maps_v4.wtml";
const CROSSFADE_MS = 700;
// Whole-disk view. WWT's zoom is a vertical field of view, so on portrait
// screens it has to grow for the disk to fit the width.
function wholeMoon(): { lat: number; lon: number; zoomDeg: number } {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return { lat: 0, lon: 0, zoomDeg: Math.min(330, 118 * h / Math.min(w, h)) };
}
// Sites the kiosk attract loop cycles through, each shown on its own best map.
const ATTRACT_SITES = ["tycho", "apollo11", "copernicus", "apollo15", "orientale", "apollo17", "aristarchus", "change4", "shackleton", "jackson", "apollo16", "spa"];

interface ActiveTour { def: Tour; index: number }

export default defineComponent({
  name: "LunarViewer",

  extends: WWTAwareComponent,

  // eslint-disable-next-line @typescript-eslint/naming-convention -- PascalCase component registration
  components: { SurfaceOverlay, IntroDialog, ExplorePanel, SiteCard, TourPanel, KioskQrModal },

  props: {
    wwtNamespace: { type: String, required: true },
    publicUrl: { type: String, default: "" },
  },

  data() {
    return {
      lmLogo,
      wwtLogo,
      layerByName,
      qrAutoCloseMs: KIOSK_QR_AUTOCLOSE_MS,

      // Boot
      mapsLoaded: false,
      positionSet: false,
      bootError: "",
      bootRetryable: true,
      bootRetryInS: 0,

      // Maps
      planetaryMaps: [] as string[],
      curMapIndex: 0,
      prevMapIndex: -1,
      isCrossfading: false,
      crossfadeRaf: 0,
      compareOpen: false,
      compareIndex: -1,
      manualOpacity: 100,

      // Panels
      showIntro: !boolParam("nointro"),
      introDrift: true,
      showHelp: false,
      showLayerInfo: false,
      explorePanel: null as null | "sites" | "tours",
      lastFocus: null as HTMLElement | null,

      // Sites
      selectedSiteId: null as string | null,
      visiblePrograms: PROGRAMS.map(p => p.id) as Program[],
      showLabels: boolParam("labels"),
      showMaria: boolParam("maria"),
      showCraters: boolParam("craters"),
      overlaysOpen: false,
      soundOn: false,

      // Tours
      tour: null as ActiveTour | null,
      tourArrived: false,

      // Tonight (L20)
      tonightOpen: boolParam("tonight"),
      tonightOffsetDays: 0,
      tonightPlaying: false,
      tonightRaf: 0,
      nowMs: Date.now(),

      // Listen (L18)
      listenOpen: false,
      profile: null as ProfileSample[] | null,
      playhead: -1,
      listenMessage: "",

      // Kiosk (L10)
      kioskMode: boolParam("kiosk"),
      attractMode: false,
      attractIndex: 0,
      attractTimer: 0,
      attractSiteId: null as string | null,
      qr: null as null | { url: string; title: string },
      idle: null as IdleWatcher | null,
      kioskCleanup: [] as (() => void)[],

      isNarrow: window.innerWidth <= 640,
    };
  },

  computed: {
    isLoading(): boolean {
      return !(this.mapsLoaded && this.positionSet);
    },
    currentMapName(): string {
      return this.planetaryMaps[this.curMapIndex] ?? "";
    },
    currentLayer(): LayerMeta | undefined {
      return layerByName(this.currentMapName);
    },
    compareLayer(): LayerMeta | undefined {
      return this.compareIndex >= 0 ? layerByName(this.planetaryMaps[this.compareIndex]) : undefined;
    },
    comparePromptText(): string | undefined {
      if (!this.currentLayer || !this.compareLayer) { return undefined; }
      return comparePrompt(this.currentLayer.id, this.compareLayer.id);
    },
    legends(): { src: string; alt: string; label: string }[] {
      const out: { src: string; alt: string; label: string }[] = [];
      const add = (l: LayerMeta | undefined): void => {
        if (l?.legendSrc) { out.push({ src: l.legendSrc, alt: l.legendAlt ?? "", label: l.tabLabel }); }
      };
      if (this.compareOpen) { add(this.compareLayer); }
      add(this.currentLayer);
      return out;
    },
    visibleSites(): Site[] {
      return SITES.filter(s => this.visiblePrograms.includes(s.program) || s.id === this.selectedSiteId);
    },
    selectedSite(): Site | undefined {
      return siteById(this.selectedSiteId);
    },
    attractSite(): Site | undefined {
      return siteById(this.attractSiteId);
    },
    overlayCount(): number {
      return Number(this.showLabels) + Number(this.showMaria) + Number(this.showCraters);
    },
    dockOpen(): boolean {
      return !!this.tour || this.compareOpen || this.tonightOpen || this.listenOpen;
    },

    // ── Tonight ──
    tonightDate(): Date {
      return new Date(this.nowMs + this.tonightOffsetDays * 86400000);
    },
    lighting(): MoonLighting | null {
      return this.tonightOpen ? moonLighting(this.tonightDate) : null;
    },
    subsolar(): { lat: number; lon: number } | null {
      return this.lighting ? { lat: this.lighting.subsolarLat, lon: this.lighting.subsolarLon } : null;
    },
    tonightDateLabel(): string {
      const d = this.tonightDate;
      const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (Math.abs(this.tonightOffsetDays) < 0.01) { return `Today, ${day}`; }
      return day;
    },
    /** Phase glyph as seen from Earth (lit limb on the right while waxing). */
    phasePath(): string {
      const l = this.lighting;
      if (!l) { return ""; }
      const r = 18;
      const k = l.illuminated;
      const x = r * (1 - 2 * k); // terminator ellipse half-width (signed)
      const sweepOuter = l.waxing ? 1 : 0;
      const sweepInner = (x > 0) === l.waxing ? 0 : 1;
      return `M0,${-r} A${r},${r} 0 0 ${sweepOuter} 0,${r} A${Math.abs(x)},${r} 0 0 ${sweepInner} 0,${-r} Z`;
    },

    // ── Listen ──
    chart(): { w: number; h: number; line: string; area: string } {
      const w = 300;
      const h = 56;
      const p = this.profile;
      if (!p || p.length < 2) { return { w, h, line: "", area: "" }; }
      const lo = Math.min(...p.map(s => s.elevation));
      const hi = Math.max(...p.map(s => s.elevation));
      const span = Math.max(200, hi - lo);
      const pts = p.map((s, i) => [(i / (p.length - 1)) * w, h - 4 - ((s.elevation - lo) / span) * (h - 8)]);
      const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
      return { w, h, line, area: `${line}L${w},${h}L0,${h}Z` };
    },
    profileSummary(): string {
      const p = this.profile;
      if (!p || p.length < 2) { return ""; }
      const lo = Math.min(...p.map(s => s.elevation));
      const hi = Math.max(...p.map(s => s.elevation));
      const km = p[p.length - 1].km;
      return `${Math.round(km).toLocaleString()} km long · ${((hi - lo) / 1000).toFixed(1)} km from lowest to highest point`;
    },
  },

  watch: {
    // Keep the URL shareable: ?map=…&site=… (L10 deep links).
    curMapIndex() { this.syncUrl(); },
    selectedSiteId() { this.syncUrl(); },
    showMaria() { this.syncUrl(); },
    showCraters() { this.syncUrl(); },
  },

  mounted() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
    if (this.kioskMode) { this.setupKiosk(); }
    this.boot();
  },

  unmounted() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this.onResize);
    cancelAnimationFrame(this.crossfadeRaf);
    cancelAnimationFrame(this.tonightRaf);
    window.clearTimeout(this.attractTimer);
    this.idle?.stop();
    this.kioskCleanup.forEach(fn => fn());
    stopProfile();
  },

  methods: {
    shortName(wwtName: string): string {
      const meta = layerByName(wwtName);
      if (meta) { return meta.displayName; }
      return wwtName.replace(/^Moon\s+/i, "").split(" ").slice(0, 4).join(" ");
    },

    // ── Boot (L4 / E3) ─────────────────────────────────────────────────────
    async boot(): Promise<void> {
      if (!hasWebGL()) {
        this.bootError = "This browser can't display WebGL graphics, which WorldWide Telescope needs. "
          + "Try an up-to-date version of Chrome, Edge, Firefox or Safari.";
        this.bootRetryable = false;
        return;
      }
      try {
        await withTimeout(this.waitForReady(), "Starting WorldWide Telescope", 30_000);

        this.applySetting(["showConstellationBoundries", false]); // the engine's own spelling
        this.applySetting(["showConstellationFigures", false]);
        this.applySetting(["showCrosshairs", false]);
        this.applySetting(["actualPlanetScale", true]);
        this.applySetting(["solarSystemCosmos", false]);
        this.applySetting(["solarSystemStars", false]);
        this.setClockSync(false);

        await withTimeout(this.loadImageCollection({ url: MOON_WTML_URL, loadChildFolders: true }), "Loading the Moon maps");

        const available = WWTControl.getImageSets().filter(
          img => img.get_referenceFrame() === "Moon" && img.get_name() !== "Moon",
        );
        const ordered: string[] = [];
        for (const meta of LAYER_META) {
          if (available.some(img => img.get_name() === meta.wwtName)) { ordered.push(meta.wwtName); }
        }
        for (const img of available) {
          const name = img.get_name();
          if (name && !ordered.includes(name)) { ordered.push(name); }
        }
        if (ordered.length === 0) {
          throw new Error("The Moon map catalog loaded, but it contained no Moon maps.");
        }
        this.planetaryMaps = ordered;

        const wanted = layerById(stringParam("map")) ?? layerById(DEFAULT_LAYER_ID);
        const idx = wanted ? ordered.indexOf(wanted.wwtName) : -1;
        this.curMapIndex = idx >= 0 ? idx : 0;
        const startImg = available.find(img => img.get_name() === this.currentMapName) as Imageset;
        // setupForImageset switches WWT into planet mode for the Moon.
        this.setupForImageset({ foreground: startImg, background: startImg });
        this.setForegroundOpacity(100);

        // Park the camera small and turned away; the intro drifts it toward the near side (L6).
        const deepSite = siteById(stringParam("site"));
        const deepTour = tourById(stringParam("tour"));
        const startDrift = this.showIntro && !deepSite && !deepTour && !prefersReducedMotion();
        await flyTo(startDrift ? { lat: 12, lon: -75, zoomDeg: wholeMoon().zoomDeg * 2.2, instant: true } : { ...wholeMoon(), instant: true });

        this.mapsLoaded = true;
        this.positionSet = true;
        markBootSucceeded();

        if (startDrift) {
          flyTo({ ...wholeMoon(), durationMs: 9000, noRise: true });
        }
        if (deepTour) {
          this.showIntro = false;
          this.startTour(deepTour.id);
        } else if (deepSite) {
          this.showIntro = false;
          this.gotoSite(deepSite, { switchLayer: !stringParam("map") });
        }

        // The elevation grid is only needed by the HUD and Listen; fetch it
        // after the first tiles have had the network to themselves.
        window.setTimeout(() => { loadElevation(); }, 2500);
      } catch (err) {
        console.error("[lunar] startup failed", err);
        this.bootError = describeBootError(err);
        if (this.kioskMode) {
          this.bootRetryInS = Math.round(scheduleKioskRetry() / 1000);
        }
      }
    },

    retryBoot(): void {
      window.location.reload();
    },

    // ── Map switching ──────────────────────────────────────────────────────
    moveLeft(): void {
      const n = this.planetaryMaps.length;
      if (n === 0) { return; }
      this.switchToMap((this.curMapIndex - 1 + n) % n);
    },

    moveRight(): void {
      const n = this.planetaryMaps.length;
      if (n === 0) { return; }
      this.switchToMap((this.curMapIndex + 1) % n);
    },

    switchToLayerId(id: string | undefined): void {
      const meta = layerById(id);
      const i = meta ? this.planetaryMaps.indexOf(meta.wwtName) : -1;
      if (i >= 0) { this.switchToMap(i); }
    },

    switchToMap(newIndex: number): void {
      if (newIndex === this.curMapIndex || newIndex < 0 || newIndex >= this.planetaryMaps.length) { return; }
      const newName = this.planetaryMaps[newIndex];

      // If a fade is mid-flight, land it before starting the next one.
      if (this.isCrossfading) { this.finishCrossfade(this.currentMapName); }

      this.prevMapIndex = this.curMapIndex;
      this.curMapIndex = newIndex;

      // Compare open: the new map becomes the slider's right-hand side. If it
      // was the compare map, swap so the two sides stay different.
      if (this.compareOpen) {
        if (this.compareIndex === newIndex) { this.compareIndex = this.prevMapIndex; }
        this.setBackgroundImageByName(this.planetaryMaps[this.compareIndex]);
        this.setForegroundImageByName(newName);
        this.setForegroundOpacity(this.manualOpacity);
        return;
      }

      if (prefersReducedMotion()) {
        this.finishCrossfade(newName);
        return;
      }

      this.setForegroundImageByName(newName);
      this.setForegroundOpacity(0);
      this.isCrossfading = true;
      const start = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - start) / CROSSFADE_MS);
        const eased = t * t * (3 - 2 * t);
        this.setForegroundOpacity(Math.round(eased * 100));
        if (t < 1) {
          this.crossfadeRaf = requestAnimationFrame(step);
        } else {
          this.finishCrossfade(newName);
        }
      };
      cancelAnimationFrame(this.crossfadeRaf);
      this.crossfadeRaf = requestAnimationFrame(step);
    },

    finishCrossfade(name: string): void {
      cancelAnimationFrame(this.crossfadeRaf);
      this.setBackgroundImageByName(name);
      this.setForegroundImageByName(name);
      this.setForegroundOpacity(100);
      this.isCrossfading = false;
    },

    goToPrevious(): void {
      if (this.prevMapIndex >= 0) { this.switchToMap(this.prevMapIndex); }
    },

    // ── Compare (L12) ──────────────────────────────────────────────────────
    toggleCompare(): void {
      if (this.planetaryMaps.length < 2) { return; }
      if (this.isCrossfading) { this.finishCrossfade(this.currentMapName); }
      if (!this.compareOpen) {
        const n = this.planetaryMaps.length;
        const idx = this.prevMapIndex >= 0 && this.prevMapIndex !== this.curMapIndex
          ? this.prevMapIndex
          : (this.curMapIndex + n - 1) % n;
        this.compareIndex = idx;
        this.manualOpacity = 50;
        this.setBackgroundImageByName(this.planetaryMaps[idx]);
        this.setForegroundImageByName(this.currentMapName);
        this.setForegroundOpacity(this.manualOpacity);
        this.compareOpen = true;
      } else {
        this.compareOpen = false;
        this.finishCrossfade(this.currentMapName);
      }
    },

    setCompareIndex(i: number): void {
      if (i === this.curMapIndex) { return; }
      this.compareIndex = i;
      this.setBackgroundImageByName(this.planetaryMaps[i]);
      this.setForegroundOpacity(this.manualOpacity);
    },

    applyManualOpacity(): void {
      this.setForegroundOpacity(this.manualOpacity);
    },

    // ── Camera ─────────────────────────────────────────────────────────────
    zoomBy(factor: number): void {
      const ctl = wwtControl() as unknown as { renderContext: { targetCamera: { zoom: number } } } | null;
      if (!ctl) { return; }
      cancelFlight();
      const z = ctl.renderContext.targetCamera.zoom * factor;
      // The engine eases the view toward the target camera on its own.
      ctl.renderContext.targetCamera.zoom = Math.max(0.05, Math.min(200, z));
    },

    flyWholeMoon(): void {
      this.selectedSiteId = null;
      flyTo(wholeMoon());
    },

    // ── Sites ──────────────────────────────────────────────────────────────
    gotoSite(site: Site, opts: { switchLayer?: boolean; zoomDeg?: number; lat?: number; lon?: number } = {}): Promise<unknown> {
      this.selectedSiteId = site.id;
      const layer = opts.switchLayer ? site.layer : undefined;
      return flyTo({
        lat: opts.lat ?? site.lat,
        lon: opts.lon ?? site.lon,
        zoomDeg: opts.zoomDeg ?? site.zoomDeg,
        // L8: crossfade the map mid-flight when the stop has a preferred layer.
        onMidpoint: layer ? () => this.switchToLayerId(layer) : undefined,
      });
    },

    onMarkerSelect(site: Site): void {
      if (this.tour) { this.exitTour(); }
      if (this.kioskMode) { statsTrack("select", site.name); }
      this.gotoSite(site);
    },

    onCardSelect(site: Site): void {
      if (this.isNarrow) { this.explorePanel = null; }
      this.onMarkerSelect(site);
    },

    onMarkerHover(site: Site | null): void {
      if (site && this.soundOn) { chime(site.program); }
    },

    toggleProgram(p: Program): void {
      const i = this.visiblePrograms.indexOf(p);
      if (i >= 0) { this.visiblePrograms.splice(i, 1); } else { this.visiblePrograms.push(p); }
    },

    openExplore(view: "sites" | "tours"): void {
      if (this.explorePanel === view) { this.closeExplore(); return; }
      this.lastFocus = document.activeElement as HTMLElement | null;
      this.explorePanel = view;
    },

    closeExplore(): void {
      this.explorePanel = null;
      this.lastFocus?.focus?.();
      this.lastFocus = null;
    },

    // ── Tours (L9) ─────────────────────────────────────────────────────────
    startTour(id: string): void {
      const def = tourById(id);
      if (!def) { return; }
      this.explorePanel = null;
      this.listenOpen = false;
      if (this.compareOpen) { this.toggleCompare(); }
      this.tour = { def: markRaw(def), index: 0 };
      this.goToTourStop();
    },

    startTourFromIntro(id: string): void {
      this.showIntro = false;
      this.startTour(id);
    },

    stepTour(delta: number): void {
      if (!this.tour) { return; }
      const next = this.tour.index + delta;
      if (next < 0 || next >= this.tour.def.stops.length) { return; }
      this.tour.index = next;
      this.goToTourStop();
    },

    async goToTourStop(): Promise<void> {
      if (!this.tour) { return; }
      const tour = this.tour;
      const stop = tour.def.stops[tour.index];
      const site = siteById(stop.siteId);
      if (!site) { return; }
      this.tourArrived = false;
      this.selectedSiteId = site.id;
      await flyTo({
        lat: stop.lat ?? site.lat,
        lon: stop.lon ?? site.lon,
        zoomDeg: stop.zoomDeg ?? site.zoomDeg,
        onMidpoint: () => this.switchToLayerId(stop.layer),
      });
      if (this.tour === tour) { this.tourArrived = true; }
    },

    exitTour(): void {
      this.tour = null;
      this.tourArrived = false;
    },

    // ── Tonight's Moon (L20) ───────────────────────────────────────────────
    toggleTonight(): void {
      this.tonightOpen = !this.tonightOpen;
      this.stopTonightPlay();
      if (this.tonightOpen) {
        this.nowMs = Date.now();
        this.tonightOffsetDays = 0;
        // Face the Moon the way we see it from Earth.
        if (!this.tour) { flyTo(wholeMoon()); }
      }
    },

    toggleTonightPlay(): void {
      if (this.tonightPlaying) { this.stopTonightPlay(); return; }
      this.tonightPlaying = true;
      let last = performance.now();
      const tick = (now: number): void => {
        if (!this.tonightPlaying) { return; }
        // About 15 seconds per lunar month.
        const days = ((now - last) / 1000) * 2;
        last = now;
        let next = this.tonightOffsetDays + days;
        if (next > 15) { next -= 30; }
        this.tonightOffsetDays = Math.round(next * 100) / 100;
        this.tonightRaf = requestAnimationFrame(tick);
      };
      this.tonightRaf = requestAnimationFrame(tick);
    },

    stopTonightPlay(): void {
      this.tonightPlaying = false;
      cancelAnimationFrame(this.tonightRaf);
    },

    // ── Listen (L18) ───────────────────────────────────────────────────────
    async toggleListen(): Promise<void> {
      this.listenOpen = !this.listenOpen;
      stopProfile();
      this.playhead = -1;
      this.listenMessage = "";
      if (!this.listenOpen) {
        this.profile = null;
        return;
      }
      this.soundOn = true;
      const ok = await loadElevation();
      if (!ok) { this.listenMessage = "The elevation data couldn't be loaded, so there's nothing to play."; }
    },

    async onListenLine(line: { a: { lat: number; lon: number }; b: { lat: number; lon: number } }): Promise<void> {
      if (!(await loadElevation())) { return; }
      this.profile = markRaw(elevationProfile(line.a, line.b));
      this.playCurrentProfile();
    },

    listenAcrossView(): void {
      type LatLon = { lat: number; lon: number };
      const overlay = this.$refs.overlay as { centerLine(): { a: LatLon; b: LatLon } | null } | undefined;
      const line = overlay?.centerLine();
      if (line) {
        this.onListenLine(line);
      } else {
        this.listenMessage = "Zoom out until the Moon fills the middle of the screen, then try again.";
      }
    },

    async playCurrentProfile(): Promise<void> {
      const p = this.profile;
      if (!p || p.length < 2) { return; }
      this.listenMessage = "";
      const km = p[p.length - 1].km;
      const duration = Math.min(8000, Math.max(2500, 2000 + km * 2.5));
      await playProfile(p.map(s => s.elevation), duration, (t) => { this.playhead = t; });
      this.playhead = -1;
    },

    // ── Dialogs & keyboard (L14, L15) ──────────────────────────────────────
    openIntro(): void {
      this.lastFocus = document.activeElement as HTMLElement | null;
      this.showIntro = true;
    },

    closeIntro(): void {
      this.showIntro = false;
      this.lastFocus?.focus?.();
      this.lastFocus = null;
    },

    dialogKeydown(ev: KeyboardEvent, flag: "showHelp" | "showLayerInfo"): void {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        this[flag] = false;
        return;
      }
      trapTab(ev.currentTarget as HTMLElement, ev);
    },

    onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        this.closeTopmost();
        return;
      }
      // Never steal keys from sliders, selects and text fields (L14), and
      // don't act behind a modal.
      if (isEditableTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (this.showIntro || this.showHelp || this.showLayerInfo || this.qr || this.isLoading) { return; }
      if (e.key === "ArrowLeft") { this.moveLeft(); e.preventDefault(); }
      else if (e.key === "ArrowRight") { this.moveRight(); e.preventDefault(); }
      else if (e.key === "+" || e.key === "=") { this.zoomBy(1 / 1.5); }
      else if (e.key === "-" || e.key === "_") { this.zoomBy(1.5); }
    },

    closeTopmost(): void {
      if (this.qr) { this.qr = null; }
      else if (this.overlaysOpen) { this.overlaysOpen = false; }
      else if (this.showIntro) { this.closeIntro(); }
      else if (this.showHelp) { this.showHelp = false; }
      else if (this.showLayerInfo) { this.showLayerInfo = false; }
      else if (this.explorePanel) { this.closeExplore(); }
      else if (this.listenOpen) { this.toggleListen(); }
      else if (this.tour) { this.exitTour(); }
      else if (this.selectedSiteId) { this.selectedSiteId = null; }
      else if (this.compareOpen) { this.toggleCompare(); }
      else if (this.tonightOpen) { this.toggleTonight(); }
    },

    onResize(): void {
      this.isNarrow = window.innerWidth <= 640;
    },

    // ── Deep links ─────────────────────────────────────────────────────────
    stateParams(): URLSearchParams {
      const params = new URLSearchParams();
      if (this.currentLayer) { params.set("map", this.currentLayer.id); }
      if (this.selectedSiteId) { params.set("site", this.selectedSiteId); }
      if (this.showMaria) { params.set("maria", "1"); }
      if (this.showCraters) { params.set("craters", "1"); }
      return params;
    },

    syncUrl(): void {
      if (this.isLoading || this.attractMode) { return; }
      const params = new URLSearchParams(window.location.search);
      params.delete("map");
      params.delete("site");
      params.delete("tour");
      params.delete("maria");
      params.delete("craters");
      this.stateParams().forEach((v, k) => params.set(k, v));
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
    },

    // ── Kiosk (L10) ────────────────────────────────────────────────────────
    setupKiosk(): void {
      statsInit(true);
      this.kioskCleanup.push(installKioskGuards({
        onExternalLink: (url, title) => {
          statsTrack("qr", url);
          this.qr = { url, title };
        },
      }));
      this.kioskCleanup.push(scheduleDailyReload(KIOSK_RELOAD_HOUR, () => this.attractMode));
      const idle = createIdleWatcher({
        idleMs: KIOSK_IDLE_MS,
        onIdle: () => {
          statsSessionEnd(idle.lastActivityTs());
          this.startAttract();
        },
        onActive: () => {
          if (this.attractMode) { this.stopAttract(); }
          statsSessionStart();
        },
        onTap: () => statsTrack("tap"),
      });
      this.idle = idle;
      idle.start();
    },

    resetForAttract(): void {
      this.qr = null;
      this.showIntro = false;
      this.showHelp = false;
      this.showLayerInfo = false;
      this.explorePanel = null;
      this.tour = null;
      this.selectedSiteId = null;
      this.showLabels = false;
      this.showMaria = false;
      this.showCraters = false;
      this.overlaysOpen = false;
      if (this.listenOpen) { this.toggleListen(); }
      if (this.compareOpen) { this.toggleCompare(); }
      if (this.tonightOpen) { this.toggleTonight(); }
    },

    startAttract(): void {
      if (this.isLoading || this.attractMode) { return; }
      this.resetForAttract();
      this.attractMode = true;
      this.attractIndex = 0;
      this.attractStep();
    },

    async attractStep(): Promise<void> {
      if (!this.attractMode) { return; }
      const site = siteById(ATTRACT_SITES[this.attractIndex % ATTRACT_SITES.length]);
      this.attractIndex += 1;
      if (!site) { this.attractStep(); return; }
      this.attractSiteId = site.id;
      await flyTo({ lat: site.lat, lon: site.lon, zoomDeg: site.zoomDeg, onMidpoint: () => this.switchToLayerId(site.layer) });
      if (!this.attractMode) { return; }
      this.attractTimer = window.setTimeout(() => this.attractStep(), KIOSK_ATTRACT_DWELL_MS);
    },

    stopAttract(): void {
      this.attractMode = false;
      this.attractSiteId = null;
      window.clearTimeout(this.attractTimer);
      cancelFlight();
      flyTo(wholeMoon());
      this.showIntro = true;
    },

    openTakeHome(): void {
      const base = this.publicUrl || (window.location.origin + window.location.pathname);
      const qs = this.stateParams().toString();
      statsTrack("takeHome");
      this.qr = { url: base + (qs ? `?${qs}` : ""), title: "Take this view home" };
    },
  },
});
</script>

<style lang="less">
#main-content {
  position: fixed;
  inset: 0;
  overflow: hidden;

  .wwtelescope-component {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
  }
}

// ── Loading / boot error ───────────────────────────────────────────────────

.modal {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--text);
}

.loading-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.4rem;

  p { margin: 0; }

  .spinner {
    width: 3rem;
    height: 3rem;
    background: url("assets/lunar_loader.gif") no-repeat center / contain;
  }
}

.boot-error {
  max-width: 28rem;
  padding: 1.5rem;
  text-align: center;

  h2 { margin: 0 0 0.5rem; font-size: 1.4rem; }
  p { margin: 0 0 1rem; color: var(--text-muted); line-height: 1.5; }
  .boot-auto { font-size: 0.85rem; margin-top: 0.8rem; }
}

// ── Title chip ─────────────────────────────────────────────────────────────

.title-chip {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  max-width: 15rem;
  padding: 0.35rem 0.85rem 0.35rem 0.45rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  backdrop-filter: blur(8px);
  color: var(--text);
  cursor: pointer;
  text-align: left;

  img { width: 32px; height: 32px; flex-shrink: 0; }

  .title-text { display: flex; flex-direction: column; min-width: 0; }
  .title-name {
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }
  .title-map {
    font-size: 0.75rem;
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover { border-color: rgba(242, 196, 109, 0.5); }
}

// ── Layer tabs ─────────────────────────────────────────────────────────────

.layer-bar {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(8px);
  max-width: calc(100vw - 33rem);

  .layer-step { width: 36px; height: 36px; border-radius: 999px; }
  .layer-current { display: none; }
}

.layer-tabs {
  display: flex;
  gap: 0.15rem;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.layer-tab {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 0.85rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover { color: var(--text); background: rgba(255, 255, 255, 0.08); }
  &[aria-pressed="true"] {
    background: var(--accent);
    color: var(--accent-ink);
  }
}

.layer-caption {
  position: absolute;
  top: 4.1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  width: max-content;
  max-width: min(36rem, calc(100vw - 2rem));
  margin: 0;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: var(--text);
  font-size: 0.9rem;
  text-align: center;
  text-shadow: 0 1px 2px #000;
}

// ── Tools column ───────────────────────────────────────────────────────────

.tools {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(8px);

  .tools-sep {
    height: 1px;
    margin: 0.2rem 0.4rem;
    background: var(--border);
  }
}

// ── Overlays popover ───────────────────────────────────────────────────────

.overlays-anchor {
  position: relative;

  .has-active { color: var(--accent); }
  .badge {
    position: absolute;
    top: 3px;
    right: 3px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 15px;
    text-align: center;
  }
}

.overlays-menu {
  position: absolute;
  top: 0;
  right: calc(100% + 0.6rem);
  width: 17.5rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.overlay-switch {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.5rem 0.55rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover { background: rgba(255, 255, 255, 0.06); }

  .sw {
    position: relative;
    flex-shrink: 0;
    width: 34px;
    height: 20px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    transition: background 0.15s;
    &::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--text);
      transition: transform 0.15s;
    }
  }
  &[aria-checked="true"] .sw {
    background: var(--accent);
    &::after { transform: translateX(14px); background: var(--accent-ink); }
  }

  .sw-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    b { font-size: 0.95rem; }
    small { font-size: 0.76rem; color: var(--text-muted); line-height: 1.3; }
  }

  .sw-key {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }
  .key-maria { background: rgba(118, 146, 255, 0.35); border: 1.5px solid rgba(160, 182, 255, 0.95); }
  .key-craters { border-radius: 50%; border: 1.5px solid rgba(255, 214, 102, 0.9); }
  .key-grid {
    border: 1px solid rgba(242, 196, 109, 0.6);
    background:
      linear-gradient(rgba(242, 196, 109, 0.6), rgba(242, 196, 109, 0.6)) center / 1px 100% no-repeat,
      linear-gradient(rgba(242, 196, 109, 0.6), rgba(242, 196, 109, 0.6)) center / 100% 1px no-repeat;
  }
}

.overlay-credit {
  margin: 0.3rem 0.55rem 0.2rem;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--text-muted);
}

// ── Launchers ──────────────────────────────────────────────────────────────

.launchers {
  position: absolute;
  left: 0.75rem;
  bottom: 2rem;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .launcher {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text);
    backdrop-filter: blur(8px);

    &:hover { border-color: rgba(242, 196, 109, 0.6); }
    &[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
  }

  .launcher-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
}

// ── Dock ───────────────────────────────────────────────────────────────────

.dock {
  position: absolute;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
  z-index: 22;
  width: min(34rem, calc(100vw - 1.5rem));
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  pointer-events: none;

  > * { pointer-events: auto; }

  .tour-panel {
    position: static;
    transform: none;
    width: auto;
  }
}

.dock-panel {
  padding: 0.5rem 0.6rem 0.5rem 0.9rem;
}

.compare-panel {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  select {
    min-height: 36px;
    padding: 0 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #1a1b21;
    color: var(--text);
    font: inherit;
    font-weight: 600;
  }

  .cmp-range { flex: 1; accent-color: var(--accent); min-width: 6rem; }
  .cmp-label { font-weight: 700; white-space: nowrap; }
}

.tonight-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 1rem;

  .tonight-phase {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .phase-icon { width: 40px; height: 40px; }
  .tonight-name { margin: 0; font-weight: 700; font-size: 1.05rem; }
  .tonight-meta { margin: 0; font-size: 0.82rem; color: var(--text-muted); }
  .tonight-controls {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
    min-width: 14rem;
  }
  .tonight-range { flex: 1; accent-color: var(--accent); }
}

.listen-panel {
  .listen-head {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .listen-hint {
    flex: 1;
    margin: 0.35rem 0;
    font-size: 0.92rem;
    line-height: 1.45;
  }
  .listen-chart {
    flex: 1;
    svg { width: 100%; height: 56px; display: block; }
    .chart-area { fill: rgba(124, 198, 240, 0.18); }
    .chart-line { fill: none; stroke: var(--robotic-color); stroke-width: 2; vector-effect: non-scaling-stroke; }
    .chart-head { stroke: #fff; stroke-width: 2; vector-effect: non-scaling-stroke; }
  }
  .listen-stats {
    margin: 0.25rem 0 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .listen-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
  .listen-msg {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    color: var(--accent);
  }
}

// ── Legends ────────────────────────────────────────────────────────────────

.legends {
  position: absolute;
  right: 0.75rem;
  bottom: 9.25rem;
  z-index: 12;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  pointer-events: none;
}

.legend {
  margin: 0;
  padding: 0.35rem 0.45rem;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);

  figcaption {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.2rem;
  }
  img { display: block; width: 13.5rem; max-width: 40vw; border-radius: 4px; }
}

// ── Dialogs ────────────────────────────────────────────────────────────────

.overlay-backdrop {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}

.dialog {
  position: relative;
  width: min(34rem, 100%);
  max-height: calc(100% - 2rem);
  overflow-y: auto;
  padding: 1.4rem 1.6rem;
  outline: none;
  &:focus-visible { outline: none; }

  h2 { margin: 0 2.5rem 0.6rem 0; font-size: 1.35rem; }
  p { line-height: 1.55; }

  .dialog-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }

  .info-caption { color: var(--accent); font-weight: 600; }
  .info-legend { display: block; max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }
  .info-credit { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0; }
}

.help-list {
  margin: 0 0 1rem;

  > div {
    display: flex;
    gap: 0.9rem;
    align-items: baseline;
    padding: 0.35rem 0;
  }
  dt {
    flex-shrink: 0;
    width: 2.6rem;
    text-align: center;
    color: var(--accent);
    font-weight: 700;
  }
  dd { margin: 0; line-height: 1.45; }
}

.help-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);

  .key {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    &::before {
      content: "";
      width: 10px;
      height: 10px;
      border: 2px solid currentColor;
    }
  }
  .key-apollo::before { border-color: var(--apollo-color); border-radius: 50%; }
  .key-robotic::before { border-color: var(--robotic-color); transform: rotate(45deg); width: 8px; height: 8px; }
  .key-artemis::before {
    border: none;
    background: var(--artemis-color);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    width: 12px;
    height: 11px;
  }
  .key-feature::before { border-color: var(--feature-color); border-radius: 50%; width: 7px; height: 7px; }
}

// ── Attract & credits ──────────────────────────────────────────────────────

.attract-caption {
  position: absolute;
  left: 50%;
  bottom: 3rem;
  transform: translateX(-50%);
  z-index: 30;
  text-align: center;
  text-shadow: 0 2px 8px #000;
  pointer-events: none;

  .attract-name { margin: 0; font-size: 2.4rem; font-weight: 700; }
  .attract-summary { margin: 0.2rem 0 1rem; font-size: 1.2rem; }
  .attract-cta {
    display: inline-block;
    margin: 0;
    padding: 0.5rem 1.2rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
    font-size: 1.1rem;
    animation: attract-pulse 2.5s ease-in-out infinite;
  }
}

@keyframes attract-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

#main-content.attract {
  .title-chip, .layer-bar, .layer-caption, .tools, .launchers, .dock, .legends { opacity: 0; pointer-events: none; }
}

.credits {
  position: absolute;
  right: 0.75rem;
  bottom: 0.4rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);

  img { height: 18px; display: block; }
}

// Kiosk: larger targets, no external-navigation affordances.
#main-content.kiosk-ui {
  .icon-btn { width: 48px; height: 48px; font-size: 1.2rem; }
  .layer-tab { min-height: 44px; font-size: 1.05rem; }
  .launchers .btn { min-height: 52px; font-size: 1.1rem; padding: 0 1.4rem; }
}

// ── Narrow screens ─────────────────────────────────────────────────────────

@media (max-width: 1100px) {
  .layer-bar {
    max-width: calc(100vw - 20rem);
  }
}

@media (max-width: 860px) {
  .title-chip {
    padding: 0.3rem;
    .title-text { display: none; }
  }
  .layer-bar {
    left: 3.9rem;
    right: 4.1rem;
    transform: none;
    max-width: none;
    justify-content: space-between;

    .layer-tabs { display: none; }
    .layer-current {
      display: block;
      flex: 1;
      text-align: center;
      font-weight: 700;
      color: var(--accent);
    }
  }
  .layer-caption {
    top: 3.9rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }
}

@media (max-width: 640px) {
  .tools {
    top: auto;
    bottom: 4.6rem;
    flex-direction: column;
    .icon-btn { width: 38px; height: 38px; font-size: 0.95rem; }
  }
  .launchers { bottom: 1.6rem; }
  .dock {
    bottom: 4.6rem;
    left: 0.75rem;
    right: 3.9rem;
    width: auto;
    transform: none;
  }
  .legends { bottom: auto; top: 6.6rem; right: 0.75rem; }
  .legend img { width: 9rem; }
}
</style>
