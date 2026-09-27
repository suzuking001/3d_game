import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { MechMovementConfig } from '../config/MechConfig.js';
import { MechState } from './MechState.js';
import type { CollisionController } from '../physics/CollisionController.js';

export class MechMovement {
  readonly position = Vector3.Zero();
  readonly previousPosition = Vector3.Zero();
  readonly velocity = Vector3.Zero();
  readonly acceleration = Vector3.Zero();
  readonly desired = Vector3.Zero();
  readonly forward = new Vector3(0, 0, 1);
  readonly groundNormal = new Vector3(0, 1, 0);
  private readonly previousVelocity = Vector3.Zero();
  grounded = true;
  state = MechState.GROUND;
  yaw = 0;
  constructor(readonly config: MechMovementConfig, readonly collision: CollisionController) { this.reset(); }
  reset(): void {
    const c = this.config;
    this.position.set(c.spawnX, c.spawnY, c.spawnZ); this.previousPosition.copyFrom(this.position);
    this.velocity.setAll(0); this.acceleration.setAll(0); this.desired.setAll(0);
    this.yaw = 0; this.forward.set(0, 0, 1); this.grounded = true; this.state = MechState.GROUND;
  }
  beginStep(): void { this.previousPosition.copyFrom(this.position); this.previousVelocity.copyFrom(this.velocity); }
  solveHorizontal(dt: number): void {
    const c = this.config, v = this.velocity;
    if (!this.grounded && this.desired.lengthSquared() < 1e-6) {
      const drag = Math.exp(-c.airDrag * dt); v.x *= drag; v.z *= drag;
      return;
    }
    const speed = this.grounded ? c.groundMaxSpeed : c.airMaxSpeed;
    const rate = this.grounded ? (this.desired.lengthSquared() > 0 ? c.groundAcceleration : c.groundBraking) : c.airAcceleration * c.airControl;
    const dx = this.desired.x * speed - v.x, dz = this.desired.z * speed - v.z;
    const delta = Math.hypot(dx, dz), amount = Math.min(1, rate * dt / (delta || 1));
    v.x += dx * amount; v.z += dz * amount;
  }
  finishStep(dt: number): void {
    this.collision.move(this.position, this.velocity, dt);
    this.grounded = this.collision.grounded;
    this.velocity.subtractToRef(this.previousVelocity, this.acceleration); this.acceleration.scaleInPlace(1 / dt);
    if (this.desired.lengthSquared() > 1e-6) {
      const target = Math.atan2(this.desired.x, this.desired.z);
      const delta = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
      this.yaw += delta * (1 - Math.exp(-this.config.facingResponse * dt));
      this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }
  }
}
