"""Simplify the LROC global mare boundaries (Nelson et al. 2014) for display.

Output JSON: {"q": 0.005, "names": [...], "polys": [[nameIndex, areaKm2, ring, ring, ...], ...]}
Each ring is a flat list of delta-encoded integer (lon, lat) pairs in units of q degrees;
the first ring of a polygon is its outer boundary, the rest are holes.
"""
import json
import sys

import shapefile
from shapely.geometry import Polygon, MultiPolygon, shape

src, dst, tol = sys.argv[1], sys.argv[2], float(sys.argv[3])
min_area_km2 = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
Q = 0.005
# The DBF lost its accents, and two names carry typos; restore IAU spellings.
FIX = {
    "Crger": "Crüger", "Crger East": "Crüger East", "Crger North": "Crüger North", "Crger F": "Crüger F",
    "Kohlschtter": "Kohlschütter", "Von Krmn": "Von Kármán", "Chrtien": "Chrétien",
    "Lacus Somniorium": "Lacus Somniorum", "Lacus Perseveramtiae": "Lacus Perseverantiae",
}
r = shapefile.Reader(src)
names, polys, npts = [], [], 0
for sr in r.iterShapeRecords():
    if float(sr.record[3] or 0) < min_area_km2:
        continue
    name = FIX.get((sr.record[1] or "").strip(), (sr.record[1] or "").strip())
    geom = shape(sr.shape.__geo_interface__).buffer(0).simplify(tol, preserve_topology=True)
    if geom.is_empty:
        continue
    parts = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    if name not in names:
        names.append(name)
    for poly in parts:
        if poly.area < (tol * 2) ** 2:
            continue
        rings = []
        for ring in [poly.exterior, *poly.interiors]:
            coords = list(ring.coords)[:-1]
            if len(coords) < 3:
                continue
            flat, px, py = [], 0, 0
            for x, y in coords:
                ix, iy = round(x / Q), round(y / Q)
                flat += [ix - px, iy - py]
                px, py = ix, iy
            npts += len(coords)
            rings.append(flat)
        if rings:
            polys.append([names.index(name), round(float(sr.record[3])), *rings])
json.dump({"q": Q, "source": "LROC global mare boundaries, Nelson et al. (2014) LPSC 45, 2861", "names": names, "polys": polys},
          open(dst, "w"), separators=(",", ":"))
print("names", len(names), names)
print("polygons", len(polys), "points", npts)
