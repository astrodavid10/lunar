// Guided tours. Each stop flies to a site, switches to the map that best
// shows its point, and reveals its beats one at a time.

export interface TourStop {
  siteId: string;
  /** Layer id to show at this stop. */
  layer: string;
  /** Optional zoom override (degrees). */
  zoomDeg?: number;
  /** Optional view-center override, for stops framed around a region. */
  lat?: number;
  lon?: number;
  title: string;
  beats: string[];
}

export interface Tour {
  id: string;
  name: string;
  tagline: string;
  stops: TourStop[];
}

export const TOURS: Tour[] = [
  {
    id: "apollo",
    name: "Apollo, 1969–1972",
    tagline: "Six landings, each one bolder than the last.",
    stops: [
      {
        siteId: "apollo11", layer: "wac",
        title: "Apollo 11 · Sea of Tranquility",
        beats: [
          "July 1969. The first landing site was chosen to be as safe as possible: flat, smooth and near the equator.",
          "Even so, Armstrong had to fly past a field of boulders by hand, landing with under a minute of fuel to spare.",
          "Look at how plain the surrounding mare is. Later crews could go to rougher, more interesting ground.",
        ],
      },
      {
        siteId: "apollo12", layer: "kaguya",
        title: "Apollo 12 · Ocean of Storms",
        beats: [
          "Four months later, the goal was precision: land next to Surveyor 3, a robot that had arrived in 1967.",
          "Intrepid set down 180 meters away. Pinpoint landings meant future crews could target specific geology.",
        ],
      },
      {
        siteId: "apollo14", layer: "geology",
        title: "Apollo 14 · Fra Mauro",
        beats: [
          "The first landing in hilly terrain, aimed at debris thrown out by the Imbrium impact.",
          "On the geologic map, the Fra Mauro Formation is its own color, a blanket of ejecta from a basin 1,000 km away.",
        ],
      },
      {
        siteId: "apollo15", layer: "geology", zoomDeg: 3,
        title: "Apollo 15 · Hadley-Apennine",
        beats: [
          "Now the crews brought a car. The rover let Scott and Irwin drive to the edge of Hadley Rille.",
          "The mountains here are the rim of the Imbrium basin, pushed up more than 4 km. The plain beside them is younger lava.",
          "Follow the rille's S-curve. It's a channel carved by flowing lava, like a collapsed lava tube.",
        ],
      },
      {
        siteId: "apollo16", layer: "lola",
        title: "Apollo 16 · Descartes Highlands",
        beats: [
          "The only Apollo landing in the bright highlands, the Moon's ancient crust.",
          "On the elevation map, the highlands stand well above the seas. They're older, higher, and covered in craters.",
          "The crew expected volcanic rock but found shattered impact breccia. Being wrong rewrote the textbooks.",
        ],
      },
      {
        siteId: "apollo17", layer: "clementine",
        title: "Apollo 17 · Taurus-Littrow",
        beats: [
          "December 1972. A deep valley between mountains, with a dark volcanic blanket on its floor.",
          "Harrison Schmitt, a geologist, spotted orange soil: tiny glass beads sprayed out by a 3.6-billion-year-old lava fountain.",
          "On the way out, this crew took the 'Blue Marble' photo of the whole Earth. No one has walked on the Moon since they left.",
        ],
      },
    ],
  },
  {
    id: "south-pole",
    name: "Artemis and the south pole",
    tagline: "Where sunlight never sets, and shadows never lift.",
    stops: [
      {
        siteId: "shackleton", layer: "lola", zoomDeg: 40, lat: -90, lon: 0,
        title: "The lunar south pole",
        beats: [
          "The Moon's axis is barely tilted, so at the poles the Sun always skims the horizon.",
          "Crater floors here have not seen sunlight for billions of years. They are among the coldest places in the solar system, cold enough to trap water ice.",
          "Mountain peaks and crater rims nearby stay lit for most of the year. That light is the power, and the ice is the water.",
        ],
      },
      {
        siteId: "shackleton", layer: "lola",
        title: "Shackleton Crater",
        beats: [
          "Shackleton sits almost exactly on the pole. Its rim catches sunlight for most of the year, and its floor never does.",
          "On the elevation map it's a deep blue bowl, about 4 km deep and 21 km wide.",
        ],
      },
      {
        siteId: "degerlache", layer: "lola",
        title: "de Gerlache and the connecting ridge",
        beats: [
          "A long ridge runs between de Gerlache and Shackleton. It's among the most continuously sunlit ground on the Moon.",
          "That makes it one of NASA's candidate landing regions for Artemis IV, the planned return of astronauts to the Moon's surface.",
        ],
      },
      {
        siteId: "malapert", layer: "lola",
        title: "Malapert Massif",
        beats: [
          "A 5 km-high mountain with Earth almost always above its horizon, which matters for talking to home.",
          "IM-1 Odysseus landed on the slopes nearby in 2024 and tipped over, but kept working.",
        ],
      },
      {
        siteId: "lcross", layer: "lola",
        title: "Cabeus: proof of ice",
        beats: [
          "In 2009 NASA crashed a rocket stage into the permanently shadowed floor of Cabeus.",
          "A spacecraft following behind flew through the plume and found water ice. The south pole became the place to go.",
        ],
      },
      {
        siteId: "chandrayaan3", layer: "lola",
        title: "Chandrayaan-3",
        beats: [
          "India's Vikram lander touched down here in 2023, the first soft landing this far south.",
          "Its Pragyan rover measured the soil's chemistry directly, a preview of what Artemis crews will do.",
        ],
      },
    ],
  },
  {
    id: "impacts",
    name: "A history written in craters",
    tagline: "Four billion years of collisions, oldest to youngest.",
    stops: [
      {
        siteId: "spa", layer: "lola",
        title: "South Pole-Aitken Basin",
        beats: [
          "The oldest and largest impact we can still see: a depression 2,500 km across on the far side.",
          "On the elevation map it's a vast blue-purple lowland. The impact may have dug into the Moon's mantle.",
        ],
      },
      {
        siteId: "orientale", layer: "lola",
        title: "Orientale Basin",
        beats: [
          "About 3.8 billion years ago, one of the last giant impacts made this 930 km bullseye.",
          "Lava never flooded it, so its rings of mountains survive. Most basins on the near side look like this underneath their dark lava.",
        ],
      },
      {
        siteId: "copernicus", layer: "kaguya",
        title: "Copernicus",
        beats: [
          "About 800 million years old. Big craters like this have terraced walls that slumped inward and peaks that rebounded up from the center.",
          "The small craters scattered around it are secondaries: holes made by blocks thrown out of the main crater.",
        ],
      },
      {
        siteId: "jackson", layer: "kaguya",
        title: "Jackson",
        beats: [
          "On the far side, Jackson's floor is a frozen pool of rock that melted in the impact.",
          "As the melt cooled it shrank and cracked, leaving the fractured texture you see when you zoom in.",
        ],
      },
      {
        siteId: "messier", layer: "wac",
        title: "Messier",
        beats: [
          "Most impacts make round craters, whatever angle they hit at. Messier is the exception.",
          "A body came in almost horizontally, made an oval crater, and threw debris westward in two long, straight rays.",
        ],
      },
      {
        siteId: "tycho", layer: "wac",
        title: "Tycho",
        beats: [
          "About 108 million years old, about when dinosaurs were alive. Its rays are bright because fresh rock hasn't darkened yet.",
          "Open Compare and slide to Elevation. The rays disappear: they're paint-thin, not raised ground.",
        ],
      },
    ],
  },
];

export function tourById(id: string | null | undefined): Tour | undefined {
  return id ? TOURS.find(t => t.id === id) : undefined;
}
