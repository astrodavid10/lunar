// Metadata for the Moon imagesets in moon_maps_v4.wtml.
// Order here controls the display order of the layer tabs.

import lolaLegend from "../assets/lola-legend.png";
import colorshadeLegend from "../assets/colorshade-legend.png";

export interface LayerMeta {
  /** Short, URL-safe id used in deep links (?map=lola). */
  id: string;
  /** Exact imageset name in moon_maps_v4.wtml. */
  wwtName: string;
  displayName: string;
  /** Label on the layer tab. Keep to one or two short words. */
  tabLabel: string;
  /** One line: what the visitor is looking at. */
  caption: string;
  description: string;
  credit: string;
  legendSrc?: string;
  legendAlt?: string;
}

export const LAYER_META: LayerMeta[] = [
  {
    id: "cgi",
    wwtName: "CGI Moon Kit",
    displayName: "CGI Moon",
    tabLabel: "True color",
    caption: "The Moon as your eye would see it, evenly lit with no shadows.",
    description: "A full-color photorealistic map assembled from over 100,000 individual images, composited and color-corrected to represent how the Moon appears to the naked eye.",
    credit: "NASA Scientific Visualization Studio, from LRO data",
  },
  {
    id: "wac",
    wwtName: "Moon LRO LROC WAC Global Morphology Mosaic 100m v3",
    displayName: "LRO Wide-Angle Camera",
    tabLabel: "LRO",
    caption: "Shadows from a low Sun make every crater rim and ridge stand out.",
    description: "Assembled from 15,000 images acquired by the Wide Angle Camera (WAC) aboard NASA's Lunar Reconnaissance Orbiter between 2009 and 2011. Resolution: ~100 m/pixel.",
    credit: "NASA/GSFC/Arizona State University",
  },
  {
    id: "kaguya",
    wwtName: "SELENE Kaguya TC Ortho Global Mosaic",
    displayName: "SELENE Kaguya Terrain",
    tabLabel: "Kaguya",
    caption: "Japan's sharpest global mosaic. Zoom in close to see the most detail.",
    description: "Built from images captured by Japan's SELENE (Kaguya) Terrain Camera, one of the highest-resolution global lunar mosaics ever produced, at ~10 m/pixel.",
    credit: "JAXA/SELENE",
  },
  {
    id: "lola",
    wwtName: "Moon LRO LOLA Color Shaded Relief 388m v4",
    displayName: "LOLA Elevation (Color)",
    tabLabel: "Elevation",
    caption: "Height, not brightness: blue is low, red and white are high.",
    description: "A colorized digital elevation model derived from altimetry data collected by the Lunar Orbiter Laser Altimeter (LOLA) aboard NASA's Lunar Reconnaissance Orbiter. Resolution: ~388 m/pixel.",
    credit: "NASA/GSFC/MIT LOLA team, USGS Astrogeology",
    legendSrc: lolaLegend,
    legendAlt: "LOLA elevation color scale, from blue for low elevations to white for high",
  },
  {
    id: "colorshade",
    wwtName: "Moon LROC WAC GLD100 ColorShade 79S79N 118m v1",
    displayName: "LROC ColorShade Elevation",
    tabLabel: "ColorShade",
    caption: "A second elevation model, built from stereo pairs of LRO images.",
    description: "A colorized terrain map from the GLD100 global topographic model: blue = low elevation, white = mid elevation, black = high elevation (darker = more extreme). Covers 79°S to 79°N.",
    credit: "NASA/GSFC/Arizona State University, DLR",
    legendSrc: colorshadeLegend,
    legendAlt: "GLD100 ColorShade elevation scale, from blue for low elevations through white to black for high",
  },
  {
    id: "clementine",
    wwtName: "Moon Clementine UVVIS Warped Color Ratio Mosaic 200m v1",
    displayName: "Clementine Mineral Map",
    tabLabel: "Minerals",
    caption: "Color shows chemistry: blue maria are rich in titanium, orange ones are poor.",
    description: "Captured at three wavelengths (415 nm, 750 nm, 1000 nm): red indicates low titanium or high glass content, green shows iron abundance, and blue highlights high-titanium or high-albedo regions. Resolution: ~200 m/pixel.",
    credit: "NASA/DoD Clementine, USGS Astrogeology",
  },
  {
    id: "geology",
    wwtName: "Unified Geologic Map of the Moon",
    displayName: "Unified Geologic Map",
    tabLabel: "Geology",
    caption: "Each color is a rock unit, mapped by age and origin.",
    description: "A composite of six regional geologic maps, color-coded to distinguish maria (ancient lava plains), impact craters, and highland terrain types across the entire lunar surface.",
    credit: "USGS Astrogeology Science Center, NASA, LPI",
  },
];

export const DEFAULT_LAYER_ID = "wac";

export function layerById(id: string | null | undefined): LayerMeta | undefined {
  return id ? LAYER_META.find(m => m.id === id) : undefined;
}

export function layerByName(wwtName: string): LayerMeta | undefined {
  return LAYER_META.find(m => m.wwtName === wwtName);
}

/** Prompts shown while comparing two specific layers (order-insensitive). */
export const COMPARE_PROMPTS: { a: string; b: string; prompt: string }[] = [
  { a: "wac", b: "lola", prompt: "Find Tycho's rays in LRO, then slide to Elevation. The rays are bright, not raised: they're a thin spray of fresh rock." },
  { a: "cgi", b: "clementine", prompt: "The dark maria look alike in true color. Minerals splits them apart by titanium content." },
  { a: "wac", b: "geology", prompt: "Geologists drew these units from shapes you can see in LRO. Slide to match a boundary to the landform beneath it." },
  { a: "lola", b: "colorshade", prompt: "Two independent elevation models: a laser altimeter and stereo photographs. Where do they agree?" },
  { a: "kaguya", b: "wac", prompt: "Same Sun, different camera. Zoom in on a small crater and compare how much detail each one resolves." },
  { a: "cgi", b: "lola", prompt: "The near side's dark seas sit low. The bright highlands are high ground." },
  { a: "clementine", b: "geology", prompt: "Mineral color and geologic unit often line up. Each lava flow has its own chemistry." },
];

export function comparePrompt(a: string, b: string): string | undefined {
  return COMPARE_PROMPTS.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.prompt;
}
