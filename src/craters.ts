// The Robbins lunar crater database: ~1.3 million craters ≥ 1 km, manually
// measured on LRO and Kaguya data. Robbins, S. J. (2019), JGR Planets 124,
// doi:10.1029/2018JE005592; PDS Imaging Node, moon_lro.kaguya_multi_craterdatabase_robbins_2018.
//
// Packed by tools/pack_craters.py into three tiers so the client only fetches
// what it can draw:
//   large.bin           D ≥ 20 km, float32 [lat, lon, D], ~84 KB, loaded up front
//   medium.bin/.idx     5–20 km, 15° tiles
//   small.bin/.idx      1–5 km, 5° tiles
// Tiled tiers are one file each, read with HTTP Range requests; a host that
// ignores Range returns the whole file once and tiles are sliced locally.

const BASE = "data/craters/";

export interface CraterTier {
  name: "medium" | "small";
  tileDeg: number;
  rows: number;
  cols: number;
  /** Craters below this diameter live in the next tier down. */
  minKm: number;
  maxKm: number;
}

export const TIERS: CraterTier[] = [
  { name: "medium", tileDeg: 15, rows: 12, cols: 24, minKm: 5, maxKm: 20 },
  { name: "small", tileDeg: 5, rows: 36, cols: 72, minKm: 1, maxKm: 5 },
];

/** Interleaved [lat, lon, diameterKm] triples. */
export type CraterList = Float32Array;

let large: CraterList | null = null;
let largeLoading: Promise<CraterList | null> | null = null;
const indexes = new Map<string, Uint32Array>();
const indexLoading = new Map<string, Promise<Uint32Array | null>>();
const wholeFiles = new Map<string, ArrayBuffer>();
const tiles = new Map<string, CraterList>();
const tileLoading = new Map<string, Promise<void>>();
let onTileLoaded: (() => void) | null = null;

/** Called whenever a new tile arrives, so the overlay can redraw. */
export function setCraterTileListener(fn: (() => void) | null): void {
  onTileLoaded = fn;
}

export function largeCraters(): CraterList | null {
  return large;
}

export function loadLargeCraters(): Promise<CraterList | null> {
  if (large) { return Promise.resolve(large); }
  if (!largeLoading) {
    largeLoading = fetch(BASE + "large.bin")
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(buf => {
        large = new Float32Array(buf);
        onTileLoaded?.();
        return large;
      })
      .catch(err => {
        console.warn("Moon Maps: crater catalog unavailable", err);
        largeLoading = null;
        return null;
      });
  }
  return largeLoading;
}

function loadIndex(tier: CraterTier): Promise<Uint32Array | null> {
  const have = indexes.get(tier.name);
  if (have) { return Promise.resolve(have); }
  let p = indexLoading.get(tier.name);
  if (!p) {
    p = fetch(`${BASE}${tier.name}.idx`)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(buf => {
        const idx = new Uint32Array(buf);
        indexes.set(tier.name, idx);
        return idx;
      })
      .catch(err => {
        console.warn(`Moon Maps: crater index ${tier.name} unavailable`, err);
        indexLoading.delete(tier.name);
        return null;
      });
    indexLoading.set(tier.name, p);
  }
  return p;
}

export function tileId(tier: CraterTier, lat: number, lon: number): number {
  const r = Math.min(tier.rows - 1, Math.max(0, Math.floor((90 - lat) / tier.tileDeg)));
  let l = lon;
  while (l < -180) { l += 360; }
  while (l >= 180) { l -= 360; }
  const c = Math.min(tier.cols - 1, Math.max(0, Math.floor((l + 180) / tier.tileDeg)));
  return r * tier.cols + c;
}

export function craterTile(tier: CraterTier, id: number): CraterList | undefined {
  return tiles.get(`${tier.name}/${id}`);
}

function decodeTile(tier: CraterTier, id: number, buf: ArrayBuffer, byteOffset: number, byteLength: number): CraterList {
  const n = byteLength / 6;
  const view = new DataView(buf, byteOffset, byteLength);
  const out = new Float32Array(n * 3);
  const row = Math.floor(id / tier.cols);
  const col = id % tier.cols;
  const top = 90 - row * tier.tileDeg;
  const left = -180 + col * tier.tileDeg;
  for (let i = 0; i < n; i++) {
    out[3 * i] = top - (view.getUint16(6 * i, true) / 65535) * tier.tileDeg;
    out[3 * i + 1] = left + (view.getUint16(6 * i + 2, true) / 65535) * tier.tileDeg;
    out[3 * i + 2] = view.getUint16(6 * i + 4, true) / 1000;
  }
  return out;
}

/** Ensure a tile is loaded (no-op if cached or in flight). */
export function requestTile(tier: CraterTier, id: number): void {
  const key = `${tier.name}/${id}`;
  if (tiles.has(key) || tileLoading.has(key)) { return; }
  const p = (async () => {
    const idx = await loadIndex(tier);
    if (!idx) { return; }
    const start = idx[id];
    const end = idx[id + 1];
    if (end <= start) {
      tiles.set(key, new Float32Array(0));
      return;
    }
    const whole = wholeFiles.get(tier.name);
    if (whole) {
      tiles.set(key, decodeTile(tier, id, whole, start, end - start));
      return;
    }
    const r = await fetch(`${BASE}${tier.name}.bin`, { headers: { "range": `bytes=${start}-${end - 1}` } });
    if (!r.ok) { throw new Error(`HTTP ${r.status}`); }
    const buf = await r.arrayBuffer();
    if (r.status === 206) {
      tiles.set(key, decodeTile(tier, id, buf, 0, buf.byteLength));
    } else {
      // The host ignored Range and sent everything: keep it and slice locally.
      wholeFiles.set(tier.name, buf);
      tiles.set(key, decodeTile(tier, id, buf, start, end - start));
    }
  })()
    .then(() => { onTileLoaded?.(); })
    .catch(err => { console.warn(`Moon Maps: crater tile ${key} failed`, err); })
    .finally(() => { tileLoading.delete(key); });
  tileLoading.set(key, p);
}
