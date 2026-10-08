<template>
  <div class="surface-overlay" ref="root">
    <canvas ref="canvas" class="surface-canvas" aria-hidden="true"></canvas>

    <!-- Site markers: real buttons, positioned every frame without re-rendering. -->
    <div class="marker-layer" role="group" aria-label="Sites on the Moon">
      <button
        v-for="site in sites"
        :key="site.id"
        :ref="(el) => setMarkerRef(site.id, el)"
        type="button"
        class="site-marker"
        :class="[`program-${site.program}`, { selected: site.id === selectedId }]"
        :aria-label="`${site.name}${site.date ? ', ' + site.date : ''}`"
        :aria-pressed="site.id === selectedId"
        @click="$emit('select', site)"
        @pointerenter="hover(site)"
        @pointerleave="hover(null)"
        @focus="hover(site)"
        @blur="hover(null)"
      >
        <span class="marker-shape" aria-hidden="true"></span>
        <span class="marker-label">{{ site.name }}</span>
      </button>
    </div>

    <!-- Listen mode: drag a line across the surface. -->
    <div
      v-if="listenMode"
      class="listen-capture"
      @pointerdown="listenDown"
      @pointermove="listenMove"
      @pointerup="listenUp"
      @pointercancel="listenCancel"
    ></div>

  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw, PropType } from "vue";
import { GlobeProjector, ScreenPoint, surfacePoint, Vec3, dot, wwtControl } from "../globe";
import { elevationAt, ProfileSample } from "../elevation";
import { FEATURES } from "../data/features";
import { loadMaria, mariaLoaded, mareAt, mareDisplayName } from "../maria";
import {
  TIERS, CraterList, largeCraters, loadLargeCraters, craterTile, requestTile, tileId, setCraterTileListener,
} from "../craters";
import type { Site } from "../data/sites";

const D2R = Math.PI / 180;
const LABEL_ZOOM = 50;      // below this camera zoom, every visible marker shows its name
const TWILIGHT_STEPS = 6;   // bands of increasing darkness past the terminator

function niceKm(target: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / pow;
  const nice = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return nice * pow;
}

function formatLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}  ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

/** Two unit vectors perpendicular to n (and each other). */
function basis(n: Vec3): [Vec3, Vec3] {
  const a: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u: Vec3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  const ul = Math.hypot(...u);
  u[0] /= ul; u[1] /= ul; u[2] /= ul;
  const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return [u, v];
}

export default defineComponent({
  name: "SurfaceOverlay",

  props: {
    sites: { type: Array as PropType<Site[]>, required: true },
    selectedId: { type: String as PropType<string | null>, default: null },
    showLabels: { type: Boolean, default: false },
    showMaria: { type: Boolean, default: false },
    showCraters: { type: Boolean, default: false },
    subsolar: { type: Object as PropType<{ lat: number; lon: number } | null>, default: null },
    listenMode: { type: Boolean, default: false },
    profile: { type: Array as PropType<ProfileSample[] | null>, default: null },
    playhead: { type: Number, default: -1 },
  },

  emits: ["select", "hover", "listen-line", "hud"],

  data() {
    return {
      // Per-frame runtime state, deliberately not reactive.
      rt: markRaw({
        projector: new GlobeProjector(),
        markerEls: new Map<string, HTMLElement>(),
        hovered: null as string | null,
        pointer: null as { x: number; y: number } | null,
        draft: null as { a: { lat: number; lon: number }; x0: number; y0: number; x1: number; y1: number } | null,
        lastKey: "",
        lastHudMs: 0,
        frameCb: null as (() => void) | null,
        fallbackRaf: 0,
        scratch: { x: 0, y: 0, visible: false, facing: 0 } as ScreenPoint,
        // Craters drawn in the last frame: screen x, y, radius px, diameter km.
        drawnCraters: new Float32Array(0),
        drawnCount: 0,
        // Craters >= 1 km centered on screen, and whether every tile they need was loaded.
        densityCount: 0,
        densityComplete: false,
        mariaCanvas: null as HTMLCanvasElement | null,
        lastHud: "",
      }),
      hud: {
        pointer: false,
        coords: "",
        elevation: "",
        scaleKm: "",
        scalePx: 0,
        farSide: false,
        terrain: "",
        crater: "",
        density: "",
      },
    };
  },

  mounted() {
    const onFrame = (): void => this.frame();
    this.rt.frameCb = onFrame;
    const attach = (): void => {
      const ctl = wwtControl() as unknown as { addFrameCallback?: (cb: () => void) => void } | null;
      if (ctl?.addFrameCallback) {
        ctl.addFrameCallback(onFrame);
      } else {
        // Engine not ready yet (or < 7.36): poll with rAF until it is.
        this.rt.fallbackRaf = requestAnimationFrame(() => { this.frame(); attach(); });
      }
    };
    attach();
    setCraterTileListener(() => { this.rt.lastKey = ""; });
    if (this.showMaria) { loadMaria().then(() => { this.rt.lastKey = ""; }); }
    if (this.showCraters) { loadLargeCraters(); }
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerleave", this.onPointerLeave);
  },

  beforeUnmount() {
    const ctl = wwtControl() as unknown as { removeFrameCallback?: (cb: () => void) => void } | null;
    if (this.rt.frameCb) { ctl?.removeFrameCallback?.(this.rt.frameCb); }
    cancelAnimationFrame(this.rt.fallbackRaf);
    setCraterTileListener(null);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerleave", this.onPointerLeave);
  },

  watch: {
    showLabels() { this.rt.lastKey = ""; },
    showMaria(v: boolean) {
      this.rt.lastKey = "";
      if (v) { loadMaria().then(() => { this.rt.lastKey = ""; }); }
    },
    showCraters(v: boolean) {
      this.rt.lastKey = "";
      if (v) { loadLargeCraters(); }
    },
    subsolar() { this.rt.lastKey = ""; },
    profile() { this.rt.lastKey = ""; },
    playhead() { this.rt.lastKey = ""; },
    selectedId() { this.rt.lastKey = ""; },
    sites() { this.rt.lastKey = ""; },
  },

  methods: {
    setMarkerRef(id: string, el: unknown): void {
      if (el instanceof HTMLElement) { this.rt.markerEls.set(id, el); } else { this.rt.markerEls.delete(id); }
    },

    hover(site: Site | null): void {
      this.rt.hovered = site?.id ?? null;
      this.rt.lastKey = "";
      this.$emit("hover", site);
    },

    onPointerMove(ev: PointerEvent): void {
      const root = this.$refs.root as HTMLElement | undefined;
      if (!root) { return; }
      const r = root.getBoundingClientRect();
      this.rt.pointer = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    },

    onPointerLeave(): void {
      this.rt.pointer = null;
    },

    // ── Listen line ─────────────────────────────────────────────────────────
    listenDown(ev: PointerEvent): void {
      const a = this.rt.projector.pick(ev.offsetX, ev.offsetY);
      if (!a) { return; }
      (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
      this.rt.draft = { a, x0: ev.offsetX, y0: ev.offsetY, x1: ev.offsetX, y1: ev.offsetY };
      this.rt.lastKey = "";
    },
    listenMove(ev: PointerEvent): void {
      if (!this.rt.draft) { return; }
      this.rt.draft.x1 = ev.offsetX;
      this.rt.draft.y1 = ev.offsetY;
      this.rt.lastKey = "";
    },
    listenUp(ev: PointerEvent): void {
      const d = this.rt.draft;
      this.rt.draft = null;
      this.rt.lastKey = "";
      if (!d || Math.hypot(ev.offsetX - d.x0, ev.offsetY - d.y0) < 12) { return; }
      const b = this.rt.projector.pick(ev.offsetX, ev.offsetY);
      if (b) { this.$emit("listen-line", { a: d.a, b }); }
    },
    listenCancel(): void {
      this.rt.draft = null;
      this.rt.lastKey = "";
    },

    /** Public: profile endpoints for a line across the middle of the view. */
    centerLine(): { a: { lat: number; lon: number }; b: { lat: number; lon: number } } | null {
      const p = this.rt.projector;
      if (!p.ready) { return null; }
      const y = p.height / 2;
      let a = null;
      let b = null;
      for (let f = 0.1; f < 0.5 && !(a && b); f += 0.02) {
        a = a ?? p.pick(p.width * f, y);
        b = b ?? p.pick(p.width * (1 - f), y);
      }
      return a && b ? { a, b } : null;
    },

    // ── Per-frame update ────────────────────────────────────────────────────
    frame(): void {
      const p = this.rt.projector;
      if (!p.update()) { return; }
      const ctl = wwtControl();
      const cam = ctl?.renderContext.viewCamera;
      if (!cam) { return; }

      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined;
      if (!canvas) { return; }
      const key = `${cam.lat.toFixed(6)},${cam.lng.toFixed(6)},${cam.zoom.toFixed(6)},${p.width}x${p.height}`;
      const dirty = key !== this.rt.lastKey;
      if (dirty) {
        this.rt.lastKey = key;
        this.positionMarkers(cam.zoom);
        this.draw(canvas, cam.zoom);
      }

      const now = performance.now();
      if (now - this.rt.lastHudMs > 100) {
        this.rt.lastHudMs = now;
        this.updateHud(cam.lat, cam.lng);
      }
    },

    positionMarkers(zoom: number): void {
      const p = this.rt.projector;
      const pt = this.rt.scratch;
      for (const site of this.sites) {
        const el = this.rt.markerEls.get(site.id);
        if (!el) { continue; }
        p.project(site.lat, site.lon, pt);
        const onScreen = pt.visible && pt.x > -40 && pt.y > -40 && pt.x < p.width + 40 && pt.y < p.height + 40;
        if (!onScreen) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
        // Fade toward the limb so markers don't pile up on the edge.
        el.style.opacity = String(Math.min(1, 0.35 + pt.facing * 2.5));
        const labelled = zoom < LABEL_ZOOM || site.id === this.selectedId || site.id === this.rt.hovered;
        el.classList.toggle("labelled", labelled);
      }
    },

    draw(canvas: HTMLCanvasElement, zoom: number): void {
      const p = this.rt.projector;
      const dpr = window.devicePixelRatio || 1;
      const w = p.width;
      const h = p.height;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const g = canvas.getContext("2d");
      if (!g) { return; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      if (this.showMaria) { this.drawMaria(g); }
      if (this.showCraters) { this.drawCraters(g); }
      if (this.subsolar) { this.drawNight(g); }
      if (this.showLabels) {
        this.drawGraticule(g, zoom);
        this.drawFeatureLabels(g);
      }
      this.drawProfile(g);
    },

    // Night hemisphere: a cap around the antisolar point, in bands that get
    // darker away from the terminator. Each band is one path and one fill,
    // so adjacent quads don't double-blend at their shared edges.
    drawNight(g: CanvasRenderingContext2D): void {
      const p = this.rt.projector;
      const s = this.subsolar as { lat: number; lon: number };
      const anti = surfacePoint(-s.lat, s.lon + 180);
      const [u, v] = basis(anti);
      const azSteps = 64;
      const ring = (rho: number): ScreenPoint[] => {
        const out: ScreenPoint[] = [];
        const cr = Math.cos(rho * D2R);
        const sr = Math.sin(rho * D2R);
        for (let k = 0; k <= azSteps; k++) {
          const t = (k / azSteps) * 2 * Math.PI;
          const ct = Math.cos(t);
          const st = Math.sin(t);
          const q: Vec3 = [
            anti[0] * cr + (u[0] * ct + v[0] * st) * sr,
            anti[1] * cr + (u[1] * ct + v[1] * st) * sr,
            anti[2] * cr + (u[2] * ct + v[2] * st) * sr,
          ];
          out.push(p.projectOnDisk(q));
        }
        return out;
      };
      // Band edges, from the terminator (90°) inward toward the antisolar point.
      const edges = [90, 88, 86, 84, 81, 78, 74, 60, 45, 30, 15, 0];
      const rings = edges.map(ring);
      for (let b = 0; b < edges.length - 1; b++) {
        const a = rings[b];
        const c = rings[b + 1];
        const depth = Math.min(1, (b + 1) / TWILIGHT_STEPS);
        g.beginPath();
        for (let k = 0; k < azSteps; k++) {
          const q = [a[k], a[k + 1], c[k + 1], c[k]];
          if (!q.some(x => x.visible)) { continue; }
          g.moveTo(q[0].x, q[0].y);
          g.lineTo(q[1].x, q[1].y);
          g.lineTo(q[2].x, q[2].y);
          g.lineTo(q[3].x, q[3].y);
          g.closePath();
        }
        g.fillStyle = `rgba(3, 4, 10, ${(0.18 + 0.6 * depth).toFixed(3)})`;
        g.fill("nonzero");
      }
      // Terminator line.
      const term = rings[0];
      g.beginPath();
      let pen = false;
      for (const q of term) {
        if (q.visible) {
          if (pen) { g.lineTo(q.x, q.y); } else { g.moveTo(q.x, q.y); pen = true; }
        } else {
          pen = false;
        }
      }
      g.strokeStyle = "rgba(255, 210, 130, 0.55)";
      g.lineWidth = 1.2;
      g.stroke();
    },

    // Mare basalts. Each polygon is filled opaquely on an offscreen canvas
    // (evenodd within a polygon keeps its highland islands open), then the
    // result is composited once with alpha, so polygons that overlap their
    // neighbors neither cancel out nor double-darken. Outlines are stroked
    // only between visible vertices, so nothing is drawn past the limb.
    drawMaria(g: CanvasRenderingContext2D): void {
      const polys = mariaLoaded();
      if (!polys) { return; }
      const p = this.rt.projector;
      const pt = this.rt.scratch;
      const v: Vec3 = [0, 0, 0];
      const main = g.canvas;
      let off = this.rt.mariaCanvas;
      if (!off) { off = this.rt.mariaCanvas = document.createElement("canvas"); }
      if (off.width !== main.width || off.height !== main.height) {
        off.width = main.width;
        off.height = main.height;
      }
      const og = off.getContext("2d");
      if (!og) { return; }
      og.setTransform(g.getTransform());
      og.clearRect(0, 0, p.width, p.height);
      og.fillStyle = "#9680ff";
      const outline = new Path2D();
      for (const poly of polys) {
        if (!p.capMayBeVisible(poly.center, poly.radius)) { continue; }
        og.beginPath();
        for (const ring of poly.rings) {
          const xyz = ring.xyz;
          let pen = false;
          let firstVisible = false;
          let fx = 0;
          let fy = 0;
          for (let i = 0; i < xyz.length; i += 3) {
            v[0] = xyz[i]; v[1] = xyz[i + 1]; v[2] = xyz[i + 2];
            p.projectOnDisk(v, pt);
            if (i === 0) {
              og.moveTo(pt.x, pt.y);
              firstVisible = pt.visible;
              fx = pt.x;
              fy = pt.y;
            } else {
              og.lineTo(pt.x, pt.y);
            }
            if (pt.visible) {
              if (pen) { outline.lineTo(pt.x, pt.y); } else { outline.moveTo(pt.x, pt.y); pen = true; }
            } else {
              pen = false;
            }
          }
          og.closePath();
          if (pen && firstVisible) { outline.lineTo(fx, fy); }
        }
        og.fill("evenodd");
      }
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 0.24;
      g.drawImage(off, 0, 0);
      g.restore();
      g.strokeStyle = "rgba(186, 170, 255, 0.85)";
      g.lineWidth = 1.1;
      g.stroke(outline);
    },

    // Crater rims. Each crater is drawn as the projection of its circle on
    // the sphere (an ellipse foreshortened toward the limb), and only when it
    // would be at least a few pixels across.
    drawCraters(g: CanvasRenderingContext2D): void {
      const p = this.rt.projector;
      const w = p.width;
      const h = p.height;
      const kmPerPx = p.kmPerPixel(w / 2, h / 2) ?? (Math.PI * 1737.4) / Math.max(w, h);
      // At least ~9 px across, so the whole-Moon view shows the big ones, not a carpet.
      const minKm = Math.max(1, kmPerPx * 9);
      const maxDrawn = 9000;

      // Which tiles cover the view? Sample a grid of screen points.
      let viewOnDisk = true;
      const tierIds = TIERS.map(() => new Set<number>());
      for (let gy = 0; gy <= 8; gy++) {
        for (let gx = 0; gx <= 10; gx++) {
          const ll = p.pick((gx / 10) * w, (gy / 8) * h);
          if (!ll) { viewOnDisk = false; continue; }
          TIERS.forEach((tier, t) => {
            if (minKm < tier.maxKm) { tierIds[t].add(tileId(tier, ll.lat, ll.lon)); }
          });
        }
      }

      const lists: CraterList[] = [];
      const big = largeCraters();
      if (big) { lists.push(big); }
      let complete = !!big;
      let smallTiles = 0;
      TIERS.forEach((tier, t) => {
        if (minKm >= tier.maxKm) { return; }
        // Include neighbors so craters centered just off-tile still draw.
        const ids = new Set<number>();
        tierIds[t].forEach(id => {
          const r = Math.floor(id / tier.cols);
          const c = id % tier.cols;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              if (rr < 0 || rr >= tier.rows) { continue; }
              ids.add(rr * tier.cols + ((c + dc + tier.cols) % tier.cols));
            }
          }
        });
        if (tier.name === "small") { smallTiles = ids.size; }
        ids.forEach(id => {
          const list = craterTile(tier, id);
          if (list) { lists.push(list); } else { requestTile(tier, id); complete = false; }
        });
      });

      if (this.rt.drawnCraters.length < maxDrawn * 4) { this.rt.drawnCraters = new Float32Array(maxDrawn * 4); }
      const drawn = this.rt.drawnCraters;
      let n = 0;
      let density = 0;
      const c = this.rt.scratch;
      const e: ScreenPoint = { x: 0, y: 0, visible: false, facing: 0 };
      const nn: ScreenPoint = { x: 0, y: 0, visible: false, facing: 0 };
      const kmPerDeg = (Math.PI * 1737.4) / 180;
      const seg = 20;
      g.beginPath();
      for (const list of lists) {
        for (let i = 0; i < list.length; i += 3) {
          const lat = list[i];
          const lon = list[i + 1];
          const d = list[i + 2];
          p.project(lat, lon, c);
          if (!c.visible) { continue; }
          if (d >= 1 && c.x >= 0 && c.y >= 0 && c.x <= w && c.y <= h) { density++; }
          if (d < minKm || n >= maxDrawn) { continue; }
          const rDeg = d / 2 / kmPerDeg;
          const coslat = Math.max(0.02, Math.cos((lat * Math.PI) / 180));
          p.project(lat, lon + rDeg / coslat, e);
          p.project(Math.min(89.999, lat + rDeg), lon, nn);
          const ax = e.x - c.x;
          const ay = e.y - c.y;
          const bx = nn.x - c.x;
          const by = nn.y - c.y;
          const rPx = Math.max(Math.hypot(ax, ay), Math.hypot(bx, by));
          if (c.x + rPx < 0 || c.y + rPx < 0 || c.x - rPx > w || c.y - rPx > h) { continue; }
          for (let k = 0; k <= seg; k++) {
            const t = (k / seg) * 2 * Math.PI;
            const x = c.x + ax * Math.cos(t) + bx * Math.sin(t);
            const y = c.y + ay * Math.cos(t) + by * Math.sin(t);
            if (k === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
          }
          drawn[4 * n] = c.x;
          drawn[4 * n + 1] = c.y;
          drawn[4 * n + 2] = rPx;
          drawn[4 * n + 3] = d;
          n++;
        }
      }
      g.strokeStyle = "rgba(255, 214, 102, 0.62)";
      g.lineWidth = 1;
      g.stroke();
      this.rt.drawnCount = n;
      this.rt.densityCount = density;
      // Density is only meaningful once every crater down to 1 km is loaded for the whole view.
      this.rt.densityComplete = complete && viewOnDisk && minKm <= 1.0001 && smallTiles > 0;
    },

    drawGraticule(g: CanvasRenderingContext2D, zoom: number): void {
      const p = this.rt.projector;
      const step = zoom < 25 ? 10 : zoom < 70 ? 15 : 30;
      const pt = this.rt.scratch;
      const line = (coords: [number, number][], strong: boolean): void => {
        g.beginPath();
        let pen = false;
        for (const [lat, lon] of coords) {
          p.project(lat, lon, pt);
          if (pt.visible) {
            if (pen) { g.lineTo(pt.x, pt.y); } else { g.moveTo(pt.x, pt.y); pen = true; }
          } else {
            pen = false;
          }
        }
        g.strokeStyle = strong ? "rgba(125, 207, 255, 0.5)" : "rgba(125, 207, 255, 0.22)";
        g.lineWidth = strong ? 1.1 : 0.8;
        g.stroke();
      };
      for (let lon = -180; lon < 180; lon += step) {
        const coords: [number, number][] = [];
        for (let lat = -90; lat <= 90; lat += 2) { coords.push([lat, lon]); }
        line(coords, lon === 0);
      }
      for (let lat = -90 + step; lat < 90; lat += step) {
        const coords: [number, number][] = [];
        for (let lon = -180; lon <= 180; lon += 2) { coords.push([lat, lon]); }
        line(coords, lat === 0);
      }
    },

    drawFeatureLabels(g: CanvasRenderingContext2D): void {
      const p = this.rt.projector;
      const kmPerPx = p.kmPerPixel(p.width / 2, p.height / 2) ?? (Math.PI * 1737.4) / Math.max(p.width, p.height);
      const pt = this.rt.scratch;
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const f of FEATURES) {
        p.project(f.lat, f.lon, pt);
        if (!pt.visible || pt.facing < 0.12) { continue; }
        const sizePx = f.km / kmPerPx;
        if (sizePx < 46 || sizePx > Math.max(p.width, p.height) * 2.2) { continue; }
        const alpha = Math.min(1, (sizePx - 46) / 50) * Math.min(1, pt.facing * 3);
        const big = f.kind === "mare" || f.kind === "basin";
        g.font = big
          ? "italic 500 13px 'Roboto Condensed Variable', 'Roboto Condensed', sans-serif"
          : "500 12px 'Roboto Condensed Variable', 'Roboto Condensed', sans-serif";
        const text = big ? f.name.toUpperCase() : f.name;
        g.lineWidth = 3;
        g.strokeStyle = `rgba(0, 0, 0, ${(0.65 * alpha).toFixed(3)})`;
        g.strokeText(text, pt.x, pt.y);
        g.fillStyle = big ? `rgba(225, 220, 208, ${(0.85 * alpha).toFixed(3)})` : `rgba(214, 238, 255, ${alpha.toFixed(3)})`;
        g.fillText(text, pt.x, pt.y);
      }
    },

    drawProfile(g: CanvasRenderingContext2D): void {
      const d = this.rt.draft;
      if (d) {
        g.beginPath();
        g.moveTo(d.x0, d.y0);
        g.lineTo(d.x1, d.y1);
        g.strokeStyle = "rgba(125, 207, 255, 0.9)";
        g.setLineDash([6, 5]);
        g.lineWidth = 2;
        g.stroke();
        g.setLineDash([]);
      }
      const prof = this.profile;
      if (!prof || prof.length < 2) { return; }
      const p = this.rt.projector;
      g.beginPath();
      let pen = false;
      for (const s of prof) {
        const q = p.project(s.lat, s.lon);
        if (q.visible) {
          if (pen) { g.lineTo(q.x, q.y); } else { g.moveTo(q.x, q.y); pen = true; }
        } else {
          pen = false;
        }
      }
      g.strokeStyle = "rgba(125, 207, 255, 0.95)";
      g.lineWidth = 2.5;
      g.stroke();
      if (this.playhead >= 0) {
        const s = prof[Math.min(prof.length - 1, Math.round(this.playhead * (prof.length - 1)))];
        const q = p.project(s.lat, s.lon);
        if (q.visible) {
          g.beginPath();
          g.arc(q.x, q.y, 6, 0, 2 * Math.PI);
          g.fillStyle = "#ffffff";
          g.fill();
          g.lineWidth = 2;
          g.strokeStyle = "rgba(125, 207, 255, 1)";
          g.stroke();
        }
      }
    },

    updateHud(camLat: number, camLng: number): void {
      const p = this.rt.projector;
      let at: { lat: number; lon: number } | null = null;
      if (this.rt.pointer) { at = p.pick(this.rt.pointer.x, this.rt.pointer.y); }
      const pointer = at !== null;
      if (!at) {
        let lon = camLng;
        while (lon > 180) { lon -= 360; }
        while (lon < -180) { lon += 360; }
        at = { lat: camLat, lon };
      }
      const elev = elevationAt(at.lat, at.lon);
      const kmPerPx = p.kmPerPixel(p.width / 2, p.height / 2);
      let scaleKm = "";
      let scalePx = 0;
      if (kmPerPx) {
        const km = niceKm(kmPerPx * 110);
        scalePx = Math.round(km / kmPerPx);
        scaleKm = km >= 1 ? `${km.toLocaleString()} km` : `${Math.round(km * 1000)} m`;
      }
      // The near side is the hemisphere centered on 0°, 0° (libration aside).
      const viewDir = surfacePoint(0, 0);
      const center = surfacePoint(camLat, camLng);
      this.hud.pointer = pointer;
      this.hud.coords = formatLatLon(at.lat, at.lon);
      this.hud.elevation = elev === null ? "" : `${elev >= 0 ? "+" : "−"}${(Math.abs(elev) / 1000).toFixed(1)} km`;
      this.hud.scaleKm = scaleKm;
      this.hud.scalePx = scalePx;
      this.hud.farSide = dot(viewDir, center) < 0;

      if (this.showMaria && mariaLoaded()) {
        const m = mareAt(at.lat, at.lon);
        this.hud.terrain = m
          ? mareDisplayName(m.name) || "Mare basalt"
          : Math.abs(at.lat) > 65 ? "Not mapped (polar)" : "Highlands";
      } else {
        this.hud.terrain = "";
      }

      this.hud.crater = "";
      this.hud.density = "";
      if (this.showCraters) {
        if (pointer && this.rt.pointer) {
          // Smallest drawn crater containing the pointer.
          const { x, y } = this.rt.pointer;
          const drawn = this.rt.drawnCraters;
          let best = -1;
          for (let i = 0; i < this.rt.drawnCount; i++) {
            const dx = x - drawn[4 * i];
            const dy = y - drawn[4 * i + 1];
            const r = drawn[4 * i + 2];
            if (dx * dx + dy * dy <= r * r && (best < 0 || drawn[4 * i + 3] < drawn[4 * best + 3])) { best = i; }
          }
          if (best >= 0) {
            const dkm = drawn[4 * best + 3];
            this.hud.crater = `${dkm >= 10 ? Math.round(dkm) : dkm.toFixed(1)} km across`;
          }
        }
        if (this.rt.densityComplete && kmPerPx) {
          const areaKm2 = p.width * p.height * kmPerPx * kmPerPx;
          const per1000 = (this.rt.densityCount / areaKm2) * 1000;
          this.hud.density = `${per1000 >= 10 ? Math.round(per1000) : per1000.toFixed(1)} over 1 km, per 1,000 km²`;
        }
      }
      const snapshot = JSON.stringify(this.hud);
      if (snapshot !== this.rt.lastHud) {
        this.rt.lastHud = snapshot;
        this.$emit("hud", { ...this.hud });
      }

    },
  },
});
</script>

<style lang="less">
.surface-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.surface-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.marker-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.site-marker {
  --marker-color: var(--feature-color);
  position: absolute;
  top: 0;
  left: 0;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  visibility: hidden;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;

  &.program-apollo { --marker-color: var(--apollo-color); }
  &.program-robotic { --marker-color: var(--robotic-color); }
  &.program-artemis { --marker-color: var(--artemis-color); }

  .marker-shape {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border: 2px solid var(--marker-color);
    background: rgba(0, 0, 0, 0.45);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 0, 0, 0.6);
    transition: transform 0.15s ease, background 0.15s ease;
  }

  // Shape, not just color, separates the programs.
  &.program-apollo .marker-shape { border-radius: 50%; }
  &.program-robotic .marker-shape { transform: translate(-50%, -50%) rotate(45deg); width: 10px; height: 10px; }
  &.program-artemis .marker-shape {
    border: none;
    width: 14px;
    height: 13px;
    background: var(--marker-color);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    box-shadow: none;
  }
  &.program-feature .marker-shape {
    border-radius: 50%;
    width: 8px;
    height: 8px;
    border-width: 1.5px;
  }

  .marker-label {
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text);
    text-shadow: 0 0 3px #000, 0 0 6px #000, 1px 1px 2px #000;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  &.labelled .marker-label { opacity: 1; }

  &:hover .marker-shape,
  &:focus-visible .marker-shape {
    background: var(--marker-color);
  }
  &.program-robotic:hover .marker-shape,
  &.program-robotic:focus-visible .marker-shape {
    transform: translate(-50%, -50%) rotate(45deg) scale(1.2);
  }

  &:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: 50%;
  }

  // Persistent ring on the selected site.
  &.selected::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 30px;
    height: 30px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid var(--marker-color);
    box-shadow: 0 0 12px var(--marker-color);
    animation: marker-pulse 2.4s ease-in-out infinite;
  }
  &.selected .marker-label { color: var(--accent-strong); }
}

@keyframes marker-pulse {
  0%, 100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.45; transform: translate(-50%, -50%) scale(1.25); }
}

@media (prefers-reduced-motion: reduce) {
  .site-marker.selected::before { animation: none; }
}

.listen-capture {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  cursor: crosshair;
  touch-action: none;
}

</style>
