// Every number the simulation uses, with where it came from.
// kind: 'sourced'    – taken from (or computed directly from) the cited source
//       'calibrated' – chosen by us inside a sourced range, or tuned so a sourced behaviour comes out
//       'constant'   – physical constant / standard property
// Pure module: no DOM, no three.js (runs under Node for tests).

export const SRC = {
  thermoworks_muscle: { t: 'ThermoWorks — How meat cooks: heat’s effects on muscle fibers', u: 'https://blog.thermoworks.com/coming-heat-effects-muscle-fibers-meat/' },
  livescience_meat: { t: 'Live Science — What happens to meat as it’s cooked', u: 'https://www.livescience.com/chemistry/what-happens-to-meat-as-it-s-cooked' },
  thermoworks_steak: { t: 'ThermoWorks — Steak temperature guide', u: 'https://thermoworks.com/blogs/thermoblog/steak-temperature-guide' },
  pryde_steak: { t: 'Pryde Butchery — Steak doneness temperature chart', u: 'https://prydebutchery.com.au/steak-doneness-temperature-chart/' },
  usda_fsis: { t: 'USDA FSIS — Safe minimum internal temperature chart', u: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart' },
  egg_dsc: { t: 'Egg-white protein denaturation temperatures (PMC4452139, Table 1)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4452139/table/Tab1' },
  pastry_coag: { t: 'Modern Pastry and Plated Desserts — Coagulation', u: 'https://ecampusontario.pressbooks.pub/pastryplateddesserts/?p=22' },
  williams_egg: { t: 'C. D. H. Williams (Univ. of Exeter) — Boiling an egg', u: 'https://www.exeter.ac.uk/research-centres/theoretical-physics/boiling-an-egg/' },
  khymos_egg: { t: 'Khymos — Towards the perfect soft boiled egg (Williams vs Barham)', u: 'https://khymos.org/2009/04/09/towards-the-perfect-soft-boiled-egg/' },
  ncsu_sear: { t: 'NC State News — the science of searing (surface water must evaporate first)', u: 'https://news.ncsu.edu/?p=926890' },
  pmc_sear: { t: 'Food Sci. Anim. Resour. — surface ~150 °C for brown crust (PMC6957442)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6957442' },
  mc_maillard: { t: 'Modernist Cuisine — The Maillard reaction', u: 'https://modernistcuisine.com/2013/03/the-maillar' },
  labuza_browning: { t: 'Labuza et al. — non-enzymatic browning kinetics & Ea range 10–160 kJ/mol', u: 'https://rd.springer.com/chapter/10.1007/978-1-4757-9113-6_25' },
  wiki_caramel: { t: 'Wikipedia — Caramelization (onset temperatures by sugar)', u: 'https://en.wikipedia.org/wiki/Caramelization' },
  choi_okos: { t: 'Choi & Okos (1986) composition model for food thermal properties', u: 'https://docs.lib.purdue.edu/dissertations/AAI8900613' },
  etb_food_k: { t: 'Engineering ToolBox — Thermal conductivity of foods (beef, potato)', u: 'https://engineeringtoolbox.com/food-thermal-conductivity-d_2177.html' },
  nzifst_props: { t: 'NZIFST Unit Operations — Appendix 7: thermal properties of foods', u: 'https://nzifst.org.nz/resources/unitoperations/appendix7.htm' },
  wiki_htc: { t: 'Wikipedia — Heat transfer coefficient (typical ranges)', u: 'https://en.wikipedia.org/wiki/Heat_transfer_coefficient' },
  zorrilla_contact: { t: 'Wichchukit, Zorrilla & Singh (2001) contact heat transfer in double-sided patty cooking: 250–650 W/m²K', u: 'https://ri.conicet.gov.ar/handle/11336/30061?show=full' },
  pectin_radish: { t: 'J. Jpn. Soc. Food Sci. (1994) — softening & pectin β-elimination of Japanese radish', u: 'https://www.jstage.jst.go.jp/article/nskkk1962/41/12/41_12_933/_article/-char/en' },
  carrot_wsu: { t: 'WSU — Kinetics of carrot texture (two first-order reactions)', u: 'https://microwavepasteurization.wsu.edu/mwp-main/documents/Kinetics%20of%20Carrot%20Texture%20-%20Jing.pdf' },
  asbe_baking: { t: 'American Society of Baking — Baking (starch gelatinization, yeast kill)', u: 'https://asbe.org/article/baking/' },
  asbe_thermal: { t: 'American Society of Baking — Thermal profiling for baking', u: 'https://asbe.org/?p=12397' },
  freshloaf_temps: { t: 'The Fresh Loaf — Temperature influences on bread as it bakes', u: 'https://www.thefreshloaf.com/node/13315/temperature-influences-bread-it-bakes' },
  lbnl_cooktop: { t: 'BuildingGreen (LBNL/EPRI) — cooktop efficiency: gas ≈40 %, electric ≈74 %, induction ≈84 %', u: 'https://www.buildinggreen.com/node/7193' },
  maytag_btu: { t: 'Maytag — Gas range BTU ratings (simmer 500–2,000; standard 8,000–12,000; high 12,000–18,000 BTU/h)', u: 'https://www.maytag.com/blog/kitchen/gas-range-btu.html' },
  lodge_weight: { t: 'REI — Lodge 10.25 in cast iron skillet (5 lb 5 oz)', u: 'https://www.rei.com/product/714234/lodge-cast-iron-skillet-1025-in' },
  thermoworks_speed: { t: 'ThermoWorks — Basic thermometry: speed (time constants)', u: 'https://thermoworks.com/thermometry101_basic_concepts_speed' },
  wiki_smoke: { t: 'Wikipedia — Smoke point', u: 'https://en.wikipedia.org/wiki/Smoke_point' },
  usda_fdc: { t: 'USDA FoodData Central — composition (water/protein/fat/carb/ash)', u: 'https://fdc.nal.usda.gov/' },
  meat_loss: { t: 'Meat cooking-loss studies (USDA ARS 1998: belt grill 20.2 % vs broiler 29.8 %)', u: 'https://www.ars.usda.gov/ARSUserFiles/30400510/1998112805.pdf' },
  carryover: { t: 'ThermoWorks — Carryover cooking (2–4 °C typical)', u: 'https://blog.thermoworks.com/steak-temps-getting-it-right/' },
  knife_cuts: { t: 'Wikipedia — List of culinary knife cuts', u: 'https://en.wikipedia.org/wiki/List_of_culinary_knife_cuts' },
  steam_tables: { t: 'Standard steam tables / Tetens equation (latent heat, vapour pressure)', u: 'https://en.wikipedia.org/wiki/Tetens_equation' },
  usda_fdc_produce: { t: 'USDA FoodData Central SR Legacy — produce composition incl. sugar split (FDC 170000 onion, 170393 carrot, 170457 tomato, 171688 apple, 167746 lemon, 173944 banana, 167762 strawberry, 171705 avocado, 169230 garlic, 170108 red pepper)', u: 'https://fdc.nal.usda.gov/food-details/170000/nutrients' },
  potato_soften: { t: 'J. Jpn. Soc. Food Sci. (1985, 1992) — potato softening first-order, Ea 145–160 kJ/mol', u: 'https://www.jstage.jst.go.jp/article/nskkk1962/39/4/39_4_295/_article/-char/en' },
  carrot_soften: { t: 'Cogent Food & Agriculture (2022) — carrot texture kinetics, Ea 73.5–110 kJ/mol', u: 'https://doi.org/10.1080/23311932.2022.2114641' },
  apple_soften: { t: 'Penn State — thermal degradation of texture in apples (Ea 65–111 kJ/mol)', u: 'https://pure.psu.edu/en/publications/thermal-degradation-of-texture-in-apples/' },
  apple_53: { t: 'INRAE — apple texture changes from fresh to cooked at 53 °C', u: 'https://hal.inrae.fr/hal-03341493' },
  apple_ppo: { t: 'Apple PPO thermal inactivation 68–78 °C: z 7.1–10 °C, k(78 °C) 0.16–0.28 per min (Ankara Univ.)', u: 'https://avesis.ankara.edu.tr/yayin/22477a7e-7045-4897-a356-47e75d8faea3' },
  avocado_ppo: { t: 'Weemaes et al. 1998 — avocado PPO first-order inactivation (onset ≈65 °C at pH 6)', u: 'https://doi.org/10.1021/jf970902s' },
  ppo_ph: { t: 'Molecules 2020 — PPO optimum pH 5–7, inhibited below pH 3', u: 'https://doi.org/10.3390/molecules25122754' },
  psu_browning: { t: 'Penn State Extension — preventing browning: ascorbic acid more effective than lemon/citric', u: 'https://extension.psu.edu/preserving-color-and-preventing-browning-of-foods' },
  fstr_browning: { t: 'Food Sci. Technol. Res. review — cut apple browns within ~10 min', u: 'https://www.jstage.jst.go.jp/article/fstr/28/1/28_FSTR-D-21-00130/_html/-char/en' },
  onion_fry: { t: 'PMC8151956 — onion pan-fried 8 min at 140 °C loses 37–43 % weight', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8151956' },
  tomato_peel: { t: 'UNL Extension — tomato skins split after 30–60 s in boiling water', u: 'https://food.unl.edu/' },
  banana_chill: { t: 'Frontiers Plant Sci. 2022 — banana underpeel browning from day 4 at 5 °C (chilling below 13 °C)', u: 'https://www.frontiersin.org/articles/10.3389/fpls.2022.966789/full' },
  rouxbe_cuts: { t: 'Rouxbe (after CIA Professional Chef) — knife cut dimensions', u: 'https://rouxbe.com/tips-techniques/495-types-of-knife-cuts' },
  csu_smoke: { t: 'Colorado State Univ. — cooking with fats and oils (smoke points)', u: 'https://www.chhs.colostate.edu/krnc/monthly-blog/cooking-with-fats-and-oils/' },
  vine_contact: { t: 'Vine et al. 2019 J. Food Eng. — pan contact h ≈ 512 W/m²K with oil vs 198 dry (potato slices)', u: 'https://hal.inrae.fr/hal-02959920' },
  usda_pasta: { t: 'USDA FDC 169737 — cooked spaghetti 62 % water', u: 'https://fdc.nal.usda.gov/food-details/169737/nutrients' },
  barilla: { t: 'Barilla Spaghetti n.5 — 9 min al dente', u: 'https://www.barilla.com/en-gb/products/pasta/classic-blue-box/spaghetti' },
  vt_freezing: { t: 'Virginia Tech — Freezing food (ASHRAE initial freezing points; Miles ice-fraction model; bound water 0.4·protein)', u: 'https://vtechworks.lib.vt.edu/bitstream/handle/10919/93254/Freezing_Food.pdf' },
  ee_freezing: { t: 'Engineers Edge — freezing points of foods (beef sirloin −1.7 °C)', u: 'https://ns2.engineersedge.com/heat_transfer/freezing_point_and_properties_of_foods_15939.htm' },
  goff_freeze: { t: 'Goff (Univ. of Guelph) — ice cream freezing curve calculation', u: 'https://www.uoguelph.ca/foodscience/sites/default/files/FreezingCurveCalculation.pdf' },
  fda_fridge: { t: 'FDA — Refrigerator thermometers: 40 °F fridge, 0 °F freezer', u: 'https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety' },
  fsis_thaw: { t: 'USDA FSIS — The Big Thaw (fridge thawing ≈1 day per small package; 24 h per 4–5 lb)', u: 'https://webarchive.library.unt.edu/web/20130216165457/http:/www.fsis.usda.gov/PDF/Big_Thaw.pdf' },
  guelph_milkfat: { t: 'Univ. of Guelph Dairy Science — milk fat melts −30 to 40 °C, fully melted ≈37 °C', u: 'https://books.lib.uoguelph.ca/dairyscienceandtechnologyebook/chapter/milk-lipids-chemical-properties-physical-properties-structure-and-fat-globules-functional-properties/' },
  codex_butter: { t: 'Codex standard for butter: ≥80 % fat, ≤16 % water, ≤2 % non-fat milk solids', u: 'https://alimentosargentinos.magyp.gob.ar/contenido/marco/Codex_Alimentarius/normativa/codex/stan/CODEX_STAN%20_A_1.htm' },
  acs_temper: { t: 'ACS — tempering chocolate (Form V 33.8 °C, Form VI 36.3 °C; melt ~50, seed 26–27, work 30–32 °C)', u: 'https://acs.org/content/dam/acsorg/events/culinary-chemistry/Slides/2017-02-09-tempering-chocolate-slides.pdf' },
  bloom: { t: 'Lonchampt & Hartel 2004 — fat bloom in chocolate', u: 'https://www2.hcmuaf.edu.vn/data/lhquang/file/Cocoa/Fat%20blook%20in%20chocolate.pdf' },
  ma_cheese: { t: 'Ma et al. 2014 J. Food Sci. — cheese flow (mozzarella ≈53, cheddar ≈59 °C), blistering', u: 'https://onlinelibrary.wiley.com/doi/abs/10.1111/1750-3841.12540' },
  usda_dairy: { t: 'USDA FDC — butter 173410, cheddar 173414, mozzarella 170845, vanilla ice cream, chocolate (dark 70–85 %, milk)', u: 'https://fdc.nal.usda.gov/food-details/173410/nutrients' },
  etb_metals: { t: 'Engineering ToolBox — metals: thermal conductivity, specific heat, emissivity', u: 'https://www.engineeringtoolbox.com/emissivity-coefficients-d_447.html' },
};

const S = (v, unit, src, note) => ({ v, unit, src, kind: 'sourced', note });
const C = (v, unit, src, note) => ({ v, unit, src, kind: 'calibrated', note });
const K = (v, unit, src, note) => ({ v, unit, src, kind: 'constant', note });

export const P = {
  // ---- physical constants ----
  sigma: K(5.670374e-8, 'W/m²K⁴', 'steam_tables', 'Stefan–Boltzmann constant'),
  Rgas: K(8.314, 'J/mol·K', 'steam_tables', 'gas constant'),
  Lv: K(2.257e6, 'J/kg', 'steam_tables', 'latent heat of vaporisation of water at 100 °C'),
  Tboil: K(100, '°C', 'steam_tables', 'boiling point at sea level'),
  Tamb: C(22, '°C', null, 'room temperature'),
  Tfridge: C(4, '°C', 'williams_egg', 'fridge temperature (Williams uses 4 °C)'),
  RHamb: C(0.5, '', null, 'room relative humidity'),

  // ---- heat transfer coefficients ----
  h_air_still: S(10, 'W/m²K', 'wiki_htc', 'natural convection in air: 5–25 W/m²K'),
  h_oven_still: S(15, 'W/m²K', 'wiki_htc', 'oven air, natural convection (5–25)'),
  h_oven_fan: S(40, 'W/m²K', 'wiki_htc', 'fan oven, forced air (10–100)'),
  h_water_still: C(400, 'W/m²K', 'wiki_htc', 'hot still water around food (water forced convection 300–6000)'),
  h_water_boil: C(1500, 'W/m²K', 'wiki_htc', 'food in rolling-boiling water: agitated forced convection (300–6000)'),
  h_contact_wet: S(530, 'W/m²K', 'vine_contact', 'pan contact through oil/juice (≈512 with oil; patties 250–650)'),
  h_contact_dry: S(200, 'W/m²K', 'vine_contact', 'dry pan contact (≈198 W/m²K)'),
  h_board: C(20, 'W/m²K', null, 'food on a wooden board: wood effusivity √(kρc) gives ~15–35 W/m²K over the first minutes'),
  eps_food: C(0.9, '', null, 'emissivity of moist food surfaces'),

  // ---- freezing & cold storage ----
  Lf: K(334e3, 'J/kg', 'vt_freezing', 'latent heat of fusion of ice'),
  Tf_beef: S(-1.7, '°C', 'ee_freezing', 'initial freezing point of beef'),
  Tf_chicken: S(-2.78, '°C', 'vt_freezing', 'initial freezing point of chicken (ASHRAE)'),
  Tf_carrot: S(-1.39, '°C', 'vt_freezing', 'initial freezing point of carrot (ASHRAE)'),
  Tf_strawberry: S(-0.78, '°C', 'vt_freezing', 'initial freezing point of strawberry (ASHRAE)'),
  Tf_default: C(-1.0, '°C', 'vt_freezing', 'other foods: most freeze from −0.5 to −2.2 °C'),
  Tf_icecream: S(-2.74, '°C', 'goff_freeze', 'ice cream mix initial freezing point'),
  ic_bound: C(0.067, '', 'goff_freeze', 'ice cream unfreezable water fraction, fitted so the Miles curve gives 50/70/80 % frozen at −5.9/−10.8/−16.6 °C'),
  fridge_T: S(4, '°C', 'fda_fridge', 'refrigerator ≤ 4 °C (40 °F)'),
  freezer_T: S(-18, '°C', 'fda_fridge', 'freezer −18 °C (0 °F)'),
  h_fridge: C(6, 'W/m²K', 'wiki_htc', 'still air inside a fridge (natural convection 5–25)'),
  // ---- fats: butter, chocolate, cheese ----
  milkfat_Tm: S(28, '°C', 'guelph_milkfat', 'milk fat melting: spreadable 16–24 °C, fully melted ≈37 °C → midpoint'),
  milkfat_w: C(2.8, '°C', 'guelph_milkfat', 'width so it is ≈95 % melted at 37 °C'),
  milkfat_L: C(85e3, 'J/kg', null, 'latent heat of melting milk fat (no source found)'),
  cocoa_Tm: S(32.6, '°C', 'acs_temper', 'cocoa butter Form V melts at 33.8 °C (seed at 26–27, work at 30–32)'),
  cocoa_w: C(0.7, '°C', 'acs_temper', 'sharp melt: solid at 30, melted by ≈34.5'),
  cocoa_L: C(150e3, 'J/kg', null, 'latent heat of melting cocoa butter (no source found)'),
  mozz_flow: S(53, '°C', 'ma_cheese', 'mozzarella starts to flow (G′ = G″) ≈53 °C'),
  cheddar_flow: S(59, '°C', 'ma_cheese', 'cheddar starts to flow ≈59 °C'),
  flow_w: C(2.5, '°C', 'ma_cheese', 'width of the softening transition'),
  // ---- appliances ----
  burner_max: S(3500, 'W', 'maytag_btu', 'all-purpose burner 12,000 BTU/h ≈ 3.5 kW'),
  burner_min: S(150, 'W', 'maytag_btu', 'simmer ≈ 500 BTU/h ≈ 0.15 kW'),
  gas_eff: S(0.40, '', 'lbnl_cooktop', 'fraction of gas heat reaching the pan (≈40 %)'),
  castiron_mass: S(2.4, 'kg', 'lodge_weight', 'Lodge 10.25 in skillet, 5 lb 5 oz'),
  castiron_cp: C(460, 'J/kg·K', 'etb_metals', 'cast iron specific heat (handbook 450–500)'),
  castiron_eps: C(0.75, '', 'etb_metals', 'seasoned/oxidised cast iron emissivity (0.6–0.95)'),
  h_pot_surface: C(5, 'W/m²K', 'wiki_htc', 'open water surface to room air (natural convection, low end of 5–25)'),
  pan_h_loss: C(12, 'W/m²K', 'wiki_htc', 'pan surfaces to room, natural convection'),
  pot_mass: C(1.4, 'kg', null, '3 L stainless pot'),
  steel_cp: C(500, 'J/kg·K', 'etb_metals', 'stainless steel specific heat'),
  pot_water: C(2.0, 'kg', null, 'water in the pot'),
  probe_tau: S(0.4, 's', 'thermoworks_speed', 'Classic Thermapen time constant 0.4 s (full reading = 5τ)'),

  // ---- browning & charring (skin layer) ----
  skin_depth: C(0.0006, 'm', null, 'thickness of the surface skin layer that browns'),
  maillard_Ea: S(125e3, 'J/mol', 'labuza_browning', 'activation energy, inside the 10–160 kJ/mol range reported'),
  maillard_T0: S(140, '°C', 'pmc_sear', 'browning significant from ~140–150 °C'),
  maillard_rate140: C(0.0025, '1/s', 'mc_maillard', 'browning index rate at 140 °C (dry surface); 1.0 = golden-brown, 2 = deep brown crust'),
  car_fru: S(110, '°C', 'wiki_caramel', 'fructose caramelisation onset (105–110 °C)'),
  car_glu: S(155, '°C', 'wiki_caramel', 'glucose caramelisation onset (150–160 °C)'),
  car_suc: S(165, '°C', 'wiki_caramel', 'sucrose caramelisation onset (160–170 °C)'),
  car_k: C(0.002, '1/s', null, 'caramelisation browning rate per 5 % sugar per 10 °C above onset'),
  char_T0: C(200, '°C', null, 'charring onset (surface)'),
  char_Ea: C(160e3, 'J/mol', null, 'charring temperature sensitivity'),
  char_rate200: C(0.002, '1/s', null, 'char index rate at 200 °C'),
  dry_crit: C(0.35, '', null, 'skin water (fraction of initial) below which it is "dry" for browning'),
  moist_D: C(4e-10, 'm²/s', 'nzifst_props', 'effective moisture diffusivity in food tissue (~1e-10–1e-9)'),
  film_max: C(0.08, 'kg/m²', null, 'surface liquid film that can cling before dripping (~0.08 mm)'),

  // ---- meat proteins (equilibrium-limited, irreversible) ----
  myosin_Tm: S(50, '°C', 'thermoworks_muscle', 'myosin denatures from 40–50 °C, striking change at 50 °C'),
  actin_Tm: S(66, '°C', 'thermoworks_muscle', 'actin denatures ≈ 65.5 °C'),
  collagen_Tm: S(60, '°C', 'livescience_meat', 'collagen shrinks 50–71 °C'),
  myoglobin_Tm: S(68, '°C', 'livescience_meat', 'pink→brown from ~60 °C, fully brown ~77 °C → midpoint 68'),
  myoglobin_w: C(3.0, '°C', 'livescience_meat', 'width so 10–90 % spans ≈ 61–75 °C'),
  protein_tau: C(45, 's', null, 'time constant of denaturation once above threshold'),
  meat_loss_myosin: C(0.05, 'kg/kg', 'meat_loss', 'water released when myosin sets'),
  meat_loss_actin: C(0.10, 'kg/kg', 'meat_loss', 'water released when actin sets'),
  meat_loss_collagen: C(0.06, 'kg/kg', 'meat_loss', 'water squeezed out by collagen shrinkage'),
  expel_tau: C(90, 's', null, 'time for released juice to reach the surface'),

  // ---- egg ----
  ovotransferrin_Tm: S(61, '°C', 'egg_dsc', 'ovotransferrin denaturation ≈ 61 °C'),
  ovalbumin_Tm: S(84, '°C', 'egg_dsc', 'ovalbumin denaturation ≈ 84 °C'),
  yolk_Tm: S(66, '°C', 'pastry_coag', 'yolk coagulates 62–70 °C'),
  white_set_lo: S(60, '°C', 'pastry_coag', 'white coagulates 60–65 °C'),
  williams_Tyolk: S(63, '°C', 'williams_egg', 'yolk–white boundary target for a soft-boiled egg'),

  // ---- starch & vegetables ----
  pot_starch_Tm: C(66, '°C', 'asbe_baking', 'potato starch gelatinization midpoint (wheat 65–82 °C; potato starch typically ~60–70)'),
  pot_starch_w: C(2.5, '°C', null, 'width of gelatinization transition'),
  pectin_Ea: S(143e3, 'J/mol', 'pectin_radish', 'activation energy of pectin β-elimination'),
  pectin_k100: S(3.73e-4, '1/s', 'pectin_radish', 'β-elimination rate constant, top of 0.33–3.73×10⁻⁴ s⁻¹ (taken at 100 °C)'),
  soften_ratio: S(10, '', 'pectin_radish', 'softening rate ≈ 10× β-elimination rate'),

  // ---- doneness & safety ----
  rare_lo: S(49, '°C', 'thermoworks_steak', 'rare 49–54'), mr_lo: S(54, '°C', 'thermoworks_steak', 'medium-rare 54–57'),
  med_lo: S(57, '°C', 'thermoworks_steak', 'medium 57–63'), mw_lo: S(63, '°C', 'pryde_steak', 'medium-well ~63–69'),
  wd_lo: S(69, '°C', 'pryde_steak', 'well done 69+ (74+ in some charts)'),
  safe_beef: S(62.8, '°C', 'usda_fsis', 'whole cuts of beef 145 °F (62.8 °C) + 3 min rest'),
  safe_beef_rest: S(180, 's', 'usda_fsis', '3-minute rest'),
  safe_poultry: S(73.9, '°C', 'usda_fsis', 'all poultry 165 °F (73.9 °C)'),
  safe_ground: S(71.1, '°C', 'usda_fsis', 'ground meat 160 °F'),
  safe_eggdish: S(71.1, '°C', 'usda_fsis', 'egg dishes 160 °F'),
  // ---- fruit & vegetables ----
  carrot_Ea: S(92e3, 'J/mol', 'carrot_soften', 'carrot softening activation energy (73.5–110 kJ/mol)'),
  carrot_k100: C(1.6e-3, '1/s', 'carrot_soften', 'carrot softening rate at 100 °C (sticks tender in ~10 min)'),
  apple_Ea: S(88e3, 'J/mol', 'apple_soften', 'apple softening activation energy (65–111 kJ/mol)'),
  apple_cook_Tm: S(55, '°C', 'apple_53', 'apple goes from fresh to cooked texture above 53 °C'),
  cell_release: C(0.0042, '1/s', 'onion_fry', 'water released from softened onion cells (tuned to 37–43 % loss in 8 min at 140 °C)'),
  scale_contact: C(0.5, '', null, 'fraction of a curved onion scale touching a flat pan'),
  onion_trans_Tm: C(68, '°C', 'onion_fry', 'onion turns translucent as cell membranes fail (tuned to 5–10 min sweating)'),
  onion_k100: C(8e-3, '1/s', null, 'onion softening rate at 100 °C (no kinetics source; tuned to sauté stages)'),
  ppo_k78: S(0.22 / 60, '1/s', 'apple_ppo', 'PPO (browning enzyme) inactivation rate at 78 °C (apple 0.16–0.28 per min)'),
  ppo_z: S(8.5, '°C', 'apple_ppo', 'PPO z-value (apple 7.1–10 °C)'),
  ppo_Ea: S(Math.round(Math.LN10 * 8.314 * 351.15 ** 2 / 8.5), 'J/mol', 'apple_ppo', 'PPO inactivation Ea from z = 8.5 °C at 78 °C (Ea = ln10·R·T²/z)'),
  potato_Ea: S(152e3, 'J/mol', 'potato_soften', 'potato softening activation energy (145–160 kJ/mol)'),
  enz_rate: C(1 / 600, '1/s', 'fstr_browning', 'enzymatic browning index rate on a fresh cut at 22 °C (visible in ~10 min)'),
  enz_lemon: C(0.45, '', 'psu_browning', 'lemon juice multiplies the browning rate (acid; less effective than ascorbic)'),
  enz_ascorbic: C(0.12, '', 'psu_browning', 'ascorbic acid dip multiplies the browning rate'),
  enz_water: C(0.1, '', 'psu_browning', 'under water (no oxygen) multiplies the browning rate'),
  banana_chill_T: S(13, '°C', 'banana_chill', 'banana chilling injury below 13 °C'),
  banana_chill_days: S(4, 'days', 'banana_chill', 'underpeel browning visible from ~day 4 at 5 °C'),
  tomato_split_s: S(45, 's', 'tomato_peel', 'tomato skin splits after 30–60 s in boiling water'),
  cut_brunoise: S(0.003, 'm', 'rouxbe_cuts', 'brunoise 1/8 in cube'),
  cut_julienne: S(0.003, 'm', 'rouxbe_cuts', 'julienne 1/8 × 1/8 × 2 in'),
  cut_batonnet: S(0.006, 'm', 'rouxbe_cuts', 'batonnet 1/4 × 1/4 × 2 in'),
  cut_stick_len: S(0.05, 'm', 'rouxbe_cuts', 'julienne / batonnet length 2 in'),
  cut_dice_s: S(0.006, 'm', 'rouxbe_cuts', 'small dice 1/4 in'),
  cut_dice_m: S(0.012, 'm', 'rouxbe_cuts', 'medium dice 1/2 in'),
  cut_dice_l: S(0.019, 'm', 'rouxbe_cuts', 'large dice 3/4 in'),
  cut_slice: C(0.005, 'm', null, 'default slice thickness'),
  pasta_final_ratio: S(2.4, '', 'usda_pasta', 'fully cooked spaghetti weight / dry weight (62 % water vs ~10 % dry)'),
  pasta_aldente_s: S(540, 's', 'barilla', 'spaghetti al dente at 9 min'),
  // ---- fats & oils (smoke points; sources disagree, so midpoints of ranges) ----
  smoke_butter: S(163, '°C', 'wiki_smoke', 'butter smoke point 150–177 °C (Wikipedia 150, CSU 177)'),
  smoke_ghee: S(250, '°C', 'wiki_smoke', 'ghee / clarified butter ≈250 °C (CSU 191–252)'),
  smoke_evoo: S(193, '°C', 'wiki_smoke', 'extra-virgin olive oil 177–210 °C'),
  smoke_olive: S(220, '°C', 'csu_smoke', 'refined olive oil 199–243 °C'),
  smoke_canola: S(204, '°C', 'wiki_smoke', 'refined canola 204 °C'),
  smoke_sunflower: S(232, '°C', 'csu_smoke', 'sunflower 232 °C'),
  smoke_peanut: S(232, '°C', 'csu_smoke', 'peanut 232 °C'),
};

/** Value of a parameter. */
export const pv = (id) => {
  const p = P[id];
  if (!p) throw new Error('unknown param ' + id);
  return p.v;
};

/** Williams' formula for the boiled egg: seconds until the yolk–white boundary reaches Tyolk. */
export function williamsTime(M_g, Tegg, Twater = 100, Tyolk = 63) {
  // Williams' own property values: c = 3.7 J/gK, ρ = 1.038 g/cm³, K = 5.4e-3 W/cm·K
  const c = 3.7, rho = 1.038, K_ = 5.4e-3;
  const kappa = (c * Math.cbrt(rho)) / (K_ * Math.PI ** 2 * Math.pow((4 * Math.PI) / 3, 2 / 3));
  return kappa * Math.pow(M_g, 2 / 3) * Math.log((0.76 * (Tegg - Twater)) / (Tyolk - Twater));
}
