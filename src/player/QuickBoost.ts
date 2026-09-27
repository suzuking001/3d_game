import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { MechMovementConfig } from '../config/MechConfig.js';
import type { EnergySystem } from './EnergySystem.js';

export enum QuickBoostPhase {
  IDLE = 'IDLE', START = 'START', ACCELERATION = 'ACCELERATION',
  PEAK = 'PEAK', DECELERATION = 'DECELERATION', EXIT = 'EXIT',
}
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A timed velocity state, not an impulse. Collision always integrates its output. */
export class QuickBoost {
  phase = QuickBoostPhase.IDLE;
  readonly direction = new Vector3(0, 0, 1);
  speed = 0;
  started = false;
  count = 0;
  private elapsed = 0;
  private cooldown = 0;
  private buffer = 0;
  private initialSpeed = 0;
  private readonly steered = Vector3.Zero();
  constructor(private readonly config: MechMovementConfig) {}
  get active(): boolean { return this.phase !== QuickBoostPhase.IDLE && this.phase !== QuickBoostPhase.EXIT; }
  get cooldownRemaining(): number { return this.cooldown; }
  get buffered(): boolean { return this.buffer > 0; }
  queue(): void { this.buffer = this.config.quickBoostInputBuffer; }
  tryStart(desired: Vector3, mechForward: Vector3, velocity: Vector3, energy: EnergySystem): boolean {
    if (this.buffer <= 0 || this.active || this.cooldown > 1e-8) return false;
    if (!energy.spend(this.config.quickBoostEnergyCost)) { this.buffer = 0; return false; }
    this.buffer = 0; this.elapsed = 0; this.cooldown = this.config.quickBoostCooldown;
    this.direction.copyFrom(desired.lengthSquared() > 1e-6 ? desired : mechForward).normalize();
    // A reversal starts accelerating immediately; old momentum must not point the new QB backwards.
    this.initialSpeed = Math.max(0, Vector3.Dot(velocity, this.direction));
    this.speed = this.initialSpeed; this.phase = QuickBoostPhase.START;
    this.started = true; this.count++;
    return true;
  }
  tickTimers(dt: number): void {
    this.started = false;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.buffer = Math.max(0, this.buffer - dt);
    if (this.phase === QuickBoostPhase.EXIT) this.phase = QuickBoostPhase.IDLE;
  }
  solve(dt: number, desired: Vector3, velocity: Vector3): void {
    if (!this.active) return;
    const c = this.config;
    this.elapsed += dt;
    if (desired.lengthSquared() > 1e-6) {
      const weight = 1 - Math.exp(-c.quickBoostSteeringInfluence * dt / Math.max(0.001, c.quickBoostAccelerationTime));
      Vector3.LerpToRef(this.direction, desired, weight, this.steered);
      if (this.steered.lengthSquared() > 1e-6) this.direction.copyFrom(this.steered).normalize();
    }
    const accel = Math.max(0.001, c.quickBoostAccelerationTime);
    const holdEnd = accel + c.quickBoostHoldTime;
    const end = holdEnd + Math.max(0.001, c.quickBoostDecelerationTime);
    const exitSpeed = c.quickBoostPeakSpeed * c.quickBoostMomentumRetention;
    if (this.elapsed < accel) {
      this.phase = QuickBoostPhase.ACCELERATION;
      // Ease-out gives a strong immediate response without a velocity discontinuity.
      const t = this.elapsed / accel;
      this.speed = this.initialSpeed + (c.quickBoostPeakSpeed - this.initialSpeed) * (1 - (1 - t) ** 3);
    } else if (this.elapsed < holdEnd) {
      this.phase = QuickBoostPhase.PEAK; this.speed = c.quickBoostPeakSpeed;
    } else if (this.elapsed < end) {
      this.phase = QuickBoostPhase.DECELERATION;
      this.speed = c.quickBoostPeakSpeed + (exitSpeed - c.quickBoostPeakSpeed) * smooth((this.elapsed - holdEnd) / (end - holdEnd));
    } else {
      this.phase = QuickBoostPhase.EXIT; this.speed = exitSpeed;
    }
    velocity.x = this.direction.x * this.speed; velocity.z = this.direction.z * this.speed;
  }
  reset(): void {
    this.phase = QuickBoostPhase.IDLE; this.elapsed = this.cooldown = this.buffer = this.speed = this.count = 0;
    this.started = false; this.direction.set(0, 0, 1);
  }
}
