// Coarse global lunar elevation, for the HUD readout and terrain sonification.
//
// public/data/lola-elevation-4ppd.u8 is LRO LOLA LDEM_4 (PDS
// LRO-L-LOLA-3-RDR-V1, 4 pixels/degree, ~7.6 km at the equator) quantized to
// 8 bits: 720 rows from 90°N to 90°S, 1440 columns from 0° to 360°E,
// height above the 1737.4 km reference sphere = MIN + value · STEP meters.
// Quantization step ≈ 78 m. Generated from ldem_4.img (DN · 0.5 m).

import { angularDistance, surfacePoint, toLatLon, Vec3 } from "./globe";

const URL = "data/lola-elevation-4ppd.u8";
const ROWS = 720;
const COLS = 1440;
const MIN_M = -9200;
const STEP_M = 20000 / 255;

let grid: Uint8Array | null = null;
let loading: Promise<boolean> | null = null;

export function elevationReady(): boolean {
  return grid !== null;
}

export function loadElevation(): Promise<boolean> {
  if (grid) { return Promise.resolve(true); }
  if (!loading) {
    loading = fetch(URL)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(buf => {
        if (buf.byteLength !== ROWS * COLS) { throw new Error("unexpected elevation grid size"); }
        grid = new Uint8Array(buf);
        return true;
      })
      .catch(err => {
        console.warn("Moon Maps: elevation data unavailable", err);
        loading = null;
        return false;
      });
  }
  return loading;
}

function cell(r: number, c: number): number {
  const rr = Math.min(ROWS - 1, Math.max(0, r));
  const cc = ((c % COLS) + COLS) % COLS;
  return (grid as Uint8Array)[rr * COLS + cc];
}

/** Height in meters above the reference sphere, bilinearly interpolated. */
export function elevationAt(lat: number, lon: number): number | null {
  if (!grid) { return null; }
  const y = (90 - lat) * 4 - 0.5;
  const x = (((lon % 360) + 360) % 360) * 4 - 0.5;
  const r0 = Math.floor(y);
  const c0 = Math.floor(x);
  const fy = y - r0;
  const fx = x - c0;
  const v =
    cell(r0, c0) * (1 - fx) * (1 - fy) + cell(r0, c0 + 1) * fx * (1 - fy) +
    cell(r0 + 1, c0) * (1 - fx) * fy + cell(r0 + 1, c0 + 1) * fx * fy;
  return MIN_M + v * STEP_M;
}

export interface ProfileSample {
  lat: number;
  lon: number;
  /** Distance from the start, km. */
  km: number;
  elevation: number;
}

/** Elevation profile along the great circle between two points. */
export function elevationProfile(a: { lat: number; lon: number }, b: { lat: number; lon: number }, samples = 160): ProfileSample[] {
  if (!grid) { return []; }
  const pa = surfacePoint(a.lat, a.lon);
  const pb = surfacePoint(b.lat, b.lon);
  const omega = (angularDistance(a.lat, a.lon, b.lat, b.lon) * Math.PI) / 180;
  const totalKm = omega * 1737.4;
  const out: ProfileSample[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    let p: Vec3;
    if (omega < 1e-9) {
      p = pa;
    } else {
      const s = Math.sin(omega);
      const wa = Math.sin((1 - t) * omega) / s;
      const wb = Math.sin(t * omega) / s;
      p = [pa[0] * wa + pb[0] * wb, pa[1] * wa + pb[1] * wb, pa[2] * wa + pb[2] * wb];
    }
    const ll = toLatLon(p);
    out.push({ ...ll, km: totalKm * t, elevation: elevationAt(ll.lat, ll.lon) ?? 0 });
  }
  return out;
}
