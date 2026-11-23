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
  h_contact_wet: S(550, 'W/m²K', 'zorrilla_contact', 'pan contact through oil/juice: patty contact 250–650 W/m²K'),
  h_contact_dry: S(300, 'W/m²K', 'zorrilla_contact', 'dry pan contact (low end of 250–650)'),
  h_board: C(20, 'W/m²K', null, 'food on a wooden board: wood effusivity √(kρc) gives ~15–35 W/m²K over the first minutes'),
  eps_food: C(0.9, '', null, 'emissivity of moist food surfaces'),

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
  smoke_butter: S(150, '°C', 'wiki_smoke', 'butter'), smoke_canola: S(204, '°C', 'wiki_smoke', 'refined canola'),
  smoke_evoo: S(190, '°C', 'wiki_smoke', 'extra-virgin olive oil 190–210'),
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
