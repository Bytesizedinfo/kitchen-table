# Kitchen Table

A realistic 3D food preparation simulator in the browser. Heat really moves through every piece of food on a 1–3 mm grid, so a seared steak shows a true grey band and pink centre when you cut it, a boiled egg's yolk sets on the clock, and browning only starts once a surface has dried out.

**Live:** https://bytesizedinfo.github.io/kitchen-table/

## What you can do (phase 1)

- Take a strip steak, an egg (from the fridge or at room temperature) or a potato from the pantry.
- Cook on a two-burner gas hob: a 2.4 kg cast-iron pan and a pot of water, with the flame you set. Cold food cools the pan; the pot simmers or boils.
- Flip with tongs, probe the centre with a thermometer (live chart, fast-forward to a target temperature), and cut with a knife to see inside.
- Thermal view colours every surface and cut face by temperature. Time runs at 1× to 60×.
- Readouts: centre and coldest-point temperature, doneness, USDA safety (63 °C + 3 min for beef), cooking loss, browning.

## The science

Every number is in [SOURCES.md](SOURCES.md) (also in the app under **Sources**), tagged as sourced, calibrated or constant. Tests in `js/test/tests.js` check the simulator against exact heat-conduction solutions and against the sourced behaviours (Williams' boiled egg, egg proteins at 64 °C, surfaces held below boiling while wet, pectin kinetics, USDA holds, steak doneness and cooking loss).

## Run and test locally

```
python -I tools/serve.py 8931          # static server with correct MIME types
node js/test/node.mjs                  # simulation tests under Node
python -I tools/pw.py "test=all&norender" out.png        # same tests in headless Edge
python -I tools/pw.py "scene=steak" steak.png 1400 860 200 --gpu --wait=9000
```

No build step: plain ES modules, three.js 0.186.0 vendored in `vendor/three` (MIT).
