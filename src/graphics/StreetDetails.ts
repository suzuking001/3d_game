import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { RuinGeometry } from './RuinGeometry.js';
import type { WorldMaterials } from './WorldMaterials.js';
import type { AddCollider } from './RuinedCity.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';
export function buildStreetDetails(g: RuinGeometry, m: WorldMaterials, scene: Scene, collider: AddCollider): void {
  for (const side of [-1, 1]) {
    g.box('broken pavement', m.concrete, side * 22, 0.14, 0, 3.7, 0.28, 290);
    for (let j = 0; j < 9; j++) {
      const z = -125 + j * 31;
      g.box('rusted lamp pole', m.rust, side * 22, 5, z, 0.15, 10, 0.15, side * (g.random() * 0.1));
      g.box('dead streetlamp', m.rust, side * 21, 10, z, 2.5, 0.25, 0.4);
      if (j % 4 === 0) g.box('live emergency lamp', m.emissive, side * 20, 9.9, z, 0.45, 0.06, 0.3);
    }
  }
  for (let z = -140; z < 150; z += 8) {
    if (g.random() < 0.2) continue;
    for (const x of [-0.3, 0.3]) g.box('worn center line', m.paint, x, 0.036, z, 0.1, 0.015, 3.5);
  }
  for (let i = 0; i < graphicsConfig.debrisCount; i++) {
    const x = (g.random() < 0.5 ? -1 : 1) * (12 + g.random() * 115), z = (g.random() - 0.5) * 286;
    const w = 0.2 + g.random() * 2.3, h = 0.2 + g.random() * 1.5;
    g.rubble(i % 5 ? m.concrete : m.charred, x, h / 2, z, w, h, 0.3 + g.random() * 1.8);
    if (w > 1.7 && Math.abs(x) < 28) collider('large debris', x, h / 2, z, w + 0.4, h, w + 0.4);
  }
  for (let i = 0; i < 25; i++) {
    const puddle = new Mesh('irregular rainwater pool', scene);
    const positions = [0, 0, 0], normals = [0, 1, 0], uvs = [0.5, 0.5], indices: number[] = [];
    const width = 1.5 + g.random() * 3.5, depth = 0.7 + g.random() * 1.7;
    for (let edge = 0; edge < 32; edge++) {
      const angle = edge / 32 * Math.PI * 2, radius = 0.75 + g.random() * 0.25;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      positions.push(x * width, 0, z * depth); normals.push(0, 1, 0); uvs.push(x * 0.5 + 0.5, z * 0.5 + 0.5);
      indices.push(0, edge + 1, (edge + 1) % 32 + 1);
    }
    const data = new VertexData(); data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices; data.applyToMesh(puddle);
    puddle.position.set((g.random() - 0.5) * 32, 0.045, (g.random() - 0.5) * 280);
    puddle.material = m.water; puddle.receiveShadows = true; puddle.isPickable = false; puddle.freezeWorldMatrix();
  }
  // Collapse fans along the avenue: dense small shards, with a clear central lane.
  for (const [cx, cz] of [[-16, -43], [17, -30], [-18, 24], [19, 60], [-20, -95]]) {
    for (let shard = 0; shard < 60; shard++) {
      const angle = g.random() * Math.PI * 2, radius = Math.sqrt(g.random()) * 7;
      const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
      if (Math.abs(x) < 9) continue;
      const height = 0.15 + g.random() * 0.8;
      g.rubble(shard % 4 ? m.concrete : m.charred, x, height * 0.4, z, 0.2 + g.random() * 1.5, height, 0.2 + g.random());
    }
    const beam = g.box('fallen structural girder', m.rust, cx, 0.6, cz, 0.35, 0.65, 9, 0.17);
    beam.rotation.y = 0.4 + g.random();
    for (let rod = 0; rod < 8; rod++) {
      const rebar = g.box('tangled fallen reinforcement', m.rust, cx + g.random() * 3, 0.3, cz + g.random() * 4, 0.045, 0.045, 3 + g.random() * 3);
      rebar.rotation.y = g.random() * 6;
    }
  }
  // Original modular industrial wrecks, away from the open traversal corridor.
  for (const [x, z] of [[-16, -27], [17, 3], [-19, 85], [18, -102]]) {
    g.box('abandoned transport chassis', m.rust, x, 0.7, z, 3.4, 0.7, 7);
    collider('transport wreck', x, 1.5, z, 3.8, 3, 7);
    g.box('burned vehicle cabin', m.charred, x, 1.8, z + 1.8, 3.1, 1.7, 2.4);
    g.box('missing windscreen', m.glass, x, 2, z + 3.04, 2.6, 0.9, 0.04);
    for (const sign of [-1, 1]) {
      g.box('cargo bed rail', m.rust, x + sign * 1.65, 1.25, z - 1, 0.15, 0.9, 4);
      for (const offset of [-2, 2]) {
        const wheel = g.box('collapsed wheel assembly', m.charred, x + sign * 1.55, 0.5, z + offset, 0.6, 0.95, 1.1);
        wheel.rotation.z = sign * 0.15;
      }
    }
  }
  for (const [x, z] of [[-12, 12], [13, 65], [-18, -78]]) {
    g.box('concrete barricade', m.concrete, x, 0.8, z, 6, 1.6, 1.2);
    collider('barricade', x, 0.8, z, 6, 1.6, 1.2);
    for (let j = 0; j < 4; j++) g.box('aged warning stripe', m.paint, x - 2 + j * 1.3, 0.8, z - 0.61, 0.4, 1.2, 0.015, 0.45);
  }
}
