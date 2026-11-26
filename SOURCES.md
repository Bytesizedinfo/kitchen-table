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
| pan contact through oil/juice (≈512 with oil; patties 250–650) | `530 W/m²K` | sourced | [Vine et al. 2019 J. Food Eng. — pan contact h ≈ 512 W/m²K with oil vs 198 dry (potato slices)](https://hal.inrae.fr/hal-02959920) |
| dry pan contact (≈198 W/m²K) | `200 W/m²K` | sourced | [Vine et al. 2019 J. Food Eng. — pan contact h ≈ 512 W/m²K with oil vs 198 dry (potato slices)](https://hal.inrae.fr/hal-02959920) |
| food on a wooden board: wood effusivity √(kρc) gives ~15–35 W/m²K over the first minutes | `20 W/m²K` | calibrated | — |
| emissivity of moist food surfaces | `0.9 ` | calibrated | — |
| latent heat of fusion of ice | `334000 J/kg` | constant | [Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)](https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf) |
| initial freezing point of beef | `-1.7 °C` | sourced | [Engineers Edge — freezing points of foods (beef sirloin −1.7 °C)](https://ns2.engineersedge.com/heat_transfer/freezing_point_and_properties_of_foods_15939.htm) |
| initial freezing point of chicken (ASHRAE) | `-2.78 °C` | sourced | [Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)](https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf) |
| initial freezing point of carrot (ASHRAE) | `-1.39 °C` | sourced | [Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)](https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf) |
| initial freezing point of strawberry (ASHRAE) | `-0.78 °C` | sourced | [Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)](https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf) |
| other foods: most freeze from −0.5 to −2.2 °C | `-1 °C` | calibrated | [Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)](https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf) |
| ice cream mix initial freezing point | `-2.74 °C` | sourced | [Goff (Univ. of Guelph) — ice cream freezing curve calculation](https://www.uoguelph.ca/foodscience/sites/default/files/FreezingCurveCalculation.pdf) |
| ice cream unfreezable water fraction, fitted so the Miles curve gives 50/70/80 % frozen at −5.9/−10.8/−16.6 °C | `0.067 ` | calibrated | [Goff (Univ. of Guelph) — ice cream freezing curve calculation](https://www.uoguelph.ca/foodscience/sites/default/files/FreezingCurveCalculation.pdf) |
| refrigerator ≤ 4 °C (40 °F) | `4 °C` | sourced | [FDA — Refrigerator thermometers: 40 °F fridge, 0 °F freezer](https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety) |
| freezer −18 °C (0 °F) | `-18 °C` | sourced | [FDA — Refrigerator thermometers: 40 °F fridge, 0 °F freezer](https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety) |
| still air inside a fridge (natural convection 5–25) | `6 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| milk fat melting: spreadable 16–24 °C, fully melted ≈37 °C → midpoint | `28 °C` | sourced | [Univ. of Guelph Dairy Science — milk fat melts −30 to 40 °C, fully melted ≈37 °C](https://books.lib.uoguelph.ca/dairyscienceandtechnologyebook/chapter/milk-lipids-chemical-properties-physical-properties-structure-and-fat-globules-functional-properties/) |
| width so it is ≈95 % melted at 37 °C | `2.8 °C` | calibrated | [Univ. of Guelph Dairy Science — milk fat melts −30 to 40 °C, fully melted ≈37 °C](https://books.lib.uoguelph.ca/dairyscienceandtechnologyebook/chapter/milk-lipids-chemical-properties-physical-properties-structure-and-fat-globules-functional-properties/) |
| latent heat of melting milk fat (no source found) | `85000 J/kg` | calibrated | — |
| cocoa butter Form V melts at 33.8 °C (seed at 26–27, work at 30–32) | `32.6 °C` | sourced | [ACS — tempering chocolate (Form V 33.8 °C, Form VI 36.3 °C; melt ~50, seed 26–27, work 30–32 °C)](https://acs.org/content/dam/acsorg/events/culinary-chemistry/Slides/2017-02-09-tempering-chocolate-slides.pdf) |
| sharp melt: solid at 30, melted by ≈34.5 | `0.7 °C` | calibrated | [ACS — tempering chocolate (Form V 33.8 °C, Form VI 36.3 °C; melt ~50, seed 26–27, work 30–32 °C)](https://acs.org/content/dam/acsorg/events/culinary-chemistry/Slides/2017-02-09-tempering-chocolate-slides.pdf) |
| latent heat of melting cocoa butter (no source found) | `150000 J/kg` | calibrated | — |
| mozzarella starts to flow (G′ = G″) ≈53 °C | `53 °C` | sourced | [Ma et al. 2014 J. Food Sci. — cheese flow (mozzarella ≈53, cheddar ≈59 °C), blistering](https://onlinelibrary.wiley.com/doi/abs/10.1111/1750-3841.12540) |
| cheddar starts to flow ≈59 °C | `59 °C` | sourced | [Ma et al. 2014 J. Food Sci. — cheese flow (mozzarella ≈53, cheddar ≈59 °C), blistering](https://onlinelibrary.wiley.com/doi/abs/10.1111/1750-3841.12540) |
| width of the softening transition | `2.5 °C` | calibrated | [Ma et al. 2014 J. Food Sci. — cheese flow (mozzarella ≈53, cheddar ≈59 °C), blistering](https://onlinelibrary.wiley.com/doi/abs/10.1111/1750-3841.12540) |
| gelatin gel Young modulus per % gelatin (6.5/10.7/17 kPa at 4/6/8 %) | `1625 Pa` | sourced | [arXiv 2308.10662 — Young modulus of 250-Bloom gelatin gels 4–8 %](https://arxiv.org/abs/2308.10662) |
| time constant of a gel melting once above its melting point | `60 s` | calibrated | [TA Instruments — gelatin gel: melts ≈28–30 °C (3 % DSC), gels ≈22–24 °C (G′/G″ crossover)](https://www.tainstruments.com/pdf/literature/TA410.pdf) |
| jelly dessert gelatin (1 envelope per 500 mL ≈1.4 %, firm ≈1.9 %) | `1.6 %` | sourced | [Knox — 1 envelope (7 g) sets 2 cups (500 mL)](https://knoxgelatine.com/basics_Bot.htm) |
| gelatin gel melts ≈28–30 °C (3 % gel); dessert strength at the low end | `28 °C` | sourced | [TA Instruments — gelatin gel: melts ≈28–30 °C (3 % DSC), gels ≈22–24 °C (G′/G″ crossover)](https://www.tainstruments.com/pdf/literature/TA410.pdf) |
| gelatin gels on cooling ≈22–24 °C; melting ≈5 °C above setting | `22 °C` | sourced | [TA Instruments — gelatin gel: melts ≈28–30 °C (3 % DSC), gels ≈22–24 °C (G′/G″ crossover)](https://www.tainstruments.com/pdf/literature/TA410.pdf) |
| gel-network build-up time constant (sets in a fridge in 2–4 h) | `2400 s` | calibrated | [Jell-O — refrigerate 4 h until firm (2 h for small cups)](https://www.kraftheinz.com/jell-o/products/00043000200100-grape-gelatin-dessert-mix) |
| gummy candy gelatin 7–9 % | `8 %` | sourced | [US patent 11490634 — gummy candy gelatin 7–9 % (225–250 Bloom)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11490634) |
| gummy softens / melts (melting point rises with gelatin concentration) | `36 °C` | calibrated | [Int. J. Food Properties — gelling/melting temperature rise with gelatin concentration](https://informahealthcare.com/doi/abs/10.1080/10942910601128895) |
| gummy sets again ≈5 °C below where it melts | `30 °C` | calibrated | [Gelita — gelatin melting point ≈5 °C above setting point](https://gelita.com/en/node/75) |
| gummy re-setting time constant | `1800 s` | calibrated | — |
| how far a resting sticky gummy node can be pulled per 1/600 s before it slides | `0.0004 m` | calibrated | — |
| gummy chain stretch compliance (XPBD, per unit node mass) | `0.00005 ` | calibrated | — |
| gummy chain bending compliance | `0.00002 ` | calibrated | — |
| gummy tears when a segment is stretched 2.4× (no source found) | `2.4 ` | calibrated | — |
| damping ratio of a gelatin jelly wobble | `0.07 ` | calibrated | — |
| marshmallow air fraction (density 0.5–0.7 g/mL vs ≈1.45 solid) | `0.58 ` | sourced | [Ergun, Lietha & Hartel 2010 — moisture and sugar in candy (gummies, marshmallow, hard candy Tg)](https://talcottlab.tamu.edu/wp-content/uploads/sites/108/2019/01/Moistuer-and-Sugar-in-Shelf-Life.pdf) |
| marshmallow gelatin foam goes soft and gooey | `45 °C` | calibrated | — |
| marshmallow firms again on cooling | `35 °C` | calibrated | [Gelita — gelatin melting point ≈5 °C above setting point](https://gelita.com/en/node/75) |
| hard candy glass transition 26–41 °C (1–3 % water): sticky above | `35 °C` | sourced | [Ergun, Lietha & Hartel 2010 — moisture and sugar in candy (gummies, marshmallow, hard candy Tg)](https://talcottlab.tamu.edu/wp-content/uploads/sites/108/2019/01/Moistuer-and-Sugar-in-Shelf-Life.pdf) |
| sugar glass flows like a syrup well above its glass transition | `95 °C` | calibrated | [Exploratorium — sugar syrup stages (thread 110 °C … hard crack 149–154 °C, caramel 160–177 °C)](https://annex.exploratorium.edu/cooking/candy/sugar-stages.html) |
| chicken breast DSC peak 1 (myosin); peaks at 54.9, 61.7, 65.4, 70.6, 76.1 °C | `54.9 °C` | sourced | [Wattanachant et al. 2005 — heat-induced changes in chicken breast muscle (DSC peaks)](https://pesquisa.bvsalud.org/portal/resource/es/mdl-15742971) |
| DSC peak 2 (sarcoplasmic proteins) | `61.7 °C` | sourced | [Wattanachant et al. 2005 — heat-induced changes in chicken breast muscle (DSC peaks)](https://pesquisa.bvsalud.org/portal/resource/es/mdl-15742971) |
| DSC peak 3 (collagen and sarcoplasmic; the 70.6 °C peak merged in) | `65.4 °C` | sourced | [Wattanachant et al. 2005 — heat-induced changes in chicken breast muscle (DSC peaks)](https://pesquisa.bvsalud.org/portal/resource/es/mdl-15742971) |
| DSC peak 5 (actin) | `76.1 °C` | sourced | [Wattanachant et al. 2005 — heat-induced changes in chicken breast muscle (DSC peaks)](https://pesquisa.bvsalud.org/portal/resource/es/mdl-15742971) |
| water released when myosin sets (60 °C sous-vide loses 6.6 %) | `0.06 kg/kg` | calibrated | [Chicken breast sous-vide 60 °C vs oven: cooking loss (PMC8870995)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8870995/) |
| water released when sarcoplasmic proteins set | `0.035 kg/kg` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| water released when actin sets (poached breast yields 77 %, 70–88) | `0.19 kg/kg` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| chicken breast simmered/poached: yield 77 % (70–88) | `0.77 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| chicken breast roasted: yield 72 % (61–82) | `0.72 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| chicken breast 60 °C for 1 h: cooking loss 6.6 % | `0.066 ` | sourced | [Chicken breast sous-vide 60 °C vs oven: cooking loss (PMC8870995)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8870995/) |
| salmon turns from translucent to opaque (culinary convention: medium at 50–52 °C; no DSC source) | `48 °C` | calibrated | [Salmon: traditional core temperature 55–65 °C (PMC6723074)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6723074) |
| salmon actin and sarcoplasmic proteins set 60–80 °C; flakes; traditional core 55–65 °C | `62 °C` | sourced | [Kong, Tang, Rasco & Crapo 2007 — kinetics of salmon quality changes during thermal processing](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang134.pdf) |
| water released as salmon goes opaque | `0.07 kg/kg` | calibrated | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| water released as actin sets (plateau loss salmon 23.4 % vs chicken 30.6 % at 121 °C) | `0.16 kg/kg` | calibrated | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| chicken breast plateau cook loss at 121 °C | `0.306 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| salmon plateau cook loss at 121 °C | `0.234 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| fish 145 °F (62.8 °C) | `62.8 °C` | sourced | [USDA FSIS — Safe minimum internal temperature chart (2012, archived): fish 145 °F](https://webarchive.library.unt.edu/web/20120915114427/http:/www.fsis.usda.gov/PDF/Safe_Miminum_Internal_Temperature_Chart.pdf) |
| lard melts 39–48 °C depending on how it cooled | `43.5 °C` | sourced | [Svenstrup et al. — melting of lard depends on cooling history (39–48 °C)](https://agris.fao.org/search/en/records/65df82d60f3e94b9e5d951a1) |
| fat tissue releases its melted fat as the cell walls give way (tuned to bacon pan yield 31 %) | `85 °C` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| time constant of fat rendering once hot | `90 s` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| pan-fried bacon loses fat equal to 33.8 % of raw weight: 91 % of its 37.1 % fat | `0.91 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| water cured lean still holds when crisp, per kg of solids left (yields: moisture −35.9 of 46.7 % of raw weight) | `0.7 kg/kg` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| bacon pan-fried yield 31 % (30–31) | `0.31 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| pork sausage loses fat equal to 3.9 % of raw weight: 16 % of its 24.8 % fat | `0.16 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| sausage water released as the meat sets (moisture −16.2 % at 71 °C) | `0.06 kg/kg` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| sausage water released at higher temperatures | `0.05 kg/kg` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| pork sausage pan-fried to 71 °C: yield 80 % (77–86); griddle 149–163 °C | `0.8 ` | sourced | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| share of free evaporation that gets through a fat-coated sausage casing (tuned to yield 80 % at 71 °C within 10–25 min) | `0.08 ` | calibrated | [USDA ARS — Cooking yields for meat and poultry (2012)](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf) |
| casing splits once water under it boils (steam pressure; no measured burst pressure) | `99 °C` | calibrated | [Gizmodo — the physics behind why sausages split lengthwise (weak source)](https://gizmodo.com/the-physics-behind-why-sausages-split-lengthwise-1497820035) |
| chicken breast shrinks 27 % along the fibres (121 °C, upper bound) | `0.27 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| chicken breast shrinks 17 % across the fibres | `0.17 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| salmon shrinks 20 % along the fibres | `0.2 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| salmon shrinks 2 % across the fibres | `0.02 ` | sourced | [Kong et al. 2008 — shrinkage and cook loss of chicken and salmon](https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/1254/2016/04/tang149.pdf) |
| bacon rasher shortens as it renders (no source found) | `0.3 ` | calibrated | — |
| air in white sandwich-bread crumb (slice ≈28 g; no source for the density) | `0.85 ` | calibrated | — |
| air in a croissant (≈55 g; no source for the density) | `0.55 ` | calibrated | — |
| air in a cake donut (≈45 g; no source for the density) | `0.65 ` | calibrated | — |
| air in a baked cookie (no source for the density) | `0.3 ` | calibrated | — |
| air in sponge cake layers (no source for the density) | `0.68 ` | calibrated | — |
| sugar glaze goes soft and tacky when warm (no source found) | `45 °C` | calibrated | — |
| nichrome element ≈900 °C when on (weak source) | `900 °C` | sourced | [US patent 4913046 — toaster element ≈900 °C, toast surface 100–200 °C (weak source)](https://patents.google.com/patent/US4913046) |
| element warm-up / cool-down time constant | `20 s` | calibrated | — |
| share of the bread’s view filled by the glowing element (the rest is reflector wall); tuned so medium toast is golden in ≈2 min | `0.036 ` | calibrated | [US patent 4913046 — toaster element ≈900 °C, toast surface 100–200 °C (weak source)](https://patents.google.com/patent/US4913046) |
| slot walls and air warm to this share of the element temperature | `0.15 ` | calibrated | — |
| still hot air inside the toaster slot | `8 W/m²K` | calibrated | [Wikipedia — Heat transfer coefficient (typical ranges)](https://en.wikipedia.org/wiki/Heat_transfer_coefficient) |
| toasting time at the lightest setting (toasting takes 1–3 min; no source) | `80 s` | calibrated | — |
| extra toasting time per shade step (shade 1–7) | `11 s` | calibrated | — |
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
| fructose caramelisation onset (105–110 °C) | `110 °C` | sourced | [Wikipedia — Caramelization (onset temperatures by sugar)](https://en.wikipedia.org/wiki/Caramelization) |
| glucose caramelisation onset (150–160 °C) | `155 °C` | sourced | [Wikipedia — Caramelization (onset temperatures by sugar)](https://en.wikipedia.org/wiki/Caramelization) |
| sucrose caramelisation onset (160–170 °C) | `165 °C` | sourced | [Wikipedia — Caramelization (onset temperatures by sugar)](https://en.wikipedia.org/wiki/Caramelization) |
| caramelisation browning rate per 5 % sugar per 10 °C above onset | `0.002 1/s` | calibrated | — |
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
| carrot softening activation energy (73.5–110 kJ/mol) | `92000 J/mol` | sourced | [Cogent Food & Agriculture (2022) — carrot texture kinetics, Ea 73.5–110 kJ/mol](https://doi.org/10.1080/23311932.2022.2114641) |
| carrot softening rate at 100 °C (sticks tender in ~10 min) | `0.0016 1/s` | calibrated | [Cogent Food & Agriculture (2022) — carrot texture kinetics, Ea 73.5–110 kJ/mol](https://doi.org/10.1080/23311932.2022.2114641) |
| apple softening activation energy (65–111 kJ/mol) | `88000 J/mol` | sourced | [Penn State — thermal degradation of texture in apples (Ea 65–111 kJ/mol)](https://pure.psu.edu/en/publications/thermal-degradation-of-texture-in-apples/) |
| apple goes from fresh to cooked texture above 53 °C | `55 °C` | sourced | [INRAE — apple texture changes from fresh to cooked at 53 °C](https://hal.inrae.fr/hal-03341493) |
| water released from softened onion cells (tuned to 37–43 % loss in 8 min at 140 °C) | `0.0042 1/s` | calibrated | [PMC8151956 — onion pan-fried 8 min at 140 °C loses 37–43 % weight](https://pmc.ncbi.nlm.nih.gov/articles/PMC8151956) |
| fraction of a curved onion scale touching a flat pan | `0.5 ` | calibrated | — |
| onion turns translucent as cell membranes fail (tuned to 5–10 min sweating) | `68 °C` | calibrated | [PMC8151956 — onion pan-fried 8 min at 140 °C loses 37–43 % weight](https://pmc.ncbi.nlm.nih.gov/articles/PMC8151956) |
| onion softening rate at 100 °C (no kinetics source; tuned to sauté stages) | `0.008 1/s` | calibrated | — |
| PPO (browning enzyme) inactivation rate at 78 °C (apple 0.16–0.28 per min) | `0.0036666666666666666 1/s` | sourced | [Apple PPO thermal inactivation 68–78 °C: z 7.1–10 °C, k(78 °C) 0.16–0.28 per min (Ankara Univ.)](https://avesis.ankara.edu.tr/yayin/22477a7e-7045-4897-a356-47e75d8faea3) |
| PPO z-value (apple 7.1–10 °C) | `8.5 °C` | sourced | [Apple PPO thermal inactivation 68–78 °C: z 7.1–10 °C, k(78 °C) 0.16–0.28 per min (Ankara Univ.)](https://avesis.ankara.edu.tr/yayin/22477a7e-7045-4897-a356-47e75d8faea3) |
| PPO inactivation Ea from z = 8.5 °C at 78 °C (Ea = ln10·R·T²/z) | `277710 J/mol` | sourced | [Apple PPO thermal inactivation 68–78 °C: z 7.1–10 °C, k(78 °C) 0.16–0.28 per min (Ankara Univ.)](https://avesis.ankara.edu.tr/yayin/22477a7e-7045-4897-a356-47e75d8faea3) |
| potato softening activation energy (145–160 kJ/mol) | `152000 J/mol` | sourced | [J. Jpn. Soc. Food Sci. (1985, 1992) — potato softening first-order, Ea 145–160 kJ/mol](https://www.jstage.jst.go.jp/article/nskkk1962/39/4/39_4_295/_article/-char/en) |
| enzymatic browning index rate on a fresh cut at 22 °C (visible in ~10 min) | `0.0016666666666666668 1/s` | calibrated | [Food Sci. Technol. Res. review — cut apple browns within ~10 min](https://www.jstage.jst.go.jp/article/fstr/28/1/28_FSTR-D-21-00130/_html/-char/en) |
| lemon juice multiplies the browning rate (acid; less effective than ascorbic) | `0.45 ` | calibrated | [Penn State Extension — preventing browning: ascorbic acid more effective than lemon/citric](https://extension.psu.edu/preserving-color-and-preventing-browning-of-foods) |
| ascorbic acid dip multiplies the browning rate | `0.12 ` | calibrated | [Penn State Extension — preventing browning: ascorbic acid more effective than lemon/citric](https://extension.psu.edu/preserving-color-and-preventing-browning-of-foods) |
| under water (no oxygen) multiplies the browning rate | `0.1 ` | calibrated | [Penn State Extension — preventing browning: ascorbic acid more effective than lemon/citric](https://extension.psu.edu/preserving-color-and-preventing-browning-of-foods) |
| banana chilling injury below 13 °C | `13 °C` | sourced | [Frontiers Plant Sci. 2022 — banana underpeel browning from day 4 at 5 °C (chilling below 13 °C)](https://www.frontiersin.org/articles/10.3389/fpls.2022.966789/full) |
| underpeel browning visible from ~day 4 at 5 °C | `4 days` | sourced | [Frontiers Plant Sci. 2022 — banana underpeel browning from day 4 at 5 °C (chilling below 13 °C)](https://www.frontiersin.org/articles/10.3389/fpls.2022.966789/full) |
| tomato skin splits after 30–60 s in boiling water | `45 s` | sourced | [UNL Extension — tomato skins split after 30–60 s in boiling water](https://food.unl.edu/) |
| brunoise 1/8 in cube | `0.003 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| julienne 1/8 × 1/8 × 2 in | `0.003 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| batonnet 1/4 × 1/4 × 2 in | `0.006 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| julienne / batonnet length 2 in | `0.05 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| small dice 1/4 in | `0.006 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| medium dice 1/2 in | `0.012 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| large dice 3/4 in | `0.019 m` | sourced | [Rouxbe (after CIA Professional Chef) — knife cut dimensions](https://rouxbe.com/tips-techniques/495-types-of-knife-cuts) |
| default slice thickness | `0.005 m` | calibrated | — |
| fully cooked spaghetti weight / dry weight (62 % water vs ~10 % dry) | `2.4 ` | sourced | [USDA FDC 169737 — cooked spaghetti 62 % water](https://fdc.nal.usda.gov/food-details/169737/nutrients) |
| spaghetti al dente at 9 min | `540 s` | sourced | [Barilla Spaghetti n.5 — 9 min al dente](https://www.barilla.com/en-gb/products/pasta/classic-blue-box/spaghetti) |
| butter smoke point 150–177 °C (Wikipedia 150, CSU 177) | `163 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| ghee / clarified butter ≈250 °C (CSU 191–252) | `250 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| extra-virgin olive oil 177–210 °C | `193 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| refined olive oil 199–243 °C | `220 °C` | sourced | [Colorado State Univ. — cooking with fats and oils (smoke points)](https://www.chhs.colostate.edu/krnc/monthly-blog/cooking-with-fats-and-oils/) |
| refined canola 204 °C | `204 °C` | sourced | [Wikipedia — Smoke point](https://en.wikipedia.org/wiki/Smoke_point) |
| sunflower 232 °C | `232 °C` | sourced | [Colorado State Univ. — cooking with fats and oils (smoke points)](https://www.chhs.colostate.edu/krnc/monthly-blog/cooking-with-fats-and-oils/) |
| peanut 232 °C | `232 °C` | sourced | [Colorado State Univ. — cooking with fats and oils (smoke points)](https://www.chhs.colostate.edu/krnc/monthly-blog/cooking-with-fats-and-oils/) |

## Models

- **Heat**: 3D conduction on a 1–3 mm grid per piece (thin axis solved implicitly), Choi–Okos composition-based thermal properties with a measured override for lean beef, and a thin surface skin with contact, convection, radiation and evaporation (Spalding mass-transfer driving force).
- **Water**: wet surfaces are held below boiling by evaporation; interior cells cannot pass 100 °C while they hold water (the excess heat boils it off); meat proteins hold less water as they set, and the released juice travels to the surface, then evaporates or drips.
- **Chemistry**: protein denaturation and starch gelatinization as equilibrium-limited irreversible transitions; pectin β-elimination and softening as first-order Arrhenius kinetics; Maillard browning and charring accumulate on the dry surface.
- **Cutting**: a cut splits the state grid cell by cell (mass, water and heat are conserved), and each piece's shape is the original shape intersected with its cuts.

## Known deviations

- A steak seared hard and pulled at 54 °C rises about 6 °C while resting. Rules of thumb say 2–4 °C for small steaks ([ThermoWorks](https://blog.thermoworks.com/give-your-meat-a-rest/)); the `steak_carryover` test reports this.
- Williams' boiled-egg formula keeps only the first term of the exact series. The simulator agrees with the exact series to within 6 %, so it is about 15 % slower than the formula for a fridge egg.

