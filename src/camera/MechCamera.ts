import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { cameraConfig } from '../config/CameraConfig.js';
import { CameraEffects } from './CameraEffects.js';
import type { InputState } from '../input/InputState.js';

export class MechCamera {
  readonly camera: FreeCamera;
  readonly forward = new Vector3(0, 0, 1);
  readonly right = new Vector3(1, 0, 0);
  readonly effects = new CameraEffects();
  private readonly target = Vector3.Zero();
  private readonly rig = Vector3.Zero();
  private readonly wanted = Vector3.Zero();
  private readonly lookTarget = Vector3.Zero();
  private lockTarget: Vector3 | null = null;
  private readonly ray = new Ray(Vector3.Zero(), Vector3.Zero(), 1);
  yaw = 0;
  pitch = cameraConfig.initialPitch;
  constructor(private readonly scene: Scene, initial: Vector3) {
    this.camera = new FreeCamera('mech-camera', new Vector3(0, 8, -15), scene);
    this.camera.minZ = 0.15; this.camera.maxZ = 4000;
    this.reset(initial);
  }
  reset(position: Vector3): void { this.target.copyFrom(position); this.rig.copyFrom(position); }
  readLook(input: InputState): void {
    this.yaw += input.lookX;
    this.pitch = Math.max(cameraConfig.minPitch, Math.min(cameraConfig.maxPitch, this.pitch + input.lookY));
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }
  update(dt: number, position: Vector3, lag = 0): void {
    const c = cameraConfig;
    this.target.copyFrom(position); this.target.y += c.targetHeight;
    const response = c.followResponse * (1 - lag);
    Vector3.LerpToRef(this.rig, this.target, 1 - Math.exp(-response * dt), this.rig);
    const distance = c.distance * Math.cos(this.pitch);
    this.wanted.set(this.rig.x - this.forward.x * distance, this.rig.y + c.height + Math.sin(this.pitch) * c.distance, this.rig.z - this.forward.z * distance);
    this.ray.origin.copyFrom(this.target);
    this.wanted.subtractToRef(this.target, this.ray.direction);
    this.ray.length = this.ray.direction.length(); this.ray.direction.normalize();
    const hit = this.scene.pickWithRay(this.ray, mesh => mesh.isPickable);
    if (hit?.hit && hit.distance < this.ray.length) {
      this.ray.direction.scaleToRef(Math.max(0.3, hit.distance - c.collisionPadding), this.wanted);
      this.wanted.addInPlace(this.target);
    }
    this.camera.position.copyFrom(this.wanted);
    this.camera.position.x += this.effects.shakeX; this.camera.position.y += this.effects.shakeY;
    this.lookTarget.copyFrom(this.target);
    if (this.lockTarget) Vector3.LerpToRef(this.lookTarget, this.lockTarget, 0.45, this.lookTarget);
    this.camera.setTarget(this.lookTarget);
    this.camera.rotation.z = this.effects.roll; this.camera.fov = this.effects.fov;
  }
  /** Future target lock can supply a blended look point without parenting the camera. */
  setLockTarget(target: Vector3 | null): void { this.lockTarget = target; }
}
