# Where the numbers come from

Generated from `js/sim/params.js` (`node tools/sources.mjs > SOURCES.md`).

- **sourced**: taken from, or computed directly from, the cited source
- **calibrated**: chosen inside a sourced range, or tuned so a sourced behaviour comes out
- **constant**: physical constant or standard property

| Parameter | Value | Kind | Source |
|---|---|---|---|
| Stefan–Boltzmann constant | `5.670374e-8 W/m²K⁴` | constant | [Standard steam tables / Tetens equation (latent heat, vapour pressure)](https://en.wikipedia.org/wiki/Tetens_equation) |
| gas constant | `8.314 J/mol·K` | constant | [Standard steam tables / Tetens equation (latent heat, vapour pressure)](https://en.wikipedia.org/wiki/Tetens_equation) |
| latent heat of vaporisation of water at 100 °C | `2257000 J/kg` | constant | [Standard steam tables / Tetens equation (latent heat, vapour pressure)](https://en.wikipedia.org/wiki/Tetens_equation) |
| boiling point at sea level | `100 °C` | constant | [Standard steam tables / Tetens equation (latent heat, vapour pressure)](https://en.wikipedia.org/wiki/Tetens_equation) |
| room temperature | `22 °C` | calibrated | — |
| fridge temperature (Williams uses 4 °C) | `4 °C` | calibrated | [C. D. H. Williams (Univ. of Exeter) — Boiling an egg](https://www.exeter.ac.uk/research-centres/theoretical-physics/boiling-an-egg/) |
| room relative humidity | `0.5 ` | calibrated | — |
| natural convection in air: 5–25 W/m²K | `10 W/m²K` | sourced | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| oven air, natural convection (5–25) | `15 W/m²K` | sourced | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| fan oven, forced air (10–100) | `40 W/m²K` | sourced | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| hot still water around food (water forced convection 300–6000) | `400 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| food in rolling-boiling water: agitated forced convection (300–6000) | `1500 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| pan contact through oil/juice: patty contact 250–650 W/m²K | `550 W/m²K` | sourced | [Wichchukit, Zorrilla & Singh (2001) contact heat transfer in double-sided patty cooking: 250–650 W/m²K](https://ri.conicet.gov.ar/handle/11336/30061?show=full) |
| dry pan contact (low end of 250–650) | `300 W/m²K` | sourced | [Wichchukit, Zorrilla & Singh (2001) contact heat transfer in double-sided patty cooking: 250–650 W/m²K](https://ri.conicet.gov.ar/handle/11336/30061?show=full) |
| food on a wooden board: wood effusivity √(kρc) gives ~15–35 W/m²K over the first minutes | `20 W/m²K` | calibrated | — |
| emissivity of moist food surfaces | `0.9 ` | calibrated | — |
| all-purpose burner 12,000 BTU/h ≈ 3.5 kW | `3500 W` | sourced | [Maytag — Gas range BTU ratings (simmer 500–2,000; standard 8,000–12,000; high 12,000–18,000 BTU/h)](https://www.maytag.com/blog/kitchen/gas-range-btu.html) |
| simmer ≈ 500 BTU/h ≈ 0.15 kW | `150 W` | sourced | [Maytag — Gas range BTU ratings (simmer 500–2,000; standard 8,000–12,000; high 12,000–18,000 BTU/h)](https://www.maytag.com/blog/kitchen/gas-range-btu.html) |
| fraction of gas heat reaching the pan (≈40 %) | `0.4 ` | sourced | [BuildingGreen (LBNL/EPRI) — cooktop efficiency: gas ≈40 %, electric ≈74 %, induction ≈84 %](https://www.buildinggreen.com/node/7193) |
| Lodge 10.25 in skillet, 5 lb 5 oz | `2.4 kg` | sourced | [REI — Lodge 10.25 in cast iron skillet (5 lb 5 oz)](https://www.rei.com/product/714234/lodge-cast-iron-skillet-1025-in) |
| cast iron specific heat (handbook 450–500) | `460 J/kg·K` | calibrated | [Engineering ToolBox — metals: thermal conductivity, specific heat, emissivity](https://www.engineeringtoolbox.com/emissivity-coefficients-d_447.html) |
| seasoned/oxidised cast iron emissivity (0.6–0.95) | `0.75 ` | calibrated | [Engineering ToolBox — metals: thermal conductivity, specific heat, emissivity](https://www.engineeringtoolbox.com/emissivity-coefficients-d_447.html) |
| open water surface to room air (natural convection, low end of 5–25) | `5 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| pan surfaces to room, natural convection | `12 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| 3 L stainless pot | `1.4 kg` | calibrated | — |
| stainless steel specific heat | `500 J/kg·K` | calibrated | [Engineering ToolBox — metals: thermal conductivity, specific heat, emissivity](https://www.engineeringtoolbox.com/emissivity-coefficients-d_447.html) |
| water in the pot | `2 kg` | calibrated | — |
| Classic Thermapen time constant 0.4 s (full reading = 5τ) | `0.4 s` | sourced | [ThermoWorks — Basic thermometry: speed (time constants)](https://thermoworks.com/thermometry101_basic_concepts_speed) |
| thickness of the surface skin layer that browns | `0.0006 m` | calibrated | — |
| activation energy, inside the 10–160 kJ/mol range reported | `125000 J/mol` | sourced | [Labuza et al. — non-enzymatic browning kinetics & Ea range 10–160 kJ/mol](https://rd.springer.com/chapter/10.1007/978-1-4757-9113-6_25) |
| browning significant from ~140–150 °C | `140 °C` | sourced | [Food Sci. Anim. Resour. — surface ~150 °C for brown crust (PMC6957442)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6957442) |
| browning index rate at 140 °C (dry surface); 1.0 = golden-brown, 2 = deep brown crust | `0.0025 1/s` | calibrated | [Modernist Cuisine — The Maillard reaction](https://modernistcuisine.com/2013/03/the-maillar) |
| charring onset (surface) | `200 °C` | calibrated | — |
| charring temperature sensitivity | `160000 J/mol` | calibrated | — |
| char index rate at 200 °C | `0.002 1/s` | calibrated | — |
| skin water (fraction of initial) below which it is "dry" for browning | `0.35 ` | calibrated | — |
| effective moisture diffusivity in food tissue (~1e-10–1e-9) | `4e-10 m²/s` | calibrated | [NZIFST Unit Operations — Appendix 7: thermal properties of foods](https://nzifst.org.nz/resources/unitoperations/appendix7.htm) |
| surface liquid film that can cling before dripping (~0.08 mm) | `0.08 kg/m²` | calibrated | — |
| myosin denatures from 40–50 °C, striking change at 50 °C | `50 °C` | sourced | [ThermoWorks — How meat cooks: heat’s effects on muscle fibers](https://blog.thermoworks.com/coming-heat-effects-muscle-fibers-meat/) |
| actin denatures ≈ 65.5 °C | `66 °C` | sourced | [ThermoWorks — How meat cooks: heat’s effects on muscle fibers](https://blog.thermoworks.com/coming-heat-effects-muscle-fibers-meat/) |
| collagen shrinks 50–71 °C | `60 °C` | sourced | [Live Science — What happens to meat as it’s cooked](https://www.livescience.com/chemistry/what-happens-to-meat-as-it-s-cooked) |
| pink→brown from ~60 °C, fully brown ~77 °C → midpoint 68 | `68 °C` | sourced | [Live Science — What happens to meat as it’s cooked](https://www.livescience.com/chemistry/what-happens-to-meat-as-it-s-cooked) |
| width so 10–90 % spans ≈ 61–75 °C | `3 °C` | calibrated | [Live Science — What happens to meat as it’s cooked](https://www.livescience.com/chemistry/what-happens-to-meat-as-it-s-cooked) |
| time constant of denaturation once above threshold | `45 s` | calibrated | — |
| water released when myosin sets | `0.05 kg/kg` | calibrated | [Meat cooking-loss studies (USDA ARS 1998: belt grill 20.2 % vs broiler 29.8 %)](https://www.ars.usda.gov/ARSUserFiles/30400510/1998112805.pdf) |
| water released when actin sets | `0.1 kg/kg` | calibrated | [Meat cooking-loss studies (USDA ARS 1998: belt grill 20.2 % vs broiler 29.8 %)](https://www.ars.usda.gov/ARSUserFiles/30400510/1998112805.pdf) |
| water squeezed out by collagen shrinkage | `0.06 kg/kg` | calibrated | [Meat cooking-loss studies (USDA ARS 1998: belt grill 20.2 % vs broiler 29.8 %)](https://www.ars.usda.gov/ARSUserFiles/30400510/1998112805.pdf) |
| time for released juice to reach the surface | `90 s` | calibrated | — |
| ovotransferrin denaturation ≈ 61 °C | `61 °C` | sourced | [Egg-white protein denaturation temperatures (PMC4452139, Table 1)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4452139/table/Tab1) |
| ovalbumin denaturation ≈ 84 °C | `84 °C` | sourced | [Egg-white protein denaturation temperatures (PMC4452139, Table 1)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4452139/table/Tab1) |
| yolk coagulates 62–70 °C | `66 °C` | sourced | [Modern Pastry and Plated Desserts — Coagulation](https://ecampusontario.pressbooks.pub/pastryplateddesserts/?p=22) |
| white coagulates 60–65 °C | `60 °C` | sourced | [Modern Pastry and Plated Desserts — Coagulation](https://ecampusontario.pressbooks.pub/pastryplateddesserts/?p=22) |
| yolk–white boundary target for a soft-boiled egg | `63 °C` | sourced | [C. D. H. Williams (Univ. of Exeter) — Boiling an egg](https://www.exeter.ac.uk/research-centres/theoretical-physics/boiling-an-egg/) |
| potato starch gelatinization midpoint (wheat 65–82 °C; potato starch typically ~60–70) | `66 °C` | calibrated | [American Society of Baking — Baking (starch gelatinization, yeast kill)](https://asbe.org/article/baking/) |
| width of gelatinization transition | `2.5 °C` | calibrated | — |
| activation energy of pectin β-elimination | `143000 J/mol` | sourced | [J. Jpn. Soc. Food Sci. (1994) — softening & pectin β-elimination of Japanese radish](https://www.jstage.jst.go.jp/article/nskkk1962/41/12/41_12_933/_article/-char/en) |
| β-elimination rate constant, top of 0.33–3.73×10⁻⁴ s⁻¹ (taken at 100 °C) | `0.000373 1/s` | sourced | [J. Jpn. Soc. Food Sci. (1994) — softening & pectin β-elimination of Japanese radish](https://www.jstage.jst.go.jp/article/nskkk1962/41/12/41_12_933/_article/-char/en) |
| softening rate ≈ 10× β-elimination rate | `10 ` | sourced | [J. Jpn. Soc. Food Sci. (1994) — softening & pectin β-elimination of Japanese radish](https://www.jstage.jst.go.jp/article/nskkk1962/41/12/41_12_933/_article/-char/en) |
| rare 49–54 | `49 °C` | sourced | [ThermoWorks — Steak temperature guide](https://thermoworks.com/blogs/thermoblog/steak-temperature-guide) |
| medium-rare 54–57 | `54 °C` | sourced | [ThermoWorks — Steak temperature guide](https://thermoworks.com/blogs/thermoblog/steak-temperature-guide) |
| medium 57–63 | `57 °C` | sourced | [ThermoWorks — Steak temperature guide](https://thermoworks.com/blogs/thermoblog/steak-temperature-guide) |
| medium-well ~63–69 | `63 °C` | sourced | [Pryde Butchery — Steak doneness temperature chart](https://prydebutchery.com.au/steak-doneness-temperature-chart/) |
| well done 69+ (74+ in some charts) | `69 °C` | sourced | [Pryde Butchery — Steak doneness temperature chart](https://prydebutchery.com.au/steak-doneness-temperature-chart/) |
| whole cuts of beef 145 °F (62.8 °C) + 3 min rest | `62.8 °C` | sourced | [USDA FSIS — Safe minimum internal temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) |
| 3-minute rest | `180 s` | sourced | [USDA FSIS — Safe minimum internal temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) |
| all poultry 165 °F (73.9 °C) | `73.9 °C` | sourced | [USDA FSIS — Safe minimum internal temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) |
| ground meat 160 °F | `71.1 °C` | sourced | [USDA FSIS — Safe minimum internal temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) |
| egg dishes 160 °F | `71.1 °C` | sourced | [USDA FSIS — Safe minimum internal temperature chart](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart) |
| butter | `150 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| refined canola | `204 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| extra-virgin olive oil 190–210 | `190 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |

## Models

- **Heat**: 3D conduction on a 1–3 mm grid per piece (thin axis solved implicitly), Choi–Okos composition-based thermal properties with a measured override for lean beef, and a thin surface skin with contact, convection, radiation and evaporation (Spalding mass-transfer driving force).
- **Water**: wet surfaces are held below boiling by evaporation; interior cells cannot pass 100 °C while they hold water (the excess heat boils it off); meat proteins hold less water as they set, and the released juice travels to the surface, then evaporates or drips.
- **Chemistry**: protein denaturation and starch gelatinization as equilibrium-limited irreversible transitions; pectin β-elimination and softening as first-order Arrhenius kinetics; Maillard browning and charring accumulate on the dry surface.
- **Cutting**: a cut splits the state grid cell by cell (mass, water and heat are conserved), and each piece's shape is the original shape intersected with its cuts.

## Known deviations

- A steak seared hard and pulled at 54 °C rises about 6 °C while resting. Rules of thumb say 2–4 °C for small steaks ([ThermoWorks](https://blog.thermoworks.com/give-your-meat-a-rest/)); the `steak_carryover` test reports this.
- Williams' boiled-egg formula keeps only the first term of the exact series. The simulator agrees with the exact series to within 6 %, so it is about 15 % slower than the formula for a fridge egg.

