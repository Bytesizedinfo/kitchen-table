// Generate SOURCES.md from js/sim/params.js:  node tools/sources.mjs > SOURCES.md
import { P, SRC } from '../js/sim/params.js';
const rows = Object.entries(P).map(([id, p]) => {
  const s = p.src ? SRC[p.src] : null;
  return `| ${p.note || id} | \`${p.v} ${p.unit}\` | ${p.kind} | ${s ? `[${s.t}](${s.u})` : '—'} |`;
});
console.log(`# Where the numbers come from

Generated from \`js/sim/params.js\` (\`node tools/sources.mjs > SOURCES.md\`).

- **sourced**: taken from, or computed directly from, the cited source
- **calibrated**: chosen inside a sourced range, or tuned so a sourced behaviour comes out
- **constant**: physical constant or standard property

| Parameter | Value | Kind | Source |
|---|---|---|---|
${rows.join('\n')}

## Models

- **Heat**: 3D conduction on a 1–3 mm grid per piece (thin axis solved implicitly), Choi–Okos composition-based thermal properties with a measured override for lean beef, and a thin surface skin with contact, convection, radiation and evaporation (Spalding mass-transfer driving force).
- **Water**: wet surfaces are held below boiling by evaporation; interior cells cannot pass 100 °C while they hold water (the excess heat boils it off); meat proteins hold less water as they set, and the released juice travels to the surface, then evaporates or drips.
- **Chemistry**: protein denaturation and starch gelatinization as equilibrium-limited irreversible transitions; pectin β-elimination and softening as first-order Arrhenius kinetics; Maillard browning and charring accumulate on the dry surface.
- **Cutting**: a cut splits the state grid cell by cell (mass, water and heat are conserved), and each piece's shape is the original shape intersected with its cuts.

## Known deviations

- A steak seared hard and pulled at 54 °C rises about 6 °C while resting. Rules of thumb say 2–4 °C for small steaks ([ThermoWorks](https://blog.thermoworks.com/give-your-meat-a-rest/)); the \`steak_carryover\` test reports this.
- Williams' boiled-egg formula keeps only the first term of the exact series. The simulator agrees with the exact series to within 6 %, so it is about 15 % slower than the formula for a fridge egg.
`);
