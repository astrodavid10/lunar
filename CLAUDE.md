# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run serve      # local dev server
npm run build      # Python preprocessing + webpack production build
npm run lint       # ESLint (no autofix)
npm run clean      # remove dist/
```

The build runs `python modify_index.py` before webpack. That script patches one line out of `node_modules/@wwtelescope/engine/src/index.js` (a zoom-clamp line that conflicts with the lunar viewer's zoom behavior). If the pattern is already absent the script exits silently, so it is always safe to run.

## Architecture

### What it does
An interactive Moon exploration viewer rendered in WorldWide Telescope (WWT) planet mode. Users can switch between seven lunar imageset layers (CGI photorealistic, LRO WAC, SELENE Kaguya, LOLA elevation, ColorShade elevation, Clementine mineral, and the Unified Geologic Map), crossfade between any two, and fly to nine named sites (craters, rilles, Apollo landing sites).

### Main component: `src/lunar-viewer.vue`

The entire app lives here. It extends `MiniDSBase` from `@cosmicds/vue-toolkit`, which wraps the `@wwtelescope/engine-pinia` store and mixes all WWT actions and getters into the component instance. There is no Vuex; state flows through Pinia.

**Initialization sequence** (`mounted` → `waitForReady()` → `initialize()`):
1. Apply WWT settings (hide constellations, crosshairs, etc.; disable clock sync).
2. `loadImageCollection()` with `https://web.wwtassets.org/kiosk/2022/moon/moon_maps_v4.wtml`.
3. `WWTControl.getImageSets()` filtered by `referenceFrame === "Moon"` to collect the available imagesets.
4. Order them by `LAYER_META` (module-level const) — this controls dot-button display order. Imagesets not in `LAYER_META` are appended at the end.
5. `setupForImageset({ foreground, background })` with the default map — this is what switches WWT from sky mode into planet/Moon mode.
6. `gotoRADecZoom()` to the full-disk view, then set `mapsLoaded` and `positionSet` to `true` (which clears `isLoading`).

**Loading guard**: `isLoading` is `!(mapsLoaded && positionSet)`. All UI elements are hidden behind `v-show="!isLoading"` until both flags are set. If initialization throws (e.g., WTML fails), those flags never set and the UI stays hidden.

### Map switching and crossfade

`switchToMap(newIndex)` drives all map changes:
- Stores the previous index in `prevMapIndex` for the "return" button and compare slider.
- If the **manual compare slider is open**, it updates foreground only (leaving the user-controlled blend intact).
- Otherwise it auto-crossfades: sets the new map as foreground at opacity 0, then a `setInterval` loop over 30 steps × 23 ms increments opacity to 100, then promotes foreground → background (`setBackgroundImageByName`) and calls `setForegroundOpacity(100)`.

The **manual compare slider** (`toggleCrossfadeSlider`) sets the background to the previous (or adjacent) map and the foreground to the current map, then exposes an `<input type="range">` bound to `manualOpacity` that calls `setForegroundOpacity()` on input. Closing it restores both BG and FG to the current map.

Key WWT methods used for this (all available via `MiniDSBase`):
- `setBackgroundImageByName(name)` / `setForegroundImageByName(name)`
- `setForegroundOpacity(0–100)`
- `setupForImageset({ foreground: Imageset, background?: Imageset })`

### Location navigation

`LOCATIONS` (module-level array) holds `{ id, name, raRad, decRad, zoomDeg, description }`. In Moon/planet mode, `raRad`/`decRad` are lunar longitude/latitude in radians. `gotoLocation(loc)` calls `gotoRADecZoom()` with `instant: false` for the smooth fly-to, sets `selectedLocation` to show the description popup, and clears `enRoute` when the promise resolves.

### Adding or updating content

**New map layer**: Add an entry to `LAYER_META` (in `lunar-viewer.vue`) with the exact WWT imageset name as it appears in `moon_maps_v4.wtml`. The order in `LAYER_META` is the display order of the dot buttons. If the imageset has a color legend, put the image in `src/assets/` and reference it with `legendSrc`.

**New location**: Add to the `LOCATIONS` array. Coordinates are in radians (Moon longitude/latitude). `zoomDeg` around 2–5 works well for craters; 160 = full disk.

### Key files

| File | Role |
|------|------|
| `src/lunar-viewer.vue` | Entire app: WWT Moon integration, map switching, crossfade, location nav, UI |
| `src/main.ts` | App bootstrap — mounts LunarViewer, registers WWT pinia, Vuetify, FontAwesome |
| `src/assets/common.less` | Global styles (layout, loading modal, fonts) |
| `src/assets/lola-legend.png` | Legend overlay for the LOLA elevation layer |
| `src/assets/colorshade-legend.png` | Legend overlay for the LROC ColorShade layer |
| `modify_index.py` | Patches a zoom-clamp line out of the WWT engine bundle at build time |
| `plugins/vuetify.ts` | Vuetify 3 instance (dark theme, MDI icons) |

**Note**: `src/exo-sonification.vue`, `src/wwt-hacks.ts`, `src/exoplanetData.ts`, and related audio/data files still exist in the repo but are no longer imported or active. `main.ts` mounts `LunarViewer`; the exoplanet component is dormant.

### WWT + Vue 3 integration notes

- The component must extend `MiniDSBase` (not use it as a plugin) for the WWT store actions to be available as `this.*` methods.
- `wwt-namespace` passed to `<WorldWideTelescope>` and to `wwtPinia` (via `main.ts`) must match; currently `"wwt-lunar-viewer"`.
- Font Awesome icons use the CDN CSS (`<link>` in the template), not the JS-bundled FA component — `<i class="fas fa-*">` syntax only.
- `common.less` uses Vue 2 fade-transition class names (`.fade-enter`, `.fade-leave-to`). The component overrides these with the correct Vue 3 names (`.fade-enter-from`).
- `--app-content-height` CSS variable must be set on the root element (done via `cssVars` computed returning `{ '--app-content-height': '100%' }`) because `common.less` uses it on `#main-content`.
