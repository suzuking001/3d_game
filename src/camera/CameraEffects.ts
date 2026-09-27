import { cameraConfig } from '../config/CameraConfig.js';
export class CameraEffects {
  fov = cameraConfig.normalFov * Math.PI / 180;
  roll = 0;
  shake = 0;
  private clock = 0;
  shakeX = 0;
  shakeY = 0;
  kick(strength: number): void { this.shake = Math.max(this.shake, strength); }
  update(dt: number, fovKick: number, lateral: number): void {
    const target = (cameraConfig.normalFov + fovKick) * Math.PI / 180;
    const rate = target > this.fov ? cameraConfig.fovAttack : cameraConfig.fovRelease;
    this.fov += (target - this.fov) * (1 - Math.exp(-rate * dt));
    this.roll += (lateral * cameraConfig.rollStrength - this.roll) * (1 - Math.exp(-10 * dt));
    this.clock += dt; this.shake *= Math.exp(-cameraConfig.shakeDecay * dt);
    this.shakeX = Math.sin(this.clock * 113) * this.shake;
    this.shakeY = Math.sin(this.clock * 137) * this.shake;
  }
}
