<template>
  <v-app id="app" :style="cssVars">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <div id="main-content">

      <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>

      <!-- Loading modal -->
      <transition name="fade">
        <div class="modal" id="modal-loading" v-show="isLoading">
          <div class="container">
            <div class="spinner"></div>
            <p>Loading…</p>
          </div>
        </div>
      </transition>

      <!-- Map selector bar (top center) -->
      <div id="map-controls-container" v-show="!isLoading && planetaryMaps.length > 0">
        <button class="map-nav-btn" @click="moveLeft" :disabled="isCrossfading" aria-label="Previous map">
          <i class="fas fa-chevron-left"></i>
        </button>

        <div class="map-dots" role="tablist" aria-label="Select map">
          <button
            v-for="(mapName, i) in planetaryMaps"
            :key="i"
            class="map-dot"
            :class="{ active: i === curMapIndex }"
            :title="shortName(mapName)"
            :aria-label="shortName(mapName)"
            :aria-selected="i === curMapIndex"
            role="tab"
            @click="switchToMap(i)"
          ></button>
        </div>

        <button class="map-nav-btn" @click="moveRight" :disabled="isCrossfading" aria-label="Next map">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Current map name display -->
      <transition name="fade">
        <div id="map-name-display" v-if="!isLoading && currentMapMeta" @click="showLayerInfo = true">
          {{ currentMapMeta.displayName }}
        </div>
      </transition>

      <!-- Previous map return button (top left) -->
      <button
        id="previous-btn"
        v-show="prevMapIndex >= 0 && !isLoading && !isCrossfading"
        @click="goToPrevious"
        title="Return to previous map"
        aria-label="Return to previous map"
      >
        <i class="fas fa-sync-alt"></i>
      </button>

      <!-- Right-side controls -->
      <ul id="controls" v-show="!isLoading">
        <li @click="doZoom(true)" title="Zoom in">
          <i class="fas fa-search-plus"></i>
        </li>
        <li @click="doZoom(false)" title="Zoom out">
          <i class="fas fa-search-minus"></i>
        </li>
        <li
          @click="toggleCrossfadeSlider"
          :class="{ 'control-active': showCrossfadeSlider, 'control-disabled': planetaryMaps.length < 2 }"
          :title="showCrossfadeSlider ? 'Close compare' : 'Compare maps'"
        >
          <i class="fas fa-adjust"></i>
        </li>
        <li @click="showLayerInfo = true" title="Map information">
          <i class="fas fa-info-circle"></i>
        </li>
        <li @click="showHelp = true" title="Help">
          <i class="fas fa-question-circle"></i>
        </li>
      </ul>

      <!-- Rocket / Areas of interest button (bottom left) -->
      <button
        id="rocket-btn"
        v-show="!isLoading"
        :class="{ 'rocket-active': showLocations }"
        @click="showLocations = !showLocations"
        title="Areas of interest"
        aria-label="Areas of interest"
      >
        <i class="fas fa-rocket"></i>
      </button>

      <!-- Manual crossfade slider (bottom center) -->
      <transition name="slide-up">
        <div id="crossfade-panel" v-if="showCrossfadeSlider">
          <span class="cf-label">{{ shortName(planetaryMaps[prevMapIndex] ?? '') }}</span>
          <input
            type="range"
            class="opacity-range"
            min="0"
            max="100"
            v-model.number="manualOpacity"
            @input="applyManualOpacity"
            aria-label="Map blend"
          />
          <span class="cf-label">{{ shortName(planetaryMaps[curMapIndex]) }}</span>
        </div>
      </transition>

      <!-- Areas of interest panel (bottom left) -->
      <transition name="slide-right">
        <div id="locations-panel" v-if="showLocations">
          <div class="panel-header">
            <h3>Areas of Interest</h3>
            <button class="panel-close-btn" @click="showLocations = false" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <ul class="locations-list">
            <li
              v-for="loc in locations"
              :key="loc.id"
              class="location-item"
              :class="{ 'location-active': selectedLocation?.id === loc.id }"
              @click="gotoLocation(loc)"
            >
              <i class="fas fa-map-marker-alt location-icon"></i>
              {{ loc.name }}
            </li>
          </ul>
        </div>
      </transition>

      <!-- Location description popup (bottom center) -->
      <transition name="fade">
        <div
          id="location-description"
          v-if="selectedLocation && selectedLocation.description"
          @click="selectedLocation = null"
        >
          <strong>{{ selectedLocation.name }}</strong>
          <p>{{ selectedLocation.description }}</p>
          <span class="dismiss-hint">Tap to dismiss</span>
        </div>
      </transition>

      <!-- Layer info overlay -->
      <transition name="fade">
        <div id="layer-info-backdrop" v-if="showLayerInfo" @click="showLayerInfo = false">
          <div class="layer-info-panel" @click.stop>
            <button class="panel-close-btn info-close" @click="showLayerInfo = false" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
            <h3>{{ currentMapMeta?.displayName }}</h3>
            <p>{{ currentMapMeta?.description }}</p>
            <img
              v-if="currentMapMeta?.legendSrc"
              :src="currentMapMeta.legendSrc"
              alt="Map legend"
              class="legend-img"
            />
            <p class="dismiss-hint">Click outside to close</p>
          </div>
        </div>
      </transition>

      <!-- Help overlay -->
      <transition name="fade">
        <div id="help-overlay" v-if="showHelp" @click="showHelp = false">
          <div class="help-box">
            <h2>Explore the Moon</h2>
            <div class="help-row">
              <span class="help-icons">
                <i class="fas fa-chevron-left"></i>
                <i class="fas fa-chevron-right"></i>
              </span>
              <span>Use the arrows or dot buttons to switch between Moon map types.</span>
            </div>
            <div class="help-row">
              <span class="help-icons"><i class="fas fa-rocket"></i></span>
              <span>Tap the Rocket to fly to notable craters, rilles, and landing sites.</span>
            </div>
            <div class="help-row">
              <span class="help-icons"><i class="fas fa-arrows-alt"></i></span>
              <span>Click and drag to pan. Scroll or pinch to zoom.</span>
            </div>
            <div class="help-row">
              <span class="help-icons"><i class="fas fa-adjust"></i></span>
              <span>Use the Compare button to manually blend two maps with a crossfade slider.</span>
            </div>
            <div class="help-row">
              <span class="help-icons"><i class="fas fa-sync-alt"></i></span>
              <span>The return button (top left) jumps back to your previously viewed map.</span>
            </div>
            <div class="help-row">
              <span class="help-icons"><i class="fas fa-info-circle"></i></span>
              <span>Tap the info button or the map name to read about the current map.</span>
            </div>
            <p class="dismiss-hint" style="text-align:center; margin-top:1.2rem;">
              Click anywhere to dismiss
            </p>
          </div>
        </div>
      </transition>

      <!-- Credits -->
      <div id="credits" v-show="!isLoading">
        <span>Powered by </span>
        <a href="https://worldwidetelescope.org" target="_blank" rel="noopener">
          <img alt="WorldWide Telescope" src="./assets/logo_wwt.png" />
        </a>
      </div>

    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { MiniDSBase } from '@cosmicds/vue-toolkit';
import { WWTControl } from '@wwtelescope/engine';

interface LayerMeta {
  wwtName: string;
  displayName: string;
  description: string;
  legendSrc?: string;
}

interface LunarLocation {
  id: string;
  name: string;
  raRad: number;
  decRad: number;
  zoomDeg: number;
  description: string;
}

// Metadata for known moon imagesets from moon_maps_v4.wtml.
// Order here controls the display order of the dot buttons.
const LAYER_META: LayerMeta[] = [
  {
    wwtName: "CGI Moon Kit",
    displayName: "CGI Moon",
    description: "A full-color photorealistic map assembled from over 100,000 individual images, composited and color-corrected to represent how the Moon appears to the naked eye.",
  },
  {
    wwtName: "Moon LRO LROC WAC Global Morphology Mosaic 100m v3",
    displayName: "LRO Wide-Angle Camera",
    description: "Assembled from 15,000 images acquired by the Wide Angle Camera (WAC) aboard NASA's Lunar Reconnaissance Orbiter between 2009 and 2011. Resolution: ~100 m/pixel.",
  },
  {
    wwtName: "SELENE Kaguya TC Ortho Global Mosaic",
    displayName: "SELENE Kaguya Terrain",
    description: "Built from images captured by Japan's SELENE (Kaguya) Terrain Camera — one of the highest-resolution global lunar mosaics ever produced, at ~10 m/pixel.",
  },
  {
    wwtName: "Moon LRO LOLA Color Shaded Relief 388m v4",
    displayName: "LOLA Elevation (Color)",
    description: "A colorized digital elevation model derived from 2011 altimetry data collected by the Lunar Orbiter Laser Altimeter (LOLA) aboard NASA's Lunar Reconnaissance Orbiter. Resolution: ~388 m/pixel.",
    legendSrc: "./assets/lola-legend.png",
  },
  {
    wwtName: "Moon LROC WAC GLD100 ColorShade 79S79N 118m v1",
    displayName: "LROC ColorShade Elevation",
    description: "A colorized terrain map from the GLD100 global topographic model: blue = low elevation, white = mid elevation, black = high elevation (darker = more extreme).",
    legendSrc: "./assets/colorshade-legend.png",
  },
  {
    wwtName: "Moon Clementine UVVIS Warped Color Ratio Mosaic 200m v1",
    displayName: "Clementine Mineral Map",
    description: "Captured at three wavelengths (415 nm, 750 nm, 1000 nm): red indicates low titanium or high glass content, green shows iron abundance, and blue highlights high-titanium or high-albedo regions. Resolution: ~200 m/pixel.",
  },
  {
    wwtName: "Unified Geologic Map of the Moon",
    displayName: "Unified Geologic Map",
    description: "A composite of six regional geologic maps, color-coded to distinguish maria (ancient lava plains), impact craters, and highland terrain types across the entire lunar surface.",
  },
];

const LOCATIONS: LunarLocation[] = [
  {
    id: "fullmoon",
    name: "Full Moon View",
    raRad: 0,
    decRad: 0,
    zoomDeg: 160,
    description: "",
  },
  {
    id: "tycho",
    name: "Tycho Crater",
    raRad: 0.1961802465497132,
    decRad: -0.7570596929102873,
    zoomDeg: 5,
    description: "One of the Moon's youngest and most prominent craters — 53 miles wide and 3 miles deep — formed ~108 million years ago. Bright rays extend nearly 1,000 miles across the surface, and a central peak over a mile high rises from an impact-melt floor.",
  },
  {
    id: "messier",
    name: "Messier Crater",
    raRad: 5.45751724,
    decRad: -0.034482756,
    zoomDeg: 2,
    description: "A small oval crater in the Sea of Fertility, shaped by a low-angle asteroid impact that skipped off the surface and formed a second crater (Messier A) to the west.",
  },
  {
    id: "vallis-schroteri",
    name: "Vallis Schröteri",
    raRad: 0.86079639,
    decRad: 0.43196899,
    zoomDeg: 3,
    description: "The largest sinuous rille on the Moon — a meandering channel over 125 miles long, likely formed from ancient lava flows originating at the Cobra Head volcanic vent near Herodotus Crater.",
  },
  {
    id: "jackson",
    name: "Jackson Crater",
    raRad: 2.84925,
    decRad: 0.383972,
    zoomDeg: 4,
    description: "A large far-side crater whose floor is blanketed with impact melt that cooled, shrank, and cracked — creating a dramatically fractured surface. Jackson also features a spectacular central peak complex.",
  },
  {
    id: "shackleton",
    name: "Shackleton Crater",
    raRad: 4.0404372,
    decRad: -1.563815,
    zoomDeg: 2,
    description: "Located near the lunar south pole, Shackleton's rim sits in near-permanent sunlight while its floor remains in eternal shadow. Possible water ice at its base makes it a prime target for future crewed lunar missions.",
  },
  {
    id: "apollo15",
    name: "Apollo 15 (1971)",
    raRad: 6.2220988,
    decRad: 0.45954519,
    zoomDeg: 3,
    description: "Astronauts in 1971 explored the Apennine Mountains (over 3 miles high) and Hadley Rille, a sinuous volcanic channel. The highlands here expose ancient crustal material blasted up by giant impacts billions of years ago.",
  },
  {
    id: "apollo16",
    name: "Apollo 16 (1972)",
    raRad: 6.014,
    decRad: -0.157,
    zoomDeg: 3,
    description: "The fifth crewed lunar landing in April 1972 targeted the rugged Descartes highland region. Its geological diversity — including high-albedo patches on the crater rim — yielded some of the most scientifically important samples of the Apollo program.",
  },
  {
    id: "apollo17",
    name: "Apollo 17 (1972)",
    raRad: 5.745,
    decRad: 0.35,
    zoomDeg: 3,
    description: "The final Apollo mission (December 1972) landed in Taurus-Littrow valley, chosen to sample both ancient highland material and younger volcanic deposits in one location. It remains the last time humans walked on the Moon.",
  },
];

const MOON_WTML_URL = "https://web.wwtassets.org/kiosk/2022/moon/moon_maps_v4.wtml";
const DEFAULT_MAP_NAME = "Moon LRO LROC WAC Global Morphology Mosaic 100m v3";
const CROSSFADE_STEPS = 30;
const CROSSFADE_DURATION_MS = 700;

export default defineComponent({
  name: "LunarViewer",

  extends: MiniDSBase,

  props: {
    wwtNamespace: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      mapsLoaded: false,
      positionSet: false,
      planetaryMaps: [] as string[],
      curMapIndex: 0,
      prevMapIndex: -1,
      isCrossfading: false,
      crossfadeTimer: null as ReturnType<typeof setInterval> | null,
      showLayerInfo: false,
      showCrossfadeSlider: false,
      showLocations: false,
      showHelp: false,
      manualOpacity: 100,
      selectedLocation: null as LunarLocation | null,
      enRoute: false,
    };
  },

  computed: {
    isLoading(): boolean {
      return !(this.mapsLoaded && this.positionSet);
    },

    currentMapMeta(): LayerMeta | undefined {
      const name = this.planetaryMaps[this.curMapIndex];
      return LAYER_META.find(m => m.wwtName === name);
    },

    locations(): LunarLocation[] {
      return LOCATIONS;
    },

    cssVars() {
      return {
        '--color-default': '#070021cc',
        '--app-content-height': '100%',
      };
    },
  },

  methods: {
    // Returns a human-friendly short name for any WWT imageset name.
    shortName(wwtName: string): string {
      const meta = LAYER_META.find(m => m.wwtName === wwtName);
      if (meta) return meta.displayName;
      // Fallback: strip "Moon " prefix and truncate
      return wwtName.replace(/^Moon\s+/i, '').split(' ').slice(0, 4).join(' ');
    },

    async initialize(): Promise<void> {
      // Apply basic WWT settings suitable for planet viewing
      this.applySetting(["showConstellationBoundries", false]); // typo in WWT is intentional
      this.applySetting(["showConstellationFigures", false]);
      this.applySetting(["showCrosshairs", false]);
      this.applySetting(["actualPlanetScale", true]);
      this.applySetting(["solarSystemCosmos", false]);
      this.applySetting(["solarSystemStars", false]);
      this.setClockSync(false);

      // Load the moon imageset collection
      await this.loadImageCollection({
        url: MOON_WTML_URL,
        loadChildFolders: true,
      });

      // Collect moon imagesets from WWT's registry
      const available = WWTControl.getImageSets().filter(
        img => img.get_referenceFrame() === "Moon" && img.get_name() !== "Moon"
      );

      // Order by LAYER_META first to control display order, then append any extras
      const ordered: string[] = [];
      for (const meta of LAYER_META) {
        if (available.some(img => img.get_name() === meta.wwtName)) {
          ordered.push(meta.wwtName);
        }
      }
      for (const img of available) {
        const name = img.get_name();
        if (name && !ordered.includes(name)) {
          ordered.push(name);
        }
      }
      this.planetaryMaps = ordered;

      if (this.planetaryMaps.length === 0) {
        console.warn("LunarViewer: no Moon imagesets found after loading WTML");
        this.mapsLoaded = true;
        this.positionSet = true;
        return;
      }

      // Prefer the standard WAC mosaic as default, fall back to first available
      const defaultIdx = this.planetaryMaps.indexOf(DEFAULT_MAP_NAME);
      this.curMapIndex = defaultIdx >= 0 ? defaultIdx : 0;

      const defaultName = this.planetaryMaps[this.curMapIndex];
      const defaultImg = available.find(img => img.get_name() === defaultName);

      if (defaultImg) {
        // setupForImageset switches WWT into planet mode for the Moon
        this.setupForImageset({ foreground: defaultImg, background: defaultImg });
      } else {
        this.setBackgroundImageByName(defaultName);
        this.setForegroundImageByName(defaultName);
      }
      this.setForegroundOpacity(100);

      // Start at a full-disk view
      await this.gotoRADecZoom({ raRad: 0, decRad: 0, zoomDeg: 160, instant: true });

      this.mapsLoaded = true;
      this.positionSet = true;
    },

    moveLeft(): void {
      if (this.isCrossfading || this.planetaryMaps.length === 0) return;
      const newIndex = this.curMapIndex === 0
        ? this.planetaryMaps.length - 1
        : this.curMapIndex - 1;
      this.switchToMap(newIndex);
    },

    moveRight(): void {
      if (this.isCrossfading || this.planetaryMaps.length === 0) return;
      const newIndex = this.curMapIndex === this.planetaryMaps.length - 1
        ? 0
        : this.curMapIndex + 1;
      this.switchToMap(newIndex);
    },

    switchToMap(newIndex: number): void {
      if (newIndex === this.curMapIndex || this.isCrossfading) return;

      const newName = this.planetaryMaps[newIndex];
      this.prevMapIndex = this.curMapIndex;
      this.curMapIndex = newIndex;
      this.showLayerInfo = false;

      // If the manual crossfade slider is open, just update the foreground
      // so the slider continues to blend old vs new
      if (this.showCrossfadeSlider) {
        const prevName = this.planetaryMaps[this.prevMapIndex];
        this.setBackgroundImageByName(prevName);
        this.setForegroundImageByName(newName);
        this.setForegroundOpacity(this.manualOpacity);
        return;
      }

      // Auto crossfade: set new map as foreground at opacity 0, animate to 100
      this.setForegroundImageByName(newName);
      this.setForegroundOpacity(0);
      this.isCrossfading = true;

      if (this.crossfadeTimer !== null) {
        clearInterval(this.crossfadeTimer);
        this.crossfadeTimer = null;
      }

      const intervalMs = CROSSFADE_DURATION_MS / CROSSFADE_STEPS;
      let step = 0;

      this.crossfadeTimer = setInterval(() => {
        step++;
        const opacity = Math.round((step / CROSSFADE_STEPS) * 100);
        this.setForegroundOpacity(Math.min(opacity, 100));

        if (step >= CROSSFADE_STEPS) {
          clearInterval(this.crossfadeTimer!);
          this.crossfadeTimer = null;
          // Promote foreground → background and reset
          this.setBackgroundImageByName(newName);
          this.setForegroundImageByName(newName);
          this.setForegroundOpacity(100);
          this.isCrossfading = false;
        }
      }, intervalMs);
    },

    goToPrevious(): void {
      if (this.prevMapIndex < 0) return;
      this.switchToMap(this.prevMapIndex);
    },

    // Toggle the manual crossfade slider.
    // When opened: background = compare map, foreground = current map.
    // Compare map is the previously viewed map, or an adjacent one if none yet.
    // When closed: restore background = current map.
    toggleCrossfadeSlider(): void {
      if (this.isCrossfading || this.planetaryMaps.length < 2) return;

      if (!this.showCrossfadeSlider) {
        // Pick the compare index: previous map if available, else the adjacent one
        const compareIndex = this.prevMapIndex >= 0
          ? this.prevMapIndex
          : (this.curMapIndex === 0 ? 1 : this.curMapIndex - 1);

        const compareName = this.planetaryMaps[compareIndex];
        const curName     = this.planetaryMaps[this.curMapIndex];

        this.prevMapIndex = compareIndex; // so the label updates
        this.setBackgroundImageByName(compareName);
        this.setForegroundImageByName(curName);
        this.manualOpacity = 100;
        this.setForegroundOpacity(100);
        this.showCrossfadeSlider = true;
      } else {
        // Restore: both BG and FG = current map at full opacity
        const curName = this.planetaryMaps[this.curMapIndex];
        this.setBackgroundImageByName(curName);
        this.setForegroundImageByName(curName);
        this.setForegroundOpacity(100);
        this.showCrossfadeSlider = false;
      }
    },

    applyManualOpacity(): void {
      this.setForegroundOpacity(this.manualOpacity);
    },

    gotoLocation(loc: LunarLocation): void {
      this.showLocations = false;
      this.enRoute = true;
      this.selectedLocation = loc.description ? loc : null;

      this.gotoRADecZoom({
        raRad: loc.raRad,
        decRad: loc.decRad,
        zoomDeg: loc.zoomDeg,
        instant: false,
      }).then(() => {
        this.enRoute = false;
        if (loc.description) {
          this.selectedLocation = loc;
        }
      });
    },

    doZoom(zoomIn: boolean): void {
      const factor = zoomIn ? 1 / 1.3 : 1.3;
      const newZoom = Math.max(0.25, Math.min(160, this.wwtZoomDeg * factor));
      this.gotoRADecZoom({
        raRad: this.wwtRARad,
        decRad: this.wwtDecRad,
        zoomDeg: newZoom,
        instant: true,
      });
    },

    onKeyDown(e: KeyboardEvent): void {
      if (e.code === "ArrowLeft")  this.moveLeft();
      else if (e.code === "ArrowRight") this.moveRight();
    },
  },

  mounted() {
    this.waitForReady().then(() => this.initialize());
    window.addEventListener("keydown", this.onKeyDown);
  },

  unmounted() {
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.crossfadeTimer !== null) {
      clearInterval(this.crossfadeTimer);
    }
  },
});
</script>

<style lang="less">

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  font-family: "Roboto Condensed", Verdana, Arial, Helvetica, sans-serif;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent !important;

  .v-application__wrap {
    min-height: unset;
  }
}

#main-content {
  position: relative;
  width: 100%;
  height: 100%;

  .wwtelescope-component {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
  }
}

// ── Transitions ──────────────────────────────────────────────────────────────

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

// ── Loading modal ─────────────────────────────────────────────────────────────

.modal {
  position: absolute;
  inset: 0;
  z-index: 100;
  color: #fff;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;

    .spinner {
      background-image: url("assets/lunar_loader.gif");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }

    p {
      margin: 0 0 0 1rem;
      font-size: 150%;
    }
  }
}

// ── Map selector bar ──────────────────────────────────────────────────────────

#map-controls-container {
  position: absolute;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 24px;
  padding: 0.35rem 0.75rem;
  backdrop-filter: blur(4px);
}

.map-nav-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    color: #2aa5f7;
    background: rgba(42, 165, 247, 0.12);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}

.map-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  border: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  -webkit-tap-highlight-color: transparent;
  padding: 0;

  &.active {
    background: #2aa5f7;
    transform: scale(1.2);
  }

  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.65);
  }
}

// ── Map name display ───────────────────────────────────────────────────────────

#map-name-display {
  position: absolute;
  top: 3.8rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-shadow: 1px 1px 4px rgba(0,0,0,0.9);
  white-space: nowrap;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 12px;
  transition: background 0.15s;

  &:hover {
    background: rgba(255,255,255,0.08);
  }
}

// ── Previous map button ────────────────────────────────────────────────────────

#previous-btn {
  position: absolute;
  top: 1.25rem;
  left: 1rem;
  z-index: 10;
  background: rgba(0,0,0,0.35);
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 6px 10px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: #2aa5f7;
    background: rgba(0,0,0,0.55);
  }
}

// ── Right-side controls ────────────────────────────────────────────────────────

#controls {
  position: absolute;
  top: 1.25rem;
  right: 1rem;
  z-index: 10;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  li {
    color: #fff;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 1.05rem;
    transition: color 0.15s, background 0.15s;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: #2aa5f7;
      background: rgba(0,0,0,0.35);
    }

    &.control-active {
      color: #2aa5f7;
    }

    &.control-disabled {
      opacity: 0.3;
      cursor: default;
      pointer-events: none;
    }
  }
}

// ── Rocket button ──────────────────────────────────────────────────────────────

#rocket-btn {
  position: absolute;
  bottom: 2.5rem;
  left: 1.5rem;
  z-index: 10;
  background: rgba(0,0,0,0.45);
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.4rem;
  padding: 10px 14px;
  border-radius: 50%;
  backdrop-filter: blur(4px);
  transition: color 0.15s, background 0.15s, transform 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover,
  &.rocket-active {
    color: #2aa5f7;
    background: rgba(0,0,0,0.65);
    transform: scale(1.08);
  }
}

// ── Crossfade slider panel ─────────────────────────────────────────────────────

#crossfade-panel {
  position: absolute;
  bottom: 3.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0,0,0,0.55);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.78rem;
}

.cf-label {
  max-width: 7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.85;
}

.opacity-range {
  width: 40vw;
  max-width: 280px;
  cursor: pointer;
  accent-color: #2aa5f7;
}

// ── Areas of interest panel ────────────────────────────────────────────────────

#locations-panel {
  position: absolute;
  bottom: 5.5rem;
  left: 1rem;
  z-index: 10;
  width: min(280px, 80vw);
  background: rgba(0,0,0,0.72);
  border-radius: 14px;
  padding: 0.75rem;
  color: #fff;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 10px rgba(0,0,0,0.5);

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;

    h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
  }
}

.locations-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.location-item {
  cursor: pointer;
  padding: 0.45rem 0.5rem;
  border-radius: 8px;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(42, 165, 247, 0.18);
    color: #8dd4fc;
  }

  &.location-active {
    color: #2aa5f7;
  }
}

.location-icon {
  font-size: 0.75rem;
  opacity: 0.7;
}

// ── Location description popup ─────────────────────────────────────────────────

#location-description {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: min(500px, 90vw);
  max-height: 35vh;
  overflow-y: auto;
  background: rgba(0,0,0,0.72);
  border-radius: 16px;
  padding: 1rem 1.2rem;
  color: #fff;
  font-size: 0.9rem;
  line-height: 1.5;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 16px rgba(42,165,247,0.25);

  strong {
    display: block;
    font-size: 1.05rem;
    margin-bottom: 0.35rem;
  }

  p {
    margin: 0 0 0.5rem 0;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
  }
  &::-webkit-scrollbar-thumb {
    background: #2aa5f7;
    border-radius: 6px;
  }
}

// ── Layer info overlay ─────────────────────────────────────────────────────────

#layer-info-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.layer-info-panel {
  position: relative;
  background: rgba(10,15,30,0.95);
  border-radius: 18px;
  padding: 1.5rem 1.75rem 1.25rem;
  color: #fff;
  max-width: min(520px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 32px rgba(42,165,247,0.2), 0 4px 24px rgba(0,0,0,0.7);

  h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  p {
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
    opacity: 0.9;
  }
}

.info-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
}

.legend-img {
  display: block;
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

// ── Help overlay ───────────────────────────────────────────────────────────────

#help-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(3px);
}

.help-box {
  background: rgba(10,15,30,0.95);
  border-radius: 18px;
  padding: 1.5rem 2rem;
  color: #fff;
  max-width: min(480px, 90vw);
  box-shadow: 0 0 32px rgba(42,165,247,0.2), 0 4px 24px rgba(0,0,0,0.7);
  cursor: default;

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
  }
}

.help-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.help-icons {
  display: flex;
  gap: 4px;
  color: #2aa5f7;
  min-width: 2rem;
  justify-content: center;
  flex-shrink: 0;
  padding-top: 1px;
}

// ── Shared utilities ───────────────────────────────────────────────────────────

.panel-close-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 6px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;

  &:hover {
    color: #fff;
    background: rgba(255,255,255,0.08);
  }
}

.dismiss-hint {
  display: block;
  font-size: 0.72rem;
  opacity: 0.5;
  margin-top: 0.25rem;
  text-align: center;
}

// ── Credits ────────────────────────────────────────────────────────────────────

#credits {
  position: absolute;
  bottom: 0.5rem;
  right: 0.75rem;
  z-index: 10;
  color: rgba(255,255,255,0.7);
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 4px;

  a {
    display: inline-flex;
    align-items: center;
  }

  img {
    height: 18px;
    vertical-align: middle;
  }
}
</style>
