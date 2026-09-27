import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { ThrusterEffect } from './ThrusterEffect.js';
import { QuickBoostEffect } from './QuickBoostEffect.js';

export class EffectManager {
  readonly thruster: ThrusterEffect;
  private readonly quickBoost: QuickBoostEffect;
  constructor(scene: Scene, outlets: TransformNode[]) {
    this.thruster = new ThrusterEffect(scene, outlets); this.quickBoost = new QuickBoostEffect(scene);
  }
  boostStarted(position: Vector3): void { this.quickBoost.trigger(position); }
  update(dt: number, _position: Vector3, _velocity: Vector3, boosting: boolean, ascending: boolean): void {
    this.quickBoost.update(dt); this.thruster.update(dt, boosting ? 1 : ascending ? 0.8 : 0, ascending);
  }
}
