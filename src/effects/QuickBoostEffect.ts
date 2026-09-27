import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
export class QuickBoostEffect {
  private readonly ring: Mesh;
  private life = 0;
  constructor(scene: Scene) {
    const material = new StandardMaterial('boost-wave', scene);
    material.disableLighting = true; material.emissiveColor = Color3.FromHexString('#88b4d1'); material.alpha = 0.22;
    this.ring = MeshBuilder.CreateTorus('boost-shockwave', { diameter: 2.5, thickness: 0.05, tessellation: 32 }, scene);
    this.ring.material = material; this.ring.isPickable = false; this.ring.isVisible = false;
  }
  trigger(position: Vector3): void { this.ring.position.copyFrom(position); this.life = 0.25; }
  update(dt: number): void {
    this.life = Math.max(0, this.life - dt);
    this.ring.isVisible = this.life > 0;
    this.ring.scaling.setAll(1 + (1 - this.life / 0.25) * 3);
    this.ring.visibility = this.life / 0.25;
  }
}
