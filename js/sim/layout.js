// Shared scene layout (metres). Table top is y = 0. Used by the simulation (support surfaces)
// and the renderer (meshes), so they always agree.
export const LAYOUT = {
  table: { w: 1.7, d: 0.95, top: 0 },
  board: { x: -0.37, z: 0.13, w: 0.44, d: 0.29, h: 0.025 },
  cooktop: { x: 0.3, z: -0.04, w: 0.6, d: 0.38, h: 0.06, grate: 0.02 },
  burners: [{ x: 0.16, z: -0.04 }, { x: 0.44, z: -0.04 }],
  pan: { r: 0.105, rTop: 0.128, wall: 0.045, base: 0.005 },
  pot: { r: 0.095, h: 0.15, base: 0.004 },
  plate: { x: -0.37, z: -0.24, r: 0.13, h: 0.018 },
  rest: { x: -0.06, z: 0.27, w: 0.2, d: 0.16, h: 0.004 }, // resting rack/tray
  fridge: { x: -0.665, z: -0.25, w: 0.36, d: 0.3, h: 0.42, floor: 0.03 }, // two glass doors: freezer (left), fridge (right)
};
export const BURNER_TOP = LAYOUT.cooktop.h + LAYOUT.cooktop.grate; // pan base sits here
