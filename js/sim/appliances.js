// Burners, a cast-iron pan and a pot of water, as lumped thermal masses.
import { pv } from './params.js';
import { evapDrive, wair } from './heat.js';
import { LAYOUT, BURNER_TOP } from './layout.js';

const SIG = 5.670374e-8;

export class Burner {
  constructor(i) { this.i = i; this.setting = 0; this.x = LAYOUT.burners[i].x; this.z = LAYOUT.burners[i].z; }
  /** Heat delivered to the vessel (W). Gas valve output roughly linear between simmer and max. */
  power() {
    if (this.setting <= 0) return 0;
    const s = Math.min(10, this.setting) / 10;
    return (pv('burner_min') + (pv('burner_max') - pv('burner_min')) * s) * pv('gas_eff');
  }
}

export class Pan {
  constructor(burner) {
    this.kind = 'pan'; this.burner = burner;
    this.x = burner.x; this.z = burner.z;
    this.r = LAYOUT.pan.r;
    this.surfaceY = BURNER_TOP + LAYOUT.pan.base; // cooking surface height
    this.mass = pv('castiron_mass'); this.cp = pv('castiron_cp');
    this.T = pv('Tamb');
    this.pool = 0; // juice / water lying in the pan (kg)
    this.oiled = true;
    this.Aloss = 0.14; // m² exposed to the room (inside + outside walls + rim)
    this.foodQ = 0; this.evap = 0;
  }
  level() { return 0; }
  contactH() { return this.oiled || this.pool > 0.0005 ? pv('h_contact_wet') : pv('h_contact_dry'); }
  smoking() { return this.smokePoint != null && this.T > this.smokePoint; }
  step(dt, Tamb) {
    if (this.hold != null) { this.T = this.hold; this.foodQ = 0; this.evap = 0; return; } // thermostatic (tests)
    const C = this.mass * this.cp;
    const Tk = this.T + 273.15, Ta = Tamb + 273.15;
    const loss = pv('pan_h_loss') * this.Aloss * (this.T - Tamb) + pv('castiron_eps') * SIG * this.Aloss * (Tk ** 4 - Ta ** 4);
    // juice in the pan boils off when the pan is above 100 °C (nucleate boiling, h ≈ 5000 W/m²K)
    let qEv = 0;
    if (this.pool > 0 && this.T > 100) {
      const Awet = Math.min(Math.PI * this.r * this.r, this.pool / (1000 * 0.0008));
      qEv = Math.min(5000 * Awet * (this.T - 100), (this.pool * pv('Lv')) / dt);
      this.pool -= (qEv * dt) / pv('Lv');
    }
    this.evap = qEv / pv('Lv');
    this.T += (dt * (this.burner.power() - loss - this.foodQ - qEv)) / (C + this.pool * 4180);
    this.foodQ = 0;
  }
}

export class Pot {
  constructor(burner) {
    this.kind = 'pot'; this.burner = burner;
    this.x = burner.x; this.z = burner.z;
    this.r = LAYOUT.pot.r;
    this.bottomY = BURNER_TOP + LAYOUT.pot.base;
    this.water = pv('pot_water');
    this.T = pv('Tamb');
    this.steel = pv('pot_mass') * pv('steel_cp');
    this.lid = false;
    this.foodQ = 0; this.boiling = false; this.evap = 0;
  }
  level() { return this.bottomY + this.water / (1000 * Math.PI * this.r * this.r); }
  waterH() {
    // food in rolling-boiling water vs hot still water
    const t = Math.max(0, Math.min(1, (this.T - 95) / 5));
    return this.boiling ? pv('h_water_boil') : pv('h_water_still') + t * (pv('h_water_boil') - pv('h_water_still')) * 0.5;
  }
  step(dt, Tamb) {
    if (this.hold != null) { this.T = this.hold; this.boiling = false; this.foodQ = 0; return; } // thermostatic bath
    const Aside = 2 * Math.PI * this.r * LAYOUT.pot.h, Asurf = Math.PI * this.r * this.r;
    const sideLoss = pv('pan_h_loss') * Aside * (this.T - Tamb) + 0.3 * SIG * Aside * ((this.T + 273.15) ** 4 - (Tamb + 273.15) ** 4);
    // evaporation from the open surface (mass transfer, Lewis analogy); a lid traps most of it
    // (bulk temperature capped at 98 °C in the drive: the lumped model has no hot bottom layer)
    const hs = pv('h_pot_surface');
    let evap = this.water > 0 ? ((hs * Asurf) / 1006) * evapDrive(Math.min(this.T, 98), wair(Tamb, pv('RHamb'))) : 0;
    if (this.lid) evap *= 0.1;
    let net = this.burner.power() - sideLoss - evap * pv('Lv') - this.foodQ;
    this.water = Math.max(0, this.water - evap * dt);
    const C = this.steel + this.water * 4180;
    let T = this.T + (dt * net) / C;
    this.boiling = false;
    if (T >= 100 && this.water > 0) {
      // excess energy boils water away
      const excess = (T - 100) * C;
      const boiled = excess / pv('Lv');
      this.water = Math.max(0, this.water - boiled);
      evap += boiled / dt;
      T = 100;
      this.boiling = net > 0;
    }
    this.evap = evap;
    this.T = T;
    this.foodQ = 0;
  }
}
