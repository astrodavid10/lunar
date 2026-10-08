import sys
import numpy as np
src, dst = sys.argv[1], sys.argv[2]
dn = np.fromfile(src, dtype="<i2").reshape(720, 1440)
h = dn.astype(np.float64) * 0.5
lo, hi = -9200.0, 10800.0
print("min/max m", h.min(), h.max())
q = np.clip(np.round((h - lo) / (hi - lo) * 255), 0, 255).astype(np.uint8)
q.tofile(dst)
def at(lat, lon):
    r = int(round((90 - lat) * 4 - 0.5)); c = int(round((lon % 360) * 4 - 0.5))
    return h[min(max(r, 0), 719), c % 1440], lo + q[min(max(r,0),719), c % 1440] * (hi - lo) / 255
for name, lat, lon in [("Apollo 11", 0.674, 23.47), ("Mare Imbrium", 32.8, -15.6), ("Shackleton floor", -89.6, 128.5), ("Antoniadi (SPA low)", -69.7, -172.0), ("Engel'gardt high", 5.4, -158.6), ("Tycho floor", -43.3, -11.24)]:
    print(f"{name:22s} raw {at(lat, lon)[0]:8.0f} m   quantized {at(lat, lon)[1]:8.0f} m")
