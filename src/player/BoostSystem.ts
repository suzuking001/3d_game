import type { MechMovementConfig } from '../config/MechConfig.js';
import type { EnergySystem } from './EnergySystem.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

export class BoostSystem {
  ascending = false;
  private hoverRemaining = 0;
  constructor(private readonly config: MechMovementConfig) {}
  update(dt: number, requested: boolean, velocity: Vector3, energy: EnergySystem): void {
    const c = this.config;
    const wasAscending = this.ascending;
    this.ascending = requested && energy.spend(c.boostDrain * dt);
    if (wasAscending && !this.ascending) this.hoverRemaining = c.hoverDuration;
    if (this.ascending) {
      this.hoverRemaining = 0;
      velocity.y = Math.min(c.maxRiseSpeed, velocity.y + c.verticalBoostForce * dt);
    } else {
      const gravity = this.hoverRemaining > 0 ? c.hoverGravity : velocity.y > 0 ? c.riseGravity : c.fallGravity;
      this.hoverRemaining = Math.max(0, this.hoverRemaining - dt);
      velocity.y = Math.max(-c.maxFallSpeed, velocity.y - gravity * dt);
    }
  }
  reset(): void { this.ascending = false; this.hoverRemaining = 0; }
}
