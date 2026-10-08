// Named features for the surface label overlay. Positions and diameters are
// rounded from the IAU Gazetteer of Planetary Nomenclature. Labels fade in
// once a feature is large enough on screen to be worth naming.

export interface NamedFeature {
  name: string;
  lat: number;
  lon: number;
  /** Diameter in km. */
  km: number;
  kind: "mare" | "crater" | "basin" | "mons";
}

export const FEATURES: NamedFeature[] = [
  // Maria and oceanus
  { name: "Oceanus Procellarum", lat: 18.4, lon: -57.4, km: 2568, kind: "mare" },
  { name: "Mare Imbrium", lat: 32.8, lon: -15.6, km: 1146, kind: "mare" },
  { name: "Mare Frigoris", lat: 56.0, lon: 1.4, km: 1596, kind: "mare" },
  { name: "Mare Serenitatis", lat: 28.0, lon: 17.5, km: 707, kind: "mare" },
  { name: "Mare Tranquillitatis", lat: 8.5, lon: 31.4, km: 873, kind: "mare" },
  { name: "Mare Crisium", lat: 17.0, lon: 59.1, km: 556, kind: "mare" },
  { name: "Mare Fecunditatis", lat: -7.8, lon: 51.3, km: 909, kind: "mare" },
  { name: "Mare Nectaris", lat: -15.2, lon: 35.5, km: 339, kind: "mare" },
  { name: "Mare Nubium", lat: -21.3, lon: -16.6, km: 715, kind: "mare" },
  { name: "Mare Humorum", lat: -24.4, lon: -38.6, km: 389, kind: "mare" },
  { name: "Mare Cognitum", lat: -10.0, lon: -23.1, km: 376, kind: "mare" },
  { name: "Mare Vaporum", lat: 13.3, lon: 3.6, km: 245, kind: "mare" },
  { name: "Mare Insularum", lat: 7.5, lon: -30.9, km: 513, kind: "mare" },
  { name: "Mare Smythii", lat: 1.3, lon: 87.5, km: 373, kind: "mare" },
  { name: "Mare Marginis", lat: 13.3, lon: 86.1, km: 358, kind: "mare" },
  { name: "Mare Australe", lat: -38.9, lon: 93.0, km: 603, kind: "mare" },
  { name: "Mare Moscoviense", lat: 27.3, lon: 147.9, km: 277, kind: "mare" },
  { name: "Mare Ingenii", lat: -33.7, lon: 163.5, km: 318, kind: "mare" },
  { name: "Sinus Iridum", lat: 44.1, lon: -31.5, km: 236, kind: "mare" },

  // Basins
  { name: "South Pole–Aitken", lat: -53, lon: -169, km: 2500, kind: "basin" },
  { name: "Orientale", lat: -19.4, lon: -92.8, km: 930, kind: "basin" },
  { name: "Hertzsprung", lat: 2.0, lon: -128.7, km: 570, kind: "basin" },
  { name: "Apollo", lat: -36.1, lon: -151.8, km: 524, kind: "basin" },
  { name: "Korolev", lat: -4.4, lon: -157.4, km: 437, kind: "basin" },
  { name: "Mendeleev", lat: 5.4, lon: 140.9, km: 313, kind: "basin" },
  { name: "Birkhoff", lat: 58.9, lon: -146.1, km: 330, kind: "basin" },

  // Craters
  { name: "Bailly", lat: -66.5, lon: -69.1, km: 301, kind: "crater" },
  { name: "Clavius", lat: -58.8, lon: -14.1, km: 231, kind: "crater" },
  { name: "Schickard", lat: -44.3, lon: -54.6, km: 206, kind: "crater" },
  { name: "Von Kármán", lat: -44.8, lon: 176.2, km: 186, kind: "crater" },
  { name: "Tsiolkovskiy", lat: -20.4, lon: 129.1, km: 185, kind: "crater" },
  { name: "Petavius", lat: -25.3, lon: 60.4, km: 177, kind: "crater" },
  { name: "Grimaldi", lat: -5.2, lon: -68.6, km: 173, kind: "crater" },
  { name: "Ptolemaeus", lat: -9.2, lon: -1.8, km: 154, kind: "crater" },
  { name: "Langrenus", lat: -8.9, lon: 61.0, km: 132, kind: "crater" },
  { name: "Gassendi", lat: -17.6, lon: -40.1, km: 110, kind: "crater" },
  { name: "Alphonsus", lat: -13.4, lon: -2.8, km: 108, kind: "crater" },
  { name: "Plato", lat: 51.6, lon: -9.4, km: 101, kind: "crater" },
  { name: "Theophilus", lat: -11.4, lon: 26.4, km: 99, kind: "crater" },
  { name: "Arzachel", lat: -18.2, lon: -1.9, km: 97, kind: "crater" },
  { name: "Posidonius", lat: 31.9, lon: 29.9, km: 95, kind: "crater" },
  { name: "Copernicus", lat: 9.6, lon: -20.1, km: 93, kind: "crater" },
  { name: "Daedalus", lat: -5.9, lon: 179.4, km: 93, kind: "crater" },
  { name: "Tycho", lat: -43.3, lon: -11.2, km: 85, kind: "crater" },
  { name: "Archimedes", lat: 29.7, lon: -4.0, km: 81, kind: "crater" },
  { name: "Jackson", lat: 22.0, lon: -163.2, km: 71, kind: "crater" },
  { name: "Eratosthenes", lat: 14.5, lon: -11.3, km: 58, kind: "crater" },
  { name: "Aristarchus", lat: 23.7, lon: -47.4, km: 40, kind: "crater" },
  { name: "Kepler", lat: 8.1, lon: -38.0, km: 29, kind: "crater" },
  { name: "Shackleton", lat: -89.6, lon: 128.5, km: 21, kind: "crater" },

  // Mountains
  { name: "Montes Apenninus", lat: 18.9, lon: -3.7, km: 401, kind: "mons" },
];
