// Cinematic fly-to for WWT planet mode (audit L8).
//
// The engine's default slew blends position and log-zoom with one alpha, so
// short hops and cross-Moon flights feel the same. This mover:
//   • pulls back to a height proportional to the distance travelled, so a
//     flight from Tycho to the far side visibly rises above the globe;
//   • pans while zoomed out and dives in at the end (pan-then-zoom);
//   • eases with smootherstep (zero velocity and acceleration at both ends);
//   • scales its duration with distance.
// It is installed through the engine's own mover slot, the same mechanism
// as WWT's ViewMoverSlew, so the render loop drives it and user input
// cancels it.

import { CameraParameters, SpaceTimeController } from "@wwtelescope/engine";
import { angularDistance, wwtControl } from "./globe";

// Whole disk with margin; the engine itself allows up to 360.
const MAX_ZOOM = 160;
const MAX_START_ZOOM = 360;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function smootherstep(t: number): number {
  if (t <= 0) { return 0; }
  if (t >= 1) { return 1; }
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/* eslint-disable @typescript-eslint/naming-convention -- the mover implements WWT's engine interface (get_complete, set__mover, …) */

interface Cam { lat: number; lng: number; zoom: number; rotation: number; angle: number; opacity: number }

class CinematicMover {
  private startMs = performance.now();
  private complete = false;
  private midpoint: (() => void) | null = null;
  private midpointFired = false;
  private logFrom: number;
  private logTo: number;
  private logPeak: number;
  private from: Cam;
  private to: Cam;
  private target: InstanceType<typeof CameraParameters>;

  constructor(from: Cam, to: InstanceType<typeof CameraParameters>, private durationMs: number, peakZoom: number, private onDone: () => void) {
    this.from = { ...from };
    this.to = { lat: to.lat, lng: to.lng, zoom: to.zoom, rotation: to.rotation, angle: to.angle, opacity: to.opacity };
    this.target = to;
    // Take the short way around in longitude.
    while (this.to.lng - this.from.lng > 180) { this.from.lng += 360; }
    while (this.from.lng - this.to.lng > 180) { this.from.lng -= 360; }
    this.logFrom = Math.log(from.zoom);
    this.logTo = Math.log(to.zoom);
    this.logPeak = Math.log(Math.max(peakZoom, from.zoom, to.zoom));
  }

  private params(t: number): InstanceType<typeof CameraParameters> {
    // Rise over the first ~45%, pan across the middle, descend over the last ~55%.
    const aPos = smootherstep((t - 0.12) / 0.66);
    let logZ: number;
    if (t < 0.45) {
      logZ = this.logFrom + (this.logPeak - this.logFrom) * smootherstep(t / 0.45);
    } else {
      logZ = this.logPeak + (this.logTo - this.logPeak) * smootherstep((t - 0.45) / 0.55);
    }
    const f = this.from;
    const to = this.to;
    const p = new CameraParameters();
    p.lat = f.lat + (to.lat - f.lat) * aPos;
    p.lng = f.lng + (to.lng - f.lng) * aPos;
    p.zoom = Math.exp(logZ);
    p.rotation = f.rotation + (to.rotation - f.rotation) * aPos;
    p.angle = f.angle + (to.angle - f.angle) * aPos;
    p.opacity = f.opacity + (to.opacity - f.opacity) * aPos;
    return p;
  }

  get_complete(): boolean { return this.complete; }

  get_currentPosition(): InstanceType<typeof CameraParameters> {
    const t = (performance.now() - this.startMs) / this.durationMs;
    if (!this.midpointFired && t >= 0.5) {
      this.midpointFired = true;
      this.midpoint?.();
    }
    if (t >= 1) {
      if (!this.complete) {
        this.complete = true;
        queueMicrotask(this.onDone);
      }
      return this.target.copy();
    }
    return this.params(t);
  }

  get_currentDateTime(): Date { return SpaceTimeController.get_now(); }
  get_midpoint(): (() => void) | null { return this.midpoint; }
  set_midpoint(v: () => void): () => void { this.midpoint = v; return v; }
  get_moveTime(): number { return this.durationMs / 1000; }
}

export interface FlyOptions {
  lat: number;
  lon: number;
  zoomDeg: number;
  instant?: boolean;
  /** Called once, about halfway through the flight (e.g. to crossfade a layer). */
  onMidpoint?: () => void;
  /** Override the distance-scaled duration (ms). */
  durationMs?: number;
  /** Don't rise above the endpoints (for slow drifts). */
  noRise?: boolean;
}

export type FlightResult = "arrived" | "interrupted";

type MoverCtl = {
  renderContext: { viewCamera: Cam & { copy(): InstanceType<typeof CameraParameters> }; targetCamera: unknown; viewMover: unknown };
  _cameraParametersFromRADecZoom(ra: number, dec: number, zoom: number, roll?: number): InstanceType<typeof CameraParameters>;
  gotoTargetFull(noZoom: boolean, instant: boolean, params: unknown, fg: unknown, bg: unknown): void;
  set__mover(m: unknown): unknown;
  get__mover(): unknown;
  _tracking: boolean;
  _trackingObject: unknown;
};

let active: { mover: CinematicMover; resolve: (r: FlightResult) => void; watch: number } | null = null;

/** Cancel an in-progress flight (resolves its promise as "interrupted"). */
export function cancelFlight(): void {
  if (!active) { return; }
  const ctl = wwtControl() as unknown as MoverCtl | null;
  if (ctl && ctl.get__mover() === active.mover) { ctl.set__mover(null); }
  const { resolve, watch } = active;
  active = null;
  cancelAnimationFrame(watch);
  resolve("interrupted");
}

export function flyTo(opts: FlyOptions): Promise<FlightResult> {
  const ctl = wwtControl() as unknown as MoverCtl | null;
  if (!ctl) { return Promise.resolve("interrupted"); }
  cancelFlight();

  // Planet mode: camera lng = −RA·15°, and lunar RA = −east longitude,
  // so the camera longitude is simply the east longitude.
  const raHours = ((-opts.lon / 15) % 24 + 24) % 24;
  const zoom = Math.min(MAX_START_ZOOM, opts.zoomDeg);
  const target = ctl._cameraParametersFromRADecZoom(raHours, opts.lat, zoom);

  const view = ctl.renderContext.viewCamera;
  const fromLon = view.lng;
  const dist = angularDistance(view.lat, fromLon, opts.lat, opts.lon);

  if (opts.instant || prefersReducedMotion() || (dist < 0.01 && Math.abs(Math.log(view.zoom / zoom)) < 0.01)) {
    ctl.set__mover(null);
    ctl.renderContext.targetCamera = target.copy();
    ctl.renderContext.viewCamera = target.copy() as MoverCtl["renderContext"]["viewCamera"];
    opts.onMidpoint?.();
    return Promise.resolve("arrived");
  }

  // Rise to roughly frame both endpoints: ~1.6° of zoom per degree of arc.
  const peak = opts.noRise
    ? Math.max(zoom, view.zoom)
    : Math.min(MAX_ZOOM, Math.max(zoom, view.zoom, dist * 1.6));
  const zoomRange = Math.abs(Math.log(peak / Math.max(1e-3, Math.min(view.zoom, zoom))));
  const durationMs = opts.durationMs ?? Math.min(7000, Math.max(1400, 1200 + dist * 28 + zoomRange * 380));

  return new Promise<FlightResult>((resolve) => {
    ctl._tracking = false;
    ctl._trackingObject = null;
    const mover = new CinematicMover(view, target, durationMs, peak, () => {
      if (active?.mover === mover) {
        cancelAnimationFrame(active.watch);
        active = null;
        resolve("arrived");
      }
    });
    if (opts.onMidpoint) { mover.set_midpoint(opts.onMidpoint); }
    ctl.set__mover(mover);

    // Watch for the engine dropping our mover (user dragged or zoomed).
    const watchFn = (): void => {
      if (!active || active.mover !== mover) { return; }
      if (ctl.get__mover() !== mover && !mover.get_complete()) {
        active = null;
        resolve("interrupted");
        return;
      }
      active.watch = requestAnimationFrame(watchFn);
    };
    active = { mover, resolve, watch: requestAnimationFrame(watchFn) };
  });
}
