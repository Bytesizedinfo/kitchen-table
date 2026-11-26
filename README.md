# Kitchen Table

A realistic 3D food preparation simulator in the browser. Heat really moves through every piece of food on a 1–3 mm grid, so a seared steak shows a true grey band and pink centre when you cut it, a boiled egg's yolk sets on the clock, and browning only starts once a surface has dried out.

**Live:** https://bytesizedinfo.github.io/kitchen-table/

## What you can do (phase 1)

- Take a strip steak, an egg (from the fridge or at room temperature) or a potato from the pantry.
- Cook on a two-burner gas hob: a 2.4 kg cast-iron pan and a pot of water, with the flame you set. Cold food cools the pan; the pot simmers or boils.
- Flip with tongs, probe the centre with a thermometer (live chart, fast-forward to a target temperature), and cut with a knife to see inside.
- Thermal view colours every surface and cut face by temperature. Time runs at 1× to 60×.
- Readouts: centre and coldest-point temperature, doneness, USDA safety (63 °C + 3 min for beef), cooking loss, browning.

## Phase 2a: knife & vegetables

- Fruit & veg with USDA compositions: onion (real layers), carrot, tomato, apple, lemon, banana, strawberry, avocado, garlic, red pepper, potato.
- Knife presets with the culinary-school sizes: slices, batonnet, julienne, small/medium/large dice, brunoise. Mass, water and heat are conserved exactly; small pieces become light "bits" you can drag as a pile, fry and stir with the spatula.
- Peeler, lemon juice and ascorbic acid. Cut apple, avocado, banana and potato brown in air (browning enzyme, slowed by acid, stopped by heat).
- Onion sweats, turns translucent, golden, then deep brown; tomato skins split after 30–60 s in boiling water; bananas brown in the fridge.
- Fats and oils with smoke points (butter, ghee, olive oils, canola, sunflower, peanut).

## Phase 2b: cold & melting

- Fridge (4 °C) and freezer (−18 °C). Freezing uses the Miles ice-fraction model with latent heat: a frozen steak frosts over, sits on a plateau just below −1.7 °C while freezing, and thaws in the fridge over hours.
- Butter, dark and milk chocolate, vanilla ice cream, cheddar and mozzarella. Melted food runs off into puddles that can set again: butter foams, turns to brown butter and smokes; ice cream drips; chocolate melts at its Form V point and blooms if it sets without tempering.
- Pantry items start "as stored" (fridge, freezer or room), or at a temperature you pick.

## Phase 2c: jellies, gummies & sweets

- Jelly dessert that wobbles at the frequency its gelatin stiffness gives (≈4 Hz for a 5 cm jelly), melts at 28–30 °C and sets again below 22 °C. Poke it with the hand. Make your own: warm jelly mix in a glass mould sets in the fridge in 2–4 h; unmould it too soon and it runs.
- Gummy worms as soft chains: grab one end and pull to stretch it until it tears, cut it with the knife, melt it in a warm pan. Gummy bears, marshmallows (trapped air expands as they warm; they deflate after going gooey), and lollipops that turn tacky above their glass transition.

## Phase 2d: meat, fish & bakery

- Chicken breast with its own protein transitions (54.9–76.1 °C) and USDA safety at 74 °C inside: poached it keeps about 77 % of its weight; held at 60 °C for an hour it loses about 6.6 %.
- Salmon fillet with silver skin and white fat lines; it turns opaque, then flakes, and loses less water than chicken (ratio from Kong 2008). Safe at 63 °C inside.
- Bacon renders its fat into the pan (about 91 % of it) and crisps at about 31 % of its raw weight. Pork sausage cooks through to 71 °C in 10–25 min at about 80 % yield; roll it a quarter turn at a time; its casing can split in a hot pan.
- Two-slot toaster with a shade dial (sets the timer) and a lever: the elements glow, the bread browns on both faces, then pops up.
- White bread, croissant, glazed donut, chocolate-chip cookie (the chips melt in place), a layer cake (sponge, jam, buttercream) and a cheesecake to slice and plate.

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
