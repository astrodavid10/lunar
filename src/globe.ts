// Screen projection for points on the Moon in WWT planet mode.
//
// In planet mode the engine draws the body as a unit sphere in its own model
// space. A surface point at (lat, lon) is Coordinates.geoTo3d(lat, lon + 180)
// (see WWTControl.getScreenPointForCoordinates), and the canvas is sized in
// CSS pixels, so projected points can position HTML overlay elements directly.
//
// We cache the world·view·projection matrix and the eye position once per
// frame. A surface point is on the visible hemisphere when it faces the eye:
// for a unit sphere that is dot(P, eye) > 1.

import { Matrix3d, Vector3d, WWTControl } from "@wwtelescope/engine";

export type Vec3 = [number, number, number];

export interface ScreenPoint {
  x: number;
  y: number;
  /** Faces the camera (not on the far hemisphere). */
  visible: boolean;
  /** How squarely the point faces the camera: 1 at the sub-camera point, 0 at the limb. */
  facing: number;
}

export const MOON_RADIUS_KM = 1737.4;
const D2R = Math.PI / 180;

/** Engine model-space position of a surface point. */
export function surfacePoint(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * D2R;
  const lng = (lonDeg + 180) * D2R;
  const c = Math.cos(lat);
  return [Math.cos(lng) * c, Math.sin(lat), Math.sin(lng) * c];
}

export function toLatLon(p: Vec3): { lat: number; lon: number } {
  const r = Math.hypot(p[0], p[1], p[2]);
  let lon = Math.atan2(p[2], p[0]) / D2R - 180;
  if (lon < -180) { lon += 360; }
  return { lat: Math.asin(p[1] / r) / D2R, lon };
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Great-circle distance in degrees. */
export function angularDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = surfacePoint(lat1, lon1);
  const b = surfacePoint(lat2, lon2);
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / D2R;
}

/* eslint-disable @typescript-eslint/naming-convention -- WWT engine method names */
type Ctl = {
  renderContext: {
    width: number;
    height: number;
    get_world(): Matrix3d;
    get_view(): Matrix3d;
    get_projection(): Matrix3d | null;
    viewCamera: { lat: number; lng: number; zoom: number };
  };
  getCoordinatesForScreenPoint(x: number, y: number): { x: number; y: number } | null;
  get_planetLike(): boolean;
};

/* eslint-enable @typescript-eslint/naming-convention */

export function wwtControl(): Ctl | null {
  // `singleton` is set once the engine has been initialized.
  return (WWTControl as unknown as { singleton?: Ctl }).singleton ?? null;
}

export class GlobeProjector {
  private m = new Float64Array(16);
  eye: Vec3 = [0, 0, 3];
  eyeDistance = 3;
  width = 1;
  height = 1;
  ready = false;

  /** Refresh the cached matrices. Call once per frame before projecting. */
  update(): boolean {
    const ctl = wwtControl();
    const rc = ctl?.renderContext;
    const proj = rc?.get_projection();
    if (!ctl || !rc || !proj || !ctl.get_planetLike()) {
      this.ready = false;
      return false;
    }
    const wv = Matrix3d.multiplyMatrix(rc.get_world(), rc.get_view());
    const wvp = Matrix3d.multiplyMatrix(wv, proj);
    const m = this.m;
    m[0] = wvp.get_m11(); m[1] = wvp.get_m12(); m[2] = wvp.get_m13(); m[3] = wvp.get_m14();
    m[4] = wvp.get_m21(); m[5] = wvp.get_m22(); m[6] = wvp.get_m23(); m[7] = wvp.get_m24();
    m[8] = wvp.get_m31(); m[9] = wvp.get_m32(); m[10] = wvp.get_m33(); m[11] = wvp.get_m34();
    m[12] = wvp.get_offsetX(); m[13] = wvp.get_offsetY(); m[14] = wvp.get_offsetZ(); m[15] = wvp.get_m44();

    // multiplyMatrix returns a new matrix, so wv can be inverted in place now
    // that wvp has been built from it.
    wv.invert();
    const e = wv.transform(Vector3d.create(0, 0, 0));
    this.eye = [e.x, e.y, e.z];
    this.eyeDistance = Math.hypot(e.x, e.y, e.z);
    this.width = rc.width;
    this.height = rc.height;
    this.ready = true;
    return true;
  }

  projectVec(p: Vec3, out?: ScreenPoint): ScreenPoint {
    const m = this.m;
    const d = p[0] * m[3] + p[1] * m[7] + p[2] * m[11] + m[15];
    const vx = (p[0] * m[0] + p[1] * m[4] + p[2] * m[8] + m[12]) / d;
    const vy = (p[0] * m[1] + p[1] * m[5] + p[2] * m[9] + m[13]) / d;
    const r = out ?? { x: 0, y: 0, visible: false, facing: 0 };
    r.x = (1 + vx) * this.width / 2;
    r.y = (1 - vy) * this.height / 2;
    // dot(P, E) ranges from 1 (limb) to |E| (sub-camera point) on the near side.
    const pe = dot(p, this.eye);
    r.visible = d > 0 && pe > 1;
    r.facing = r.visible ? Math.min(1, (pe - 1) / Math.max(1e-9, this.eyeDistance - 1)) : 0;
    return r;
  }

  /**
   * Like projectVec, but a point on the far side is moved to the limb along
   * its own azimuth around the view axis. Filled shapes that straddle the
   * horizon then end exactly at the disk's edge instead of leaking or gapping.
   * `visible` still reports the original point's visibility.
   */
  projectOnDisk(p: Vec3, out?: ScreenPoint): ScreenPoint {
    const r = this.projectVec(p, out);
    if (r.visible) { return r; }
    const e = this.eye;
    const ed = this.eyeDistance;
    const ex = e[0] / ed;
    const ey = e[1] / ed;
    const ez = e[2] / ed;
    const along = p[0] * ex + p[1] * ey + p[2] * ez;
    let px = p[0] - along * ex;
    let py = p[1] - along * ey;
    let pz = p[2] - along * ez;
    const pl = Math.hypot(px, py, pz) || 1;
    // Horizon circle: center E/|E|², radius √(1 − 1/|E|²); a hair past it hides tessellation seams.
    const limbR = Math.sqrt(Math.max(0, 1 - 1 / (ed * ed))) * 1.015;
    px = ex / ed + (px / pl) * limbR;
    py = ey / ed + (py / pl) * limbR;
    pz = ez / ed + (pz / pl) * limbR;
    const visible = r.visible;
    this.projectVec([px, py, pz], r);
    r.visible = visible;
    r.facing = 0;
    return r;
  }

  /**
   * Whether a spherical cap (unit-vector center, angular radius in radians)
   * could have any part on the visible hemisphere.
   */
  capMayBeVisible(center: Vec3, radius: number): boolean {
    const ed = this.eyeDistance;
    // Visible points satisfy angle(P, eye) < acos(1/|E|).
    const horizon = Math.acos(Math.min(1, 1 / ed));
    const c = dot(center, this.eye) / ed;
    const angle = Math.acos(Math.max(-1, Math.min(1, c)));
    return angle < horizon + radius;
  }

  project(lat: number, lon: number, out?: ScreenPoint): ScreenPoint {
    return this.projectVec(surfacePoint(lat, lon), out);
  }

  /** Selenographic coordinates under a screen point, or null off the disk. */
  pick(x: number, y: number): { lat: number; lon: number } | null {
    const ctl = wwtControl();
    if (!ctl || !this.ready) { return null; }
    const c = ctl.getCoordinatesForScreenPoint(x, y);
    if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) { return null; }
    let lon = c.x;
    while (lon < -180) { lon += 360; }
    while (lon > 180) { lon -= 360; }
    return { lat: c.y, lon };
  }

  /** Kilometers per CSS pixel at a screen point (null off the disk). */
  kmPerPixel(x: number, y: number): number | null {
    const step = 40;
    const a = this.pick(x - step / 2, y);
    const b = this.pick(x + step / 2, y);
    if (!a || !b) { return null; }
    return (angularDistance(a.lat, a.lon, b.lat, b.lon) * D2R * MOON_RADIUS_KM) / step;
  }
}
