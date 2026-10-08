// Lunar mare boundaries, from LROC's global mare map (Nelson et al. 2014,
// LPSC 45, abstract 2861; PDS LROLRC_2001/EXTRAS/SHAPEFILE/LROC_GLOBAL_MARE),
// simplified to ~0.03° for display by tools/pack_maria.py. Covers 65°S–65°N.

import { surfacePoint } from "./globe";

const URL = "data/maria.json";

export interface MareRing {
  /** Unit vectors in engine model space, xyz interleaved. */
  xyz: Float32Array;
  /** Selenographic lon/lat, interleaved, for hit-testing. */
  lonlat: Float32Array;
}

export interface MarePolygon {
  name: string;
  areaKm2: number;
  rings: MareRing[]; // first = outer boundary, rest = holes
  /** Bounding box in lon/lat. */
  bbox: [number, number, number, number];
  /** Unit vector toward the polygon's middle, and its angular radius (rad). */
  center: [number, number, number];
  radius: number;
}

interface MariaFile {
  q: number;
  names: string[];
  polys: (number | number[])[][];
}

let polygons: MarePolygon[] | null = null;
let loading: Promise<MarePolygon[] | null> | null = null;

export function mariaLoaded(): MarePolygon[] | null {
  return polygons;
}

export function loadMaria(): Promise<MarePolygon[] | null> {
  if (polygons) { return Promise.resolve(polygons); }
  if (!loading) {
    loading = fetch(URL)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: MariaFile) => {
        polygons = data.polys.map(p => decode(p, data));
        return polygons;
      })
      .catch(err => {
        console.warn("Moon Maps: mare boundaries unavailable", err);
        loading = null;
        return null;
      });
  }
  return loading;
}

function decode(p: (number | number[])[], data: MariaFile): MarePolygon {
  const [nameIdx, area, ...rawRings] = p as [number, number, ...number[][]];
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  const rings = rawRings.map((flat, ringIndex) => {
    const n = flat.length / 2;
    const xyz = new Float32Array(n * 3);
    const lonlat = new Float32Array(n * 2);
    let ix = 0;
    let iy = 0;
    for (let i = 0; i < n; i++) {
      ix += flat[2 * i];
      iy += flat[2 * i + 1];
      const lon = ix * data.q;
      const lat = iy * data.q;
      lonlat[2 * i] = lon;
      lonlat[2 * i + 1] = lat;
      const v = surfacePoint(lat, lon);
      xyz[3 * i] = v[0];
      xyz[3 * i + 1] = v[1];
      xyz[3 * i + 2] = v[2];
      if (ringIndex === 0) {
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        cx += v[0]; cy += v[1]; cz += v[2];
      }
    }
    return { xyz, lonlat };
  });
  const len = Math.hypot(cx, cy, cz) || 1;
  const center: [number, number, number] = [cx / len, cy / len, cz / len];
  // Angular radius: farthest outer-ring vertex from the center.
  let radius = 0;
  const outer = rings[0].xyz;
  for (let i = 0; i < outer.length; i += 3) {
    const d = outer[i] * center[0] + outer[i + 1] * center[1] + outer[i + 2] * center[2];
    radius = Math.max(radius, Math.acos(Math.max(-1, Math.min(1, d))));
  }
  return {
    name: data.names[nameIdx] ?? "",
    areaKm2: area,
    rings,
    bbox: [minLon, minLat, maxLon, maxLat],
    center,
    radius,
  };
}

function inRing(lonlat: Float32Array, lon: number, lat: number): boolean {
  let inside = false;
  const n = lonlat.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = lonlat[2 * i];
    const yi = lonlat[2 * i + 1];
    const xj = lonlat[2 * j];
    const yj = lonlat[2 * j + 1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** The mare under a point, if any (null when not loaded or in the highlands). */
export function mareAt(lat: number, lon: number): MarePolygon | null {
  if (!polygons) { return null; }
  for (const p of polygons) {
    const [x0, y0, x1, y1] = p.bbox;
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) { continue; }
    if (!inRing(p.rings[0].lonlat, lon, lat)) { continue; }
    if (p.rings.slice(1).some(h => inRing(h.lonlat, lon, lat))) { continue; }
    return p;
  }
  return null;
}

/** Display name: drop the dataset's "- south" style part suffixes. */
export function mareDisplayName(name: string): string {
  return name.replace(/\s+-\s+\w+$/, "");
}
