import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult.js';
import type { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import type { MechMovementConfig } from '../config/MechConfig.js';

export interface GroundQuery {
  readonly normal: Vector3;
  probe(position: Vector3, velocity: Vector3): boolean;
}
export class GroundDetector implements GroundQuery {
  readonly normal = new Vector3(0, 1, 0);
  private readonly from = Vector3.Zero();
  private readonly to = Vector3.Zero();
  private readonly result = new PhysicsRaycastResult();
  constructor(private readonly plugin: HavokPlugin, private readonly config: MechMovementConfig) {}
  probe(position: Vector3, velocity: Vector3): boolean {
    if (velocity.y > 0) return false;
    const c = this.config;
    this.from.copyFrom(position);
    this.to.copyFrom(position); this.to.y -= c.collisionHalfHeight + c.groundProbeDistance;
    this.result.reset(this.from, this.to);
    this.plugin.raycast(this.from, this.to, this.result);
    if (!this.result.hasHit || this.result.hitNormalWorld.y < 0.5) return false;
    this.normal.copyFrom(this.result.hitNormalWorld);
    position.y = this.result.hitPointWorld.y + c.collisionHalfHeight + c.collisionSkin;
    velocity.y = 0;
    return true;
  }
}
