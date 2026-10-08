// Sites drawn on the lunar surface, listed in the Explore gallery and used by
// the tours. Coordinates are selenographic degrees: latitude north-positive,
// longitude east-positive. Landing-site positions are from the mission teams
// and LROC; Artemis entries are approximate centers of NASA's south-pole
// candidate landing regions (announced in 2024 for Artemis III, now planned for
// Artemis IV), which are each several kilometers across.

export type Program = "apollo" | "robotic" | "artemis" | "feature";

export interface SiteImage {
  src: string;
  alt: string;
  credit: string;
  link: string;
}

export interface Site {
  id: string;
  name: string;
  program: Program;
  lat: number;
  lon: number;
  /** WWT zoom (degrees) for the fly-in. ~1.5 for a landing site, 160 = whole disk. */
  zoomDeg: number;
  /** Short line for the gallery card. */
  summary: string;
  description: string;
  date?: string;
  agency?: string;
  crew?: string;
  lookFor?: string;
  /** Layer id that best shows this site's story. */
  layer?: string;
  photo?: SiteImage;
  orbital?: SiteImage;
}

export const PROGRAMS: { id: Program; label: string }[] = [
  { id: "apollo", label: "Apollo" },
  { id: "robotic", label: "Robotic landers" },
  { id: "artemis", label: "Artemis IV regions" },
  { id: "feature", label: "Craters & basins" },
];

const nasaImage = (id: string, alt: string, credit: string): SiteImage => ({
  src: `https://images-assets.nasa.gov/image/${id}/${id}~small.jpg`,
  alt,
  credit,
  link: `https://images.nasa.gov/details/${id}`,
});

export const SITES: Site[] = [
  // ── Apollo ─────────────────────────────────────────────────────────────────
  {
    id: "apollo11",
    name: "Apollo 11",
    program: "apollo",
    lat: 0.6741, lon: 23.4730, zoomDeg: 1.6,
    date: "20 July 1969",
    agency: "NASA",
    crew: "Neil Armstrong, Buzz Aldrin · Michael Collins in orbit",
    summary: "The first people on the Moon, in the Sea of Tranquility.",
    description: "Armstrong flew the lunar module Eagle past a boulder-strewn crater and set down on the smooth floor of Mare Tranquillitatis with seconds of fuel margin. The crew spent two and a half hours outside and brought home 21.5 kg of rock.",
    lookFor: "Switch to Minerals. This sea glows blue, the signature of titanium. Apollo 11's basalts turned out to be among the most titanium-rich rocks ever found.",
    layer: "clementine",
    photo: nasaImage("as11-40-5903", "Buzz Aldrin walking beside the leg of the lunar module Eagle", "NASA / Neil Armstrong"),
    orbital: nasaImage("PIA12909", "LRO view of the Apollo 11 landing site from orbit", "NASA/GSFC/Arizona State University"),
  },
  {
    id: "apollo12",
    name: "Apollo 12",
    program: "apollo",
    lat: -3.0124, lon: -23.4216, zoomDeg: 1.6,
    date: "19 November 1969",
    agency: "NASA",
    crew: "Pete Conrad, Alan Bean · Richard Gordon in orbit",
    summary: "A pinpoint landing next to a robot that had arrived two years earlier.",
    description: "Apollo 12 proved astronauts could land on target: Intrepid touched down about 180 meters from the Surveyor 3 probe, which had landed in 1967. The crew walked over and brought pieces of it home to study how materials age on the Moon.",
    lookFor: "The Ocean of Storms is the largest dark plain on the Moon. Zoom out to see how far it stretches.",
    layer: "kaguya",
    photo: nasaImage("AS12-48-7134", "Alan Bean beside the Surveyor 3 spacecraft, with the lunar module Intrepid behind", "NASA / Pete Conrad"),
    orbital: nasaImage("PIA12922", "LRO view of the Apollo 12 landing site in Oceanus Procellarum", "NASA/GSFC/Arizona State University"),
  },
  {
    id: "apollo14",
    name: "Apollo 14",
    program: "apollo",
    lat: -3.6453, lon: -17.4714, zoomDeg: 1.6,
    date: "5 February 1971",
    agency: "NASA",
    crew: "Alan Shepard, Edgar Mitchell · Stuart Roosa in orbit",
    summary: "Hiking the Fra Mauro hills to sample debris from a giant impact.",
    description: "The Fra Mauro hills are made of debris thrown out when the Imbrium basin formed, 1,000 km to the north. Shepard and Mitchell hauled a hand cart toward the rim of Cone crater to collect it, and Shepard hit two golf balls.",
    lookFor: "Switch to Geology. The Fra Mauro Formation has its own color, wrapping around the Imbrium basin like a skirt.",
    layer: "geology",
    photo: nasaImage("as14-68-9487", "The Apollo 14 lunar module Antares on the Fra Mauro highlands, with an astronaut in the distance", "NASA / Edgar Mitchell"),
    orbital: nasaImage("PIA12897", "LRO view of the Apollo 14 site, with the astronauts' footpath toward Cone crater visible", "NASA/GSFC/Arizona State University"),
  },
  {
    id: "apollo15",
    name: "Apollo 15",
    program: "apollo",
    lat: 26.1322, lon: 3.6339, zoomDeg: 2.2,
    date: "30 July 1971",
    agency: "NASA",
    crew: "David Scott, James Irwin · Alfred Worden in orbit",
    summary: "The first lunar rover, at the foot of the Apennine Mountains.",
    description: "The crew landed between the Apennine Mountains, which rise more than 4 km, and Hadley Rille, a winding channel cut by ancient lava. With the first Lunar Roving Vehicle they drove 28 km and found the 'Genesis Rock', a 4-billion-year-old piece of the original crust.",
    lookFor: "Follow Hadley Rille's S-curve past the landing site, then switch to Geology to see the mountains and the lava plain in different colors.",
    layer: "geology",
    photo: nasaImage("as15-86-11603", "James Irwin at the Lunar Roving Vehicle with Mount Hadley behind", "NASA / David Scott"),
  },
  {
    id: "apollo16",
    name: "Apollo 16",
    program: "apollo",
    lat: -8.9730, lon: 15.5002, zoomDeg: 1.6,
    date: "21 April 1972",
    agency: "NASA",
    crew: "John Young, Charles Duke · Ken Mattingly in orbit",
    summary: "The only Apollo landing in the bright central highlands.",
    description: "Geologists expected volcanic rock in the Descartes highlands. The crew found impact breccias instead: rocks shattered and welded together by billions of years of collisions. Being wrong taught scientists how the highlands really formed.",
    lookFor: "Compare LRO with Elevation. The bright highlands stand well above the dark seas around them.",
    layer: "lola",
    photo: nasaImage("as16-113-18339", "John Young leaping from the surface while saluting the flag", "NASA / Charles Duke"),
  },
  {
    id: "apollo17",
    name: "Apollo 17",
    program: "apollo",
    lat: 20.1908, lon: 30.7717, zoomDeg: 1.6,
    date: "11 December 1972",
    agency: "NASA",
    crew: "Eugene Cernan, Harrison Schmitt · Ronald Evans in orbit",
    summary: "The last footsteps, and the first geologist on the Moon.",
    description: "Taurus-Littrow is a valley deeper than the Grand Canyon, between massifs pushed up by the Serenitatis impact. Schmitt, a geologist, found orange soil at Shorty crater: glass beads from a volcanic fire fountain 3.6 billion years ago. No one has walked on the Moon since.",
    lookFor: "Switch to Minerals and look for the dark mantle around the valley. It's volcanic ash, the same eruptions that made the orange glass.",
    layer: "clementine",
    photo: nasaImage("as17-140-21496", "Harrison Schmitt standing next to a huge split boulder", "NASA / Eugene Cernan"),
  },

  // ── Robotic landers ────────────────────────────────────────────────────────
  {
    id: "luna9",
    name: "Luna 9",
    program: "robotic",
    lat: 7.08, lon: -64.37, zoomDeg: 3,
    date: "3 February 1966",
    agency: "USSR",
    summary: "The first spacecraft to soft-land on the Moon.",
    description: "Luna 9 settled onto Oceanus Procellarum and sent back the first pictures from the surface. They showed the ground was firm enough to stand on, a question that had worried mission planners.",
    layer: "wac",
  },
  {
    id: "luna16",
    name: "Luna 16",
    program: "robotic",
    lat: -0.513, lon: 56.364, zoomDeg: 2,
    date: "20 September 1970",
    agency: "USSR",
    summary: "The first robot to bring Moon rock home.",
    description: "Luna 16 drilled into Mare Fecunditatis and returned 101 grams of soil to Earth, the first lunar sample collected without a crew.",
    layer: "clementine",
    orbital: nasaImage("PIA12984", "LRO view of the Luna 16 lander on Mare Fecunditatis", "NASA/GSFC/Arizona State University"),
  },
  {
    id: "luna24",
    name: "Luna 24",
    program: "robotic",
    lat: 12.7145, lon: 62.2129, zoomDeg: 2,
    date: "18 August 1976",
    agency: "USSR",
    summary: "A two-meter core from Mare Crisium, then 37 years of silence.",
    description: "Luna 24 drilled a 2-meter core from the Sea of Crises and returned 170 grams of layered soil. No spacecraft soft-landed on the Moon again until Chang'e 3 in 2013.",
    layer: "clementine",
  },
  {
    id: "change3",
    name: "Chang'e 3",
    program: "robotic",
    lat: 44.1214, lon: -19.5116, zoomDeg: 2,
    date: "14 December 2013",
    agency: "CNSA",
    summary: "China's first landing, with the Yutu rover.",
    description: "Chang'e 3 landed in northern Mare Imbrium and released the Yutu rover, whose ground-penetrating radar found layers of lava and soil beneath the surface.",
    layer: "kaguya",
  },
  {
    id: "change4",
    name: "Chang'e 4",
    program: "robotic",
    lat: -45.4446, lon: 177.5991, zoomDeg: 3,
    date: "3 January 2019",
    agency: "CNSA",
    summary: "The first landing on the far side.",
    description: "Chang'e 4 set down in Von Kármán crater, inside the vast South Pole-Aitken basin. A relay satellite beyond the Moon carried its signals to Earth. Its rover, Yutu-2, became the longest-lived lunar rover.",
    layer: "lola",
  },
  {
    id: "change5",
    name: "Chang'e 5",
    program: "robotic",
    lat: 43.0576, lon: -51.9161, zoomDeg: 2,
    date: "1 December 2020",
    agency: "CNSA",
    summary: "1.7 kg of the youngest lava ever sampled on the Moon.",
    description: "Chang'e 5 landed near Mons Rümker and returned 1,731 grams of rock. The lava it sampled is about 2 billion years old, a billion years younger than anything Apollo collected, so the Moon stayed volcanically active longer than expected.",
    layer: "clementine",
  },
  {
    id: "change6",
    name: "Chang'e 6",
    program: "robotic",
    lat: -41.6385, lon: -153.9852, zoomDeg: 3,
    date: "1 June 2024",
    agency: "CNSA",
    summary: "The first rock returned from the far side.",
    description: "Chang'e 6 landed in Apollo crater, inside the South Pole-Aitken basin, and returned 1,935 grams of far-side material. These were the first samples from the hemisphere that never faces Earth.",
    layer: "lola",
  },
  {
    id: "chandrayaan3",
    name: "Chandrayaan-3",
    program: "robotic",
    lat: -69.3733, lon: 32.3191, zoomDeg: 3,
    date: "23 August 2023",
    agency: "ISRO",
    summary: "India's Vikram lander, the first near the south pole.",
    description: "Vikram and its rover Pragyan landed farther south than any mission before. Pragyan measured sulfur in the soil directly, and Vikram even hopped 40 cm to test a relaunch.",
    layer: "lola",
  },
  {
    id: "slim",
    name: "SLIM",
    program: "robotic",
    lat: -13.3160, lon: 25.2510, zoomDeg: 2,
    date: "19 January 2024",
    agency: "JAXA",
    summary: "A pinpoint landing, upside down.",
    description: "Japan's Smart Lander for Investigating Moon came down within about 100 meters of its target near Shioli crater. An engine failure left it resting on its nose, but its camera still worked and its solar cells revived it for several lunar nights.",
    layer: "wac",
  },
  {
    id: "im1",
    name: "IM-1 Odysseus",
    program: "robotic",
    lat: -80.13, lon: 1.44, zoomDeg: 3,
    date: "22 February 2024",
    agency: "Intuitive Machines / NASA",
    summary: "The first commercial landing, and the first U.S. landing since 1972.",
    description: "Odysseus caught a leg on the slope near Malapert A and tipped onto its side, but it kept sending data for a week from the farthest south any lander had reached.",
    layer: "lola",
  },
  {
    id: "blueghost1",
    name: "Blue Ghost 1",
    program: "robotic",
    lat: 18.56, lon: 61.81, zoomDeg: 2,
    date: "2 March 2025",
    agency: "Firefly Aerospace / NASA",
    summary: "The first commercial lander to touch down upright.",
    description: "Blue Ghost landed near Mons Latreille in Mare Crisium and ran a full lunar day of NASA experiments, including a heat-flow probe that drilled into the soil. It photographed a sunset from the surface.",
    layer: "kaguya",
  },
  {
    id: "lcross",
    name: "LCROSS impact",
    program: "robotic",
    lat: -84.68, lon: -48.73, zoomDeg: 3,
    date: "9 October 2009",
    agency: "NASA",
    summary: "A rocket stage crashed into Cabeus crater, and the plume held water.",
    description: "NASA steered a spent rocket stage into the permanently shadowed floor of Cabeus. The shepherding spacecraft flew through the plume and detected water ice, a turning point in the search for lunar water.",
    layer: "lola",
  },

  // ── Artemis IV candidate regions (approximate centers) ─────────────────────
  {
    id: "haworth",
    name: "Haworth",
    program: "artemis",
    lat: -87.4, lon: -5.0, zoomDeg: 4,
    agency: "NASA",
    summary: "Candidate Artemis IV landing region on a crater rim near the pole.",
    description: "Haworth's floor is in permanent shadow and is thought to trap ice, while parts of its rim get long hours of sunlight. Position shown is the approximate center of NASA's candidate region.",
    layer: "lola",
  },
  {
    id: "malapert",
    name: "Malapert Massif",
    program: "artemis",
    lat: -86.0, lon: 2.9, zoomDeg: 4,
    agency: "NASA",
    summary: "A 5 km-high mountain with a clear view of Earth.",
    description: "Malapert's summit sees Earth almost all the time, which helps direct communications. Position shown is the approximate center of NASA's candidate region.",
    layer: "lola",
  },
  {
    id: "mouton",
    name: "Mons Mouton",
    program: "artemis",
    lat: -84.7, lon: 31.0, zoomDeg: 4,
    agency: "NASA",
    summary: "A broad, flat-topped mountain named for NASA mathematician Melba Mouton.",
    description: "Its plateau is one of the smoothest high places near the pole. Position shown is the approximate center of NASA's candidate region.",
    layer: "lola",
  },
  {
    id: "nobile",
    name: "Nobile Rim",
    program: "artemis",
    lat: -85.2, lon: 53.5, zoomDeg: 5,
    agency: "NASA",
    summary: "The rim of a 73 km crater that NASA's VIPER rover was built to explore.",
    description: "Nobile's shadowed interior may hold ice in its soil. Position shown is the center of the crater; NASA's candidate regions lie on its rim.",
    layer: "lola",
  },
  {
    id: "degerlache",
    name: "de Gerlache Rim",
    program: "artemis",
    lat: -88.5, lon: -87.1, zoomDeg: 4,
    agency: "NASA",
    summary: "A crater rim joined to Shackleton by a long, sunlit ridge.",
    description: "The ridge between de Gerlache and Shackleton is among the most continuously lit ground on the Moon, valuable for solar power. Position shown is the center of the crater.",
    layer: "lola",
  },

  // ── Craters and basins ─────────────────────────────────────────────────────
  {
    id: "shackleton",
    name: "Shackleton Crater",
    program: "feature",
    lat: -89.6, lon: 128.5, zoomDeg: 3,
    summary: "A 21 km crater at the south pole whose floor never sees the Sun.",
    description: "Shackleton's rim sits in near-permanent sunlight while its floor remains in eternal shadow. Possible water ice at its base makes it a prime target for future crewed missions.",
    lookFor: "Switch to Elevation. The crater is a deep blue hole, about 4 km deep.",
    layer: "lola",
  },
  {
    id: "tycho",
    name: "Tycho",
    program: "feature",
    lat: -43.38, lon: -11.24, zoomDeg: 5,
    summary: "A young, 85 km crater whose rays cross the whole near side.",
    description: "Tycho formed about 108 million years ago, recently by lunar standards. Its bright rays of ejected rock stretch more than 1,500 km, and a central peak over 1.5 km high rises from an impact-melt floor.",
    lookFor: "In LRO the rays are bright. Switch to Elevation and they vanish: they're a thin layer of fresh rock, not raised ground.",
    layer: "wac",
  },
  {
    id: "copernicus",
    name: "Copernicus",
    program: "feature",
    lat: 9.62, lon: -20.08, zoomDeg: 5,
    summary: "A 93 km crater with terraced walls, about 800 million years old.",
    description: "Copernicus is a textbook complex crater: slumped terraces inside the rim, a cluster of central peaks, and a field of secondary craters around it. Apollo 12 samples include its rays.",
    layer: "kaguya",
  },
  {
    id: "aristarchus",
    name: "Aristarchus",
    program: "feature",
    lat: 23.7, lon: -47.4, zoomDeg: 5,
    summary: "The brightest large crater on the Moon, on a volcanic plateau.",
    description: "Aristarchus is bright enough to spot with binoculars even on the Moon's night side, lit by earthshine. It sits on a plateau covered in volcanic ash, next to Vallis Schröteri.",
    layer: "clementine",
  },
  {
    id: "vallis-schroteri",
    name: "Vallis Schröteri",
    program: "feature",
    lat: 24.75, lon: -49.32, zoomDeg: 4,
    summary: "The largest sinuous rille on the Moon.",
    description: "A meandering channel over 160 km long, likely carved by lava flowing from the Cobra Head vent near Herodotus crater.",
    layer: "kaguya",
  },
  {
    id: "messier",
    name: "Messier",
    program: "feature",
    lat: -1.98, lon: 47.65, zoomDeg: 2,
    summary: "Twin craters from a grazing impact.",
    description: "An asteroid struck Mare Fecunditatis at a very low angle, making the oval crater Messier and a second crater, Messier A, to its west, trailed by two long rays.",
    lookFor: "Look for the pair of straight rays shooting west, like a comet's tail.",
    layer: "wac",
  },
  {
    id: "jackson",
    name: "Jackson",
    program: "feature",
    lat: 22.0, lon: -163.25, zoomDeg: 4,
    summary: "A far-side crater with a cracked floor of frozen impact melt.",
    description: "Jackson's floor is blanketed with impact melt that cooled, shrank and cracked. It also has a spectacular central peak complex and bright rays of its own.",
    layer: "kaguya",
  },
  {
    id: "orientale",
    name: "Orientale Basin",
    program: "feature",
    lat: -19.4, lon: -92.8, zoomDeg: 60,
    summary: "A 930 km bullseye, the youngest of the giant basins.",
    description: "Orientale formed about 3.8 billion years ago, and lava never filled it in, so its three rings of mountains survive almost untouched. It sits on the western edge of the near side, mostly hidden from Earth.",
    lookFor: "Switch to Elevation to see the rings as concentric walls.",
    layer: "lola",
  },
  {
    id: "spa",
    name: "South Pole-Aitken Basin",
    program: "feature",
    lat: -53, lon: -169, zoomDeg: 130,
    summary: "The Moon's largest and oldest impact scar, 2,500 km across.",
    description: "This basin is so big and deep that it is easiest to see as a vast low region on the far side. The impact may have dug into the Moon's mantle, which is why Chang'e 4 and Chang'e 6 went there.",
    lookFor: "In Elevation, the whole basin is a blue-purple depression covering much of the southern far side.",
    layer: "lola",
  },
];

export function siteById(id: string | null | undefined): Site | undefined {
  return id ? SITES.find(s => s.id === id) : undefined;
}

/** WWT planet-mode RA (radians) for a site: −east longitude, wrapped. */
export function siteRaRad(site: { lon: number }): number {
  const ra = (-site.lon * Math.PI) / 180;
  return ((ra % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function siteDecRad(site: { lat: number }): number {
  return (site.lat * Math.PI) / 180;
}
