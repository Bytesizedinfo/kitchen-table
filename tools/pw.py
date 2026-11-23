"""Drive headless Edge to run the in-page tests or screenshot a scene, and print the diag panel.
Usage: python -I tools/pw.py "<query>" <out.png> [width height timeout_s] [--gpu] [--base URL]
  e.g. python -I tools/pw.py "test=all&norender" out.png
       python -I tools/pw.py "scene=steak" steak.png 1400 900 120 --gpu
(adapted from pore-pressure/source/tools/pw.py)"""
import sys, time
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = [a for a in sys.argv[1:] if a.startswith('--')]
q, out = args[0], args[1]
w = int(args[2]) if len(args) > 2 else 1280
h = int(args[3]) if len(args) > 3 else 800
tmo = float(args[4]) if len(args) > 4 else 300
base = 'http://127.0.0.1:8931/index.html'
for f in flags:
    if f.startswith('--base='): base = f.split('=', 1)[1]
gpu = '--gpu' in flags
launch = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] if gpu else \
         ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"]
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True, args=launch)
    pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    logs = []
    pg.on("console", lambda m: logs.append(("console." + m.type, m.text)) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
    t0 = time.time()
    pg.goto(base + "?" + q, wait_until="load")
    try:
        pg.wait_for_function("() => { const d = document.getElementById('diag'); return d && /RENDER ok|SUMMARY|ERROR/.test(d.textContent || ''); }", timeout=tmo * 1000)
    except Exception as e:
        logs.append(("timeout", str(e)[:200]))
    pg.wait_for_timeout(int(next((f.split("=")[1] for f in flags if f.startswith("--wait=")), 2500)))
    pg.screenshot(path=out, timeout=180000, animations="disabled")
    diag = pg.evaluate("() => (document.getElementById('diag')||{}).textContent || ''")
    print("TIME %.1fs" % (time.time() - t0))
    print("DIAG:\n" + diag[:12000])
    for k, v in logs[:25]:
        print(k, ":", v[:500])
    b.close()
