import type { MechMovementConfig } from '../config/MechConfig.js';
export class EnergySystem {
  currentEnergy: number;
  private rechargeDelay = 0;
  deniedTime = 0;
  constructor(private readonly config: MechMovementConfig) { this.currentEnergy = config.maxEnergy; }
  get maxEnergy(): number { return this.config.maxEnergy; }
  spend(amount: number): boolean {
    if (this.currentEnergy + 1e-9 < amount) { this.deniedTime = 0.45; return false; }
    this.currentEnergy = Math.max(0, this.currentEnergy - amount);
    this.rechargeDelay = this.config.energyRechargeDelay;
    return true;
  }
  update(dt: number): void {
    this.deniedTime = Math.max(0, this.deniedTime - dt);
    const rechargeDt = Math.max(0, dt - this.rechargeDelay);
    this.rechargeDelay = Math.max(0, this.rechargeDelay - dt);
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + this.config.energyRechargeRate * rechargeDt);
  }
  reset(): void { this.currentEnergy = this.maxEnergy; this.rechargeDelay = this.deniedTime = 0; }
}
