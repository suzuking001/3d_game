import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Chamfered hard-surface plate; flat face normals keep machined edges crisp. */
export function armorPlate(name: string, w: number, h: number, depth: number, scene: Scene): Mesh {
  const b = Math.min(w, h) * 0.18, x = w / 2, y = h / 2;
  const outline = [[-x + b, -y], [x - b, -y], [x, -y + b], [x, y - b], [x - b, y], [-x + b, y], [-x, y - b], [-x, -y + b]];
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  const triangle = (a: number[], c: number[], d: number[]) => {
    const base = positions.length / 3;
    for (const p of [a, c, d]) { positions.push(...p); uvs.push(p[0] / w + 0.5, p[1] / h + 0.5); }
    indices.push(base, base + 2, base + 1);
  };
  for (let edge = 0; edge < 8; edge++) {
    const a = outline[edge], c = outline[(edge + 1) % 8];
    const frontA = [a[0], a[1], depth / 2], frontC = [c[0], c[1], depth / 2];
    const backA = [a[0], a[1], -depth / 2], backC = [c[0], c[1], -depth / 2];
    triangle([0, 0, depth / 2], frontA, frontC);
    triangle([0, 0, -depth / 2], backC, backA);
    triangle(frontA, backA, backC); triangle(frontA, backC, frontC);
  }
  const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh(name, scene), data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(mesh);
  return mesh;
}
