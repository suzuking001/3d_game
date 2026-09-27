import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';
export class Atmosphere {
  private readonly lights: PointLight[] = [];
  private clock = 0;
  constructor(scene: Scene) {
    const smokeTexture = new DynamicTexture('soft smoke density', 128, scene, false);
    const ctx = smokeTexture.getContext();
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.6)'); gradient.addColorStop(0.35, 'rgba(230,230,230,0.35)');
    gradient.addColorStop(1, 'rgba(180,180,180,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); smokeTexture.update();
    const sources = [new Vector3(-16, 1.7, -27), new Vector3(17, 1.7, 3), new Vector3(-19, 1.7, 85)];
    for (let index = 0; index < sources.length; index++) {
      const emitter = sources[index];
      const smoke = new ParticleSystem(`rising smoke ${index}`, graphicsConfig.smokeParticles, scene);
      smoke.particleTexture = smokeTexture; smoke.emitter = emitter;
      smoke.minEmitBox.set(-0.7, 0, -0.7); smoke.maxEmitBox.set(0.7, 0.2, 0.7);
      smoke.direction1.set(-0.3, 1.1, -0.2); smoke.direction2.set(0.6, 2.2, 0.3);
      smoke.color1 = new Color4(0.22, 0.22, 0.2, 0.35); smoke.color2 = new Color4(0.36, 0.34, 0.3, 0.2);
      smoke.colorDead = new Color4(0.35, 0.35, 0.33, 0); smoke.minSize = 1.5; smoke.maxSize = 4;
      smoke.addSizeGradient(0, 0.6); smoke.addSizeGradient(0.8, 4); smoke.addSizeGradient(1, 5);
      smoke.minLifeTime = 8; smoke.maxLifeTime = 15; smoke.emitRate = 10;
      smoke.minEmitPower = 1; smoke.maxEmitPower = 1.5; smoke.updateSpeed = 0.01;
      smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      smoke.preWarmCycles = 160; smoke.preWarmStepOffset = 6; smoke.start();
      const fire = new ParticleSystem(`embers ${index}`, 80, scene); fire.particleTexture = smokeTexture; fire.emitter = emitter;
      fire.direction1.set(-0.4, 1, -0.4); fire.direction2.set(0.5, 3, 0.5);
      fire.color1 = new Color4(2.5, 0.6, 0.1, 0.9); fire.color2 = new Color4(1.2, 0.2, 0.02, 0.7); fire.colorDead = new Color4(0.1, 0.05, 0, 0);
      fire.minSize = 0.06; fire.maxSize = 0.24; fire.minLifeTime = 0.8; fire.maxLifeTime = 2;
      fire.emitRate = 25; fire.minEmitPower = 0.5; fire.maxEmitPower = 2; fire.blendMode = ParticleSystem.BLENDMODE_ADD; fire.start();
      const light = new PointLight(`fire bounce ${index}`, emitter, scene);
      light.diffuse = new Color3(1, 0.32, 0.08); light.intensity = 3; light.range = 9; this.lights.push(light);
    }
    const ash = new ParticleSystem('windborne ash', graphicsConfig.ashParticles, scene);
    ash.particleTexture = smokeTexture; ash.emitter = new Vector3(0, 16, -30);
    ash.minEmitBox.set(-65, -8, -120); ash.maxEmitBox.set(65, 24, 120);
    ash.direction1.set(-0.7, -0.2, -0.2); ash.direction2.set(0.2, -0.7, 0.5);
    ash.color1 = new Color4(0.72, 0.69, 0.62, 0.35); ash.color2 = new Color4(0.42, 0.43, 0.4, 0.3); ash.colorDead = new Color4(0.4, 0.4, 0.4, 0);
    ash.minSize = 0.03; ash.maxSize = 0.12; ash.minLifeTime = 5; ash.maxLifeTime = 12;
    ash.emitRate = 55; ash.minEmitPower = 0.6; ash.maxEmitPower = 1.4;
    ash.blendMode = ParticleSystem.BLENDMODE_STANDARD; ash.preWarmCycles = 60; ash.start();
  }
  update(dt: number): void {
    this.clock += dt;
    for (let i = 0; i < this.lights.length; i++) this.lights[i].intensity = 2.5 + Math.sin(this.clock * 7 + i) * 0.3 + Math.sin(this.clock * 17 + i * 3) * 0.2;
  }
}
