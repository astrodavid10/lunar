# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn serve        # local dev server
yarn build        # production build into dist/ (no source maps)
yarn lint         # ESLint (no autofix)
yarn typecheck    # vue-tsc --noEmit
yarn clean        # remove dist/
```

Yarn 4 with the `node-modules` linker (`.yarnrc.yml`). CI (`.github/workflows/build.yml`) runs install → lint → typecheck → build on every push, and `deploy.yml` publishes `dist/` to GitHub Pages from `main`.

After changing dependencies, check `yarn why vue` shows a single Vue version; two copies (one nested under `@wwtelescope/engine-pinia`) break both types and reactivity. `yarn dedupe` fixes it.

## Architecture

### What it does
"Moon Maps": a Moon explorer in WorldWide Telescope planet mode. Seven global imagesets (true color, LRO WAC, Kaguya, LOLA elevation, ColorShade, Clementine minerals, USGS geology), a compare slider, 33 sites drawn on the surface, three guided tours, overlays (maria, 1.3 M craters, names and grid), Tonight's Moon (real terminator and phase), terrain sonification, and a kiosk mode.

### Main pieces
| File | Role |
|------|------|
| `src/lunar-viewer.vue` | Orchestrator: boot, map switching and crossfade, compare, sites, tours, Tonight, Listen, kiosk, deep links, layout measurement |
| `src/components/SurfaceOverlay.vue` | Canvas + HTML overlay on the WWT canvas: site markers, maria, craters, night shading, names/grid, listen line. Emits HUD readings (`@hud`) |
| `src/components/{IntroDialog,ExplorePanel,SiteCard,TourPanel,LoadingMoon}.vue` | Splash, site gallery, site detail, tour player, loader |
| `src/globe.ts` | Planet-mode projection: lat/lon ↔ screen, visibility, limb snapping |
| `src/flight.ts` | Cinematic fly-to (custom engine mover: rise, pan, dive; smootherstep) |
| `src/ephemeris.ts` | Subsolar point and phase (Meeus ch. 25/47/53) |
| `src/elevation.ts`, `src/audio.ts` | LOLA height grid; Web Audio chimes and profile sonification |
| `src/maria.ts`, `src/craters.ts` | Mare polygons; tiered crater tiles via HTTP Range |
| `src/data/{layers,sites,tours,features}.ts` | All content: layer captions/credits, sites, tours, IAU labels |
| `src/boot.ts`, `src/kiosk.ts`, `src/kioskStats.ts`, `src/urlParams.ts`, `src/KioskQrModal.vue` | Copied verbatim from the JWST app; keep them in sync with it rather than editing here |
| `public/data/` | Generated data (see `tools/`) |
| `tools/` | Scripts that regenerate `public/data` from the original PDS/LROC sources |

The component extends `WWTAwareComponent` from `@wwtelescope/engine-pinia` (not `@cosmicds/vue-toolkit`). `wwt-namespace` must match between `main.ts` and the `<WorldWideTelescope>` element (`"wwt-lunar-viewer"`).

### WWT planet-mode conventions (verified against the engine)
- Site coordinates are selenographic degrees, east-positive. `gotoRADecZoom` takes `raRad = −eastLon`; the camera's `lng` equals east longitude.
- A surface point is `Coordinates.geoTo3d(lat, lon + 180)` on a unit sphere. The canvas is sized in CSS pixels, so projected points position HTML directly.
- `WWTControl.addFrameCallback` (engine ≥ 7.36) runs after each render; the overlay redraws there, only when the camera or inputs change.
- Engine zoom is a vertical FOV; `wholeMoon()` scales it on portrait screens.

### Layout rules
UI chrome is measured, not assumed. `measureLayout()` (ResizeObserver) publishes `--top-reserve`, `--reserve-left`, `--reserve-right` and `--tools-w` on `#main-content`; side panels size into that space. The bottom bar is one CSS grid (launchers | dock | HUD stack) that re-flows at 960 px, 640 px, and for short screens (≤ 500 px tall). Global `box-sizing: border-box` is required for the `max-height` caps to hold. When changing layout, re-run an overlap check at desktop, tablet, portrait and landscape phone sizes.

### Theme
Tokens live in `src/assets/common.less` (`--accent-rgb` drives every translucent accent). Program colors: Apollo gold, robotic mint, Artemis orchid, features bone; markers also differ by shape. Canvas colors in `SurfaceOverlay.vue` are literals and must be changed alongside the tokens.

### Adding content
- **Map layer**: add to `LAYER_META` in `src/data/layers.ts` with the exact imageset name from `moon_maps_v4.wtml`; legends are imported images.
- **Site**: add to `SITES` in `src/data/sites.ts` (lat, east lon, zoom). Only use photo URLs verified against the NASA Image Library API.
- **Tour stop**: add to `src/data/tours.ts`; each stop names a site and the layer to show.

### Data credits
Maps: NASA LRO (LROC, LOLA), JAXA SELENE/Kaguya, NASA/DoD Clementine, USGS. Craters: Robbins (2019) JGR Planets 124, doi:10.1029/2018JE005592. Maria: LROC, Nelson et al. (2014) LPSC 45, 2861. Elevation: LRO LOLA LDEM_4 via PDS.
