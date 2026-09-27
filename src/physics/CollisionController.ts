import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { MechMovementConfig } from '../config/MechConfig.js';

export interface ColliderBox { min: Vector3; max: Vector3; }

/** Continuous sweep of a conservative upright mech box against static arena boxes. */
export class CollisionController {
  readonly normal = Vector3.Zero();
  grounded = false;
  private readonly remaining = Vector3.Zero();
  private readonly hitNormal = Vector3.Zero();
  constructor(readonly boxes: readonly ColliderBox[], private readonly config: MechMovementConfig) {}

  move(position: Vector3, velocity: Vector3, dt: number): void {
    const c = this.config;
    this.normal.setAll(0); this.grounded = false;
    this.depenetrate(position);
    velocity.scaleToRef(dt, this.remaining);
    for (let iteration = 0; iteration < c.collisionIterations; iteration++) {
      if (this.remaining.lengthSquared() < 1e-12) break;
      let earliest = 1;
      this.hitNormal.setAll(0);
      for (const box of this.boxes) {
        let enter = -Infinity, exit = Infinity, hitAxis = -1, sign = 0;
        for (let axis = 0; axis < 3; axis++) {
          const p = axis === 0 ? position.x : axis === 1 ? position.y : position.z;
          const d = axis === 0 ? this.remaining.x : axis === 1 ? this.remaining.y : this.remaining.z;
          const half = axis === 1 ? c.collisionHalfHeight : c.collisionRadius;
          const lo = (axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z) - half;
          const hi = (axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z) + half;
          if (Math.abs(d) < 1e-12) {
            if (p <= lo || p >= hi) { enter = Infinity; break; }
          } else {
            const a = (lo - p) / d, b = (hi - p) / d;
            const near = Math.min(a, b), far = Math.max(a, b);
            if (near > enter) { enter = near; hitAxis = axis; sign = d > 0 ? -1 : 1; }
            exit = Math.min(exit, far);
          }
        }
        if (enter >= -1e-8 && enter <= earliest && enter <= exit && exit >= 0 && hitAxis >= 0) {
          earliest = Math.max(0, enter);
          this.hitNormal.set(hitAxis === 0 ? sign : 0, hitAxis === 1 ? sign : 0, hitAxis === 2 ? sign : 0);
        }
      }
      position.x += this.remaining.x * earliest;
      position.y += this.remaining.y * earliest;
      position.z += this.remaining.z * earliest;
      if (this.hitNormal.lengthSquared() === 0) break;
      position.x += this.hitNormal.x * c.collisionSkin;
      position.y += this.hitNormal.y * c.collisionSkin;
      position.z += this.hitNormal.z * c.collisionSkin;
      this.normal.copyFrom(this.hitNormal);
      if (this.hitNormal.y > 0.5) this.grounded = true;
      this.remaining.scaleInPlace(1 - earliest);
      const into = Vector3.Dot(this.remaining, this.hitNormal);
      this.remaining.x -= this.hitNormal.x * into;
      this.remaining.y -= this.hitNormal.y * into;
      this.remaining.z -= this.hitNormal.z * into;
      const vInto = Vector3.Dot(velocity, this.hitNormal);
      if (vInto < 0) {
        velocity.x -= this.hitNormal.x * vInto;
        velocity.y -= this.hitNormal.y * vInto;
        velocity.z -= this.hitNormal.z * vInto;
      }
    }
    // Keep support across the tiny skin gap; otherwise ground/air would alternate.
    if (velocity.y <= 0) {
      for (const box of this.boxes) {
        const gap = position.y - c.collisionHalfHeight - box.max.y;
        if (gap >= -c.collisionSkin && gap <= c.groundProbeDistance &&
            position.x > box.min.x - c.collisionRadius && position.x < box.max.x + c.collisionRadius &&
            position.z > box.min.z - c.collisionRadius && position.z < box.max.z + c.collisionRadius) {
          position.y = box.max.y + c.collisionHalfHeight + c.collisionSkin;
          velocity.y = 0; this.grounded = true;
        }
      }
    }
  }

  /** Resolve overlap caused by live collider-size edits or an initial spawn. */
  private depenetrate(position: Vector3): void {
    const c = this.config;
    for (let iteration = 0; iteration < c.collisionIterations; iteration++) {
      let adjusted = false;
      for (const box of this.boxes) {
        const lx = box.min.x - c.collisionRadius, hx = box.max.x + c.collisionRadius;
        const ly = box.min.y - c.collisionHalfHeight, hy = box.max.y + c.collisionHalfHeight;
        const lz = box.min.z - c.collisionRadius, hz = box.max.z + c.collisionRadius;
        if (position.x <= lx || position.x >= hx || position.y <= ly || position.y >= hy || position.z <= lz || position.z >= hz) continue;
        let amount = lx - position.x, axis = 0;
        const consider = (value: number, candidateAxis: number) => {
          if (Math.abs(value) < Math.abs(amount)) { amount = value; axis = candidateAxis; }
        };
        consider(hx - position.x, 0); consider(ly - position.y, 1); consider(hy - position.y, 1);
        consider(lz - position.z, 2); consider(hz - position.z, 2);
        amount += Math.sign(amount) * c.collisionSkin;
        if (axis === 0) position.x += amount;
        else if (axis === 1) position.y += amount;
        else position.z += amount;
        adjusted = true;
      }
      if (!adjusted) break;
    }
  }
}
