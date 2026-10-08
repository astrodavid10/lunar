"""Pack the Robbins (2018) lunar crater database into tiered, tiled binaries.

large.bin   D >= 20 km, float32 [lat, lon, diam_km] per crater, sorted by size.
medium.*    5 <= D < 20 km, 15-degree tiles.
small.*     1 <= D < 5 km, 5-degree tiles.
Tiled tiers: <tier>.bin holds uint16 [lat_off, lon_off, diam_m] records
(little-endian) grouped by tile, each tile sorted by diameter descending;
<tier>.idx is uint32 byte offsets, one per tile plus a final end offset.
Tiles are row-major from 90N and 180W. lat = top - lat_off/65535*size,
lon = left + lon_off/65535*size.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
df = pd.read_csv(src, usecols=["LAT_CIRC_IMG", "LON_CIRC_IMG", "DIAM_CIRC_IMG"])
lat = df.LAT_CIRC_IMG.to_numpy(np.float64)
lon = df.LON_CIRC_IMG.to_numpy(np.float64)
lon = np.where(lon > 180, lon - 360, lon)  # 0..360 E -> -180..180
d = df.DIAM_CIRC_IMG.to_numpy(np.float64)

big = d >= 20
order = np.argsort(-d[big])
np.stack([lat[big][order], lon[big][order], d[big][order]], axis=1).astype("<f4").tofile(os.path.join(out, "large.bin"))

meta = {"source": "Robbins (2019) JGR Planets 124, doi:10.1029/2018JE005592", "count": int(len(d)), "large": int(big.sum())}

def pack(name, sel, size, diam_scale):
    rows, cols = int(180 // size), int(360 // size)
    la, lo, dd = lat[sel], lon[sel], d[sel]
    r = np.clip(((90 - la) // size).astype(int), 0, rows - 1)
    c = np.clip(((lo + 180) // size).astype(int), 0, cols - 1)
    tile = r * cols + c
    order = np.lexsort((-dd, tile))
    la, lo, dd, r, c, tile = la[order], lo[order], dd[order], r[order], c[order], tile[order]
    top = 90 - r * size
    left = -180 + c * size
    lat_off = np.clip(np.round((top - la) / size * 65535), 0, 65535)
    lon_off = np.clip(np.round((lo - left) / size * 65535), 0, 65535)
    diam = np.clip(np.round(dd * diam_scale), 0, 65535)
    rec = np.stack([lat_off, lon_off, diam], axis=1).astype("<u2")
    rec.tofile(os.path.join(out, f"{name}.bin"))
    counts = np.bincount(tile, minlength=rows * cols)
    offsets = np.concatenate([[0], np.cumsum(counts)]) * 6
    offsets.astype("<u4").tofile(os.path.join(out, f"{name}.idx"))
    meta[name] = {"count": int(sel.sum()), "tileDeg": size, "rows": rows, "cols": cols, "diamScale": diam_scale, "maxPerTile": int(counts.max())}

pack("medium", (d >= 5) & (d < 20), 15, 1000)
pack("small", (d >= 1) & (d < 5), 5, 1000)
json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)
print(json.dumps(meta, indent=1))

# Round-trip check on a few known craters.
def find(name, la0, lo0):
    k = np.argmin((lat - la0) ** 2 + ((lon - lo0) * np.cos(np.radians(la0))) ** 2)
    print(f"{name:12s} nearest catalog crater: lat {lat[k]:.3f} lon {lon[k]:.3f} D {d[k]:.2f} km")
find("Tycho", -43.31, -11.36)
find("Copernicus", 9.62, -20.08)
find("Shackleton", -89.67, 129.78)
