import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector4 } from '@babylonjs/core/Maths/math.vector.js';
import type { Material } from '@babylonjs/core/Materials/material.js';
import type { Scene } from '@babylonjs/core/scene.js';
/** Static details are merged by material once, avoiding hundreds of draw calls. */
export class RuinGeometry {
  private readonly batches = new Map<Material, Mesh[]>();
  private state: number;
  constructor(private readonly scene: Scene, seed: number) { this.state = seed; }
  random(): number { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return this.state / 4294967296; }
  box(name: string, material: Material, x: number, y: number, z: number, w: number, h: number, d: number, tilt = 0): Mesh {
    const uv = (a: number, b: number) => new Vector4(0, 0, a / 3, b / 3);
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d,
      // Babylon's side faces run U along Y; its top face runs U along Z.
      faceUV: [uv(w, h), uv(w, h), uv(h, d), uv(h, d), uv(d, w), uv(d, w)] }, this.scene);
    mesh.position.set(x, y, z); mesh.rotation.z = tilt; mesh.material = material; mesh.receiveShadows = true;
    let batch = this.batches.get(material); if (!batch) { batch = []; this.batches.set(material, batch); }
    batch.push(mesh); return mesh;
  }
  rubble(material: Material, x: number, y: number, z: number, w: number, h: number, d: number): void {
    const mesh = MeshBuilder.CreateIcoSphere('fractured masonry', { radius: 1, subdivisions: 1, flat: true }, this.scene);
    mesh.scaling.set(w * 0.65, h * 0.6, d * 0.65); mesh.position.set(x, y, z);
    mesh.rotation.set(this.random(), this.random() * 6, this.random()); mesh.material = material;
    let batch = this.batches.get(material); if (!batch) { batch = []; this.batches.set(material, batch); }
    batch.push(mesh);
  }
  panel(material: Material, x: number, y: number, z: number, w: number, h: number, yaw: number): void {
    const mesh = MeshBuilder.CreatePlane('leaking facade', { width: w, height: h }, this.scene);
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; mesh.material = material;
    let batch = this.batches.get(material); if (!batch) { batch = []; this.batches.set(material, batch); }
    batch.push(mesh);
  }
  finish(): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [material, batch] of this.batches) {
      const mesh = Mesh.MergeMeshes(batch, true, true); if (!mesh) continue;
      mesh.name = `ruins-${material.name}`; mesh.material = material; mesh.receiveShadows = true;
      mesh.freezeWorldMatrix(); meshes.push(mesh);
    }
    this.batches.clear(); return meshes;
  }
}
