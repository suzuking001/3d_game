import type { InputState } from '../input/InputState.js';

export interface BeamShot { power: number; damage: number; range: number; charged: boolean; }
export interface WeaponEnergy { spend(amount: number): boolean; }
/** Fixed-step trigger/charge logic; targeting and rendering are separate. */
export class WeaponSystem {
  charge = 0;
  cooldown = 0;
  recoil = 0;
  shots = 0;
  private charging = false;
  reset(): void { this.charge = this.cooldown = this.recoil = this.shots = 0; this.charging = false; }
  update(dt: number, input: InputState, energy: WeaponEnergy): BeamShot | null {
    this.cooldown = Math.max(0, this.cooldown - dt); this.recoil *= Math.exp(-dt * 10);
    if (input.combatCancelled || input.resetPressed) { this.charge = 0; this.charging = false; return null; }
    if (input.chargeHeld && this.cooldown <= 1e-8) {
      this.charging = true; this.charge = Math.min(1, this.charge + dt / 1.15); return null;
    }
    if (input.chargeReleased && this.charging) {
      const amount = this.charge; this.charge = 0; this.charging = false;
      return this.fire(amount, energy);
    }
    // A lost release edge (focus/device loss) must never leave a charge armed.
    if (!input.chargeHeld && this.charging && !input.chargeReleased) { this.charge = 0; this.charging = false; }
    if ((input.fireHeld || input.firePressed) && !input.chargeHeld && this.cooldown <= 1e-8) return this.fire(0, energy);
    return null;
  }
  private fire(charge: number, energy: WeaponEnergy): BeamShot | null {
    if (!energy.spend(4 + charge * 26)) return null;
    const charged = charge >= .8;
    this.cooldown = charge > .05 ? .35 + charge * .5 : .28;
    this.recoil = 1 + charge * 2; this.shots++;
    return { power: 1 + charge * 3, damage: 28 + charge * 132, range: 300, charged };
  }
}
