import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate.js';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js';
import type { ColliderBox } from '../physics/CollisionController.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';
import { WorldMaterials } from './WorldMaterials.js';
import { RuinGeometry } from './RuinGeometry.js';
import { buildRuinedCity } from './RuinedCity.js';
import { buildStreetDetails } from './StreetDetails.js';
export class Environment {
  readonly boxes: ColliderBox[] = [];
  readonly shadowCasters: Mesh[];
  readonly materials: WorldMaterials;
  private readonly bodies: PhysicsAggregate[] = [];
  constructor(scene: Scene) {
    this.materials = new WorldMaterials(scene);
    const geometry = new RuinGeometry(scene, graphicsConfig.seed), m = this.materials;
    const addCollider = (name: string, x: number, y: number, z: number, w: number, h: number, d: number) => {
      const proxy = MeshBuilder.CreateBox(`collision-${name}`, { width: w, height: h, depth: d }, scene);
      proxy.position.set(x, y, z); proxy.isVisible = false; proxy.isPickable = false;
      this.boxes.push({ min: new Vector3(x - w / 2, y - h / 2, z - d / 2), max: new Vector3(x + w / 2, y + h / 2, z + d / 2) });
      this.bodies.push(new PhysicsAggregate(proxy, PhysicsShapeType.BOX, { mass: 0, friction: 0.2 }, scene));
      proxy.freezeWorldMatrix();
    };
    const size = graphicsConfig.arenaHalfSize;
    geometry.box('fractured earth', m.concrete, 0, -2, 0, size * 2, 4, size * 2);
    addCollider('ground', 0, -2, 0, size * 2, 4, size * 2);
    geometry.box('abandoned avenue', m.asphalt, 0, 0.015, 0, 40, 0.025, size * 2);
    for (const side of [-1, 1]) {
      addCollider('perimeter', side * size, 30, 0, 2, 60, size * 2);
      addCollider('perimeter', 0, 30, side * size, size * 2, 60, 2);
      geometry.box('perimeter foundation', m.charred, side * size, 2, 0, 2, 4, size * 2);
      geometry.box('perimeter foundation', m.charred, 0, 2, side * size, size * 2, 4, 2);
    }
    buildRuinedCity(geometry, m, addCollider);
    buildStreetDetails(geometry, m, scene, addCollider);
    this.shadowCasters = geometry.finish().filter(mesh => mesh.material !== m.grime);
  }
  dispose(): void { for (const body of this.bodies) body.dispose(); }
}
