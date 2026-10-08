// Where the Sun is shining on the Moon, for any date.
//
// Low-precision formulas from Meeus, "Astronomical Algorithms" (2nd ed.):
// ch. 25 (Sun), ch. 47 (Moon, largest periodic terms only) and ch. 53
// (selenographic position of the Sun). Accurate to a few tenths of a degree,
// which is far finer than the terminator's visible width.

/* eslint-disable @typescript-eslint/naming-convention -- variable names follow Meeus's symbols (T, L0, M′, F, Ω…) */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const AU_KM = 149597870.7;
const INCLINATION = 1.54242; // lunar equator to ecliptic, degrees

const sin = (deg: number): number => Math.sin(deg * D2R);
const cos = (deg: number): number => Math.cos(deg * D2R);
const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;
const norm180 = (deg: number): number => {
  const d = norm360(deg);
  return d > 180 ? d - 360 : d;
};

export interface MoonLighting {
  /** Selenographic latitude/longitude (east-positive) of the subsolar point. */
  subsolarLat: number;
  subsolarLon: number;
  /** Fraction of the Earth-facing disk that is lit, 0–1. */
  illuminated: number;
  /** Phase angle (Sun–Moon–Earth), degrees. 0 = full, 180 = new. */
  phaseAngle: number;
  waxing: boolean;
  phaseName: string;
  /** Days since the most recent new Moon (approximate). */
  ageDays: number;
}

export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function moonLighting(date: Date): MoonLighting {
  const T = (julianDay(date) - 2451545.0) / 36525;

  // Sun (ch. 25, low accuracy)
  const L0 = 280.46646 + 36000.76983 * T;
  const Ms = 357.52911 + 35999.05029 * T;
  const C = (1.914602 - 0.004817 * T) * sin(Ms) + (0.019993 - 0.000101 * T) * sin(2 * Ms) + 0.000289 * sin(3 * Ms);
  const sunLon = norm360(L0 + C);
  const e = 0.016708634 - 0.000042037 * T;
  const nu = Ms + C;
  const sunDistKm = (1.000001018 * (1 - e * e)) / (1 + e * cos(nu)) * AU_KM;

  // Moon (ch. 47, principal terms)
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.2720950 + 483202.0175233 * T;
  const Omega = 125.0445479 - 1934.1362891 * T;

  const sumL =
    6288774 * sin(Mp) + 1274027 * sin(2 * D - Mp) + 658314 * sin(2 * D) +
    213618 * sin(2 * Mp) - 185116 * sin(M) - 114332 * sin(2 * F) +
    58793 * sin(2 * D - 2 * Mp) + 57066 * sin(2 * D - M - Mp) + 53322 * sin(2 * D + Mp) +
    45758 * sin(2 * D - M) - 40923 * sin(M - Mp) - 34720 * sin(D) - 30383 * sin(M + Mp);
  const sumB =
    5128122 * sin(F) + 280602 * sin(Mp + F) + 277693 * sin(Mp - F) +
    173237 * sin(2 * D - F) + 55413 * sin(2 * D - Mp + F) + 46271 * sin(2 * D - Mp - F) +
    32573 * sin(2 * D + F);
  const sumR =
    -20905355 * cos(Mp) - 3699111 * cos(2 * D - Mp) - 2955968 * cos(2 * D) -
    569925 * cos(2 * Mp) + 48888 * cos(M) - 3149 * cos(2 * F) +
    246158 * cos(2 * D - 2 * Mp) - 152138 * cos(2 * D - M - Mp) - 170733 * cos(2 * D + Mp) -
    204586 * cos(2 * D - M) - 129620 * cos(M - Mp) + 108743 * cos(D) + 104755 * cos(M + Mp);

  const moonLon = norm360(Lp + sumL / 1e6);
  const moonLat = sumB / 1e6;
  const moonDistKm = 385000.56 + sumR / 1000;

  // Selenographic position of the Sun (ch. 53)
  const ratio = moonDistKm / sunDistKm;
  const lonH = sunLon + 180 + ratio * R2D * cos(moonLat) * sin(sunLon - moonLon);
  const latH = ratio * moonLat;
  const W = lonH - Omega;
  const A = Math.atan2(
    sin(W) * cos(latH) * cos(INCLINATION) - sin(latH) * sin(INCLINATION),
    cos(W) * cos(latH),
  ) * R2D;
  const subsolarLon = norm180(A - F);
  const subsolarLat = Math.asin(-sin(W) * cos(latH) * sin(INCLINATION) - sin(latH) * cos(INCLINATION)) * R2D;

  // Phase (ch. 48)
  const elong = Math.acos(cos(moonLat) * cos(moonLon - sunLon)) * R2D;
  const phaseAngle = Math.atan2(sunDistKm * sin(elong), moonDistKm - sunDistKm * cos(elong)) * R2D;
  const illuminated = (1 + cos(phaseAngle)) / 2;
  const waxing = sin(moonLon - sunLon) > 0;
  const ageDays = (norm360(moonLon - sunLon) / 360) * 29.530589;

  return {
    subsolarLat,
    subsolarLon,
    illuminated,
    phaseAngle,
    waxing,
    phaseName: phaseName(illuminated, waxing),
    ageDays,
  };
}

function phaseName(k: number, waxing: boolean): string {
  if (k < 0.02) { return "New Moon"; }
  if (k > 0.98) { return "Full Moon"; }
  if (Math.abs(k - 0.5) < 0.04) { return waxing ? "First Quarter" : "Last Quarter"; }
  if (k < 0.5) { return waxing ? "Waxing Crescent" : "Waning Crescent"; }
  return waxing ? "Waxing Gibbous" : "Waning Gibbous";
}
