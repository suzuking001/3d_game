import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { MechController } from '../player/MechController.js';
import type { MechCamera } from '../camera/MechCamera.js';
export class DebugRenderer {
  enabled = false;
  private readonly lines: LinesMesh[] = [];
  private readonly points: Vector3[][] = [];
  constructor(private readonly scene: Scene) {
    for (const color of ['#e2d069', '#83dcbc', '#ef9777', '#b5cbff', '#c0dd89', '#8cc9f0', '#f09dc1']) {
      const points = [Vector3.Zero(), Vector3.Zero()]; this.points.push(points);
      const line = MeshBuilder.CreateLines('debug-vector', { points, updatable: true }, scene);
      line.color = Color3.FromHexString(color); line.isPickable = false; line.isVisible = false; this.lines.push(line);
    }
  }
  update(player: MechController, camera: MechCamera): void {
    const m = player.movement;
    this.draw(0, m.position, m.velocity, 0.1);
    this.draw(1, m.position, m.desired, 5);
    this.draw(2, m.position, player.quickBoost.direction, 6);
    this.draw(3, m.position, m.groundNormal, 3);
    this.draw(4, m.position, camera.forward, 4);
    this.draw(5, m.position, camera.right, 4);
    this.draw(6, m.position, m.collision.normal, 4);
  }
  private draw(index: number, start: Vector3, direction: Vector3, scale: number): void {
    this.points[index][0].copyFrom(start);
    direction.scaleToRef(scale, this.points[index][1]); this.points[index][1].addInPlace(start);
    this.apply(index);
  }
  private apply(index: number): void {
    this.lines[index].isVisible = this.enabled;
    if (this.enabled) MeshBuilder.CreateLines('debug-vector', { points: this.points[index], instance: this.lines[index] }, this.scene);
  }
}
