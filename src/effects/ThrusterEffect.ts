import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Short-lived additive exhaust sprites, with a soft shutdown and local light. */
export class ThrusterEffect {
  readonly positions = [Vector3.Zero(), Vector3.Zero()];
  readonly directions = [Vector3.Down(), Vector3.Down()];
  power = 0;
  private readonly jets: ParticleSystem[] = [];
  private readonly lights: PointLight[] = [];
  private clock = 0;
  constructor(scene: Scene, private readonly outlets: TransformNode[]) {
    const texture = new DynamicTexture('soft exhaust flame', 64, scene, false);
    const ctx = texture.getContext(); const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.2,'rgba(220,240,255,.95)'); gradient.addColorStop(.55,'rgba(125,190,255,.35)'); gradient.addColorStop(1,'rgba(80,130,255,0)');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64); texture.update();
    for (let i=0; i<outlets.length; i++) {
      const jet = new ParticleSystem(`hot exhaust ${i}`, 180, scene);
      jet.particleTexture=texture; jet.emitter=this.positions[i];
      jet.minEmitBox.set(-.04,-.04,-.04); jet.maxEmitBox.set(.04,.04,.04);
      jet.color1=new Color4(.4,.9,1.4,1); jet.color2=new Color4(.15,.4,.85,.65); jet.colorDead=new Color4(.15,.3,.5,0);
      jet.billboardMode=ParticleSystem.BILLBOARDMODE_STRETCHED;
      jet.minScaleX=.45; jet.maxScaleX=.7; jet.minScaleY=1.8; jet.maxScaleY=3.2;
      jet.minSize=.06; jet.maxSize=.13; jet.addSizeGradient(0,.7); jet.addSizeGradient(.4,1.3); jet.addSizeGradient(1,.2);
      jet.minLifeTime=.06; jet.maxLifeTime=.16; jet.minEmitPower=8; jet.maxEmitPower=16; jet.emitRate=0;
      jet.blendMode=ParticleSystem.BLENDMODE_ADD; jet.updateSpeed=.01; jet.start(); this.jets.push(jet);
      const light=new PointLight(`exhaust bounce ${i}`,Vector3.Zero(),scene); light.diffuse=new Color3(.35,.65,1); light.range=4; light.intensity=0; this.lights.push(light);
    }
    // Sun + skylight + three fires + two jets must all reach the PBR shader.
    for (const material of scene.materials) if (material instanceof PBRMaterial) material.maxSimultaneousLights=8;
  }
  update(dt: number, target: number, _ascending: boolean): void {
    this.clock+=dt; this.power+=(target-this.power)*(1-Math.exp(-dt*(target>this.power?24:8)));
    for (let i=0; i<this.outlets.length; i++) {
      const outlet=this.outlets[i]; outlet.computeWorldMatrix(true); this.positions[i].copyFrom(outlet.getAbsolutePosition());
      const dir=this.directions[i];
      Vector3.TransformNormalToRef(Vector3.DownReadOnly,outlet.getWorldMatrix(),dir); dir.normalize();
      const jet=this.jets[i]; jet.direction1.copyFrom(dir).addInPlaceFromFloats(-.07,-.07,-.07); jet.direction2.copyFrom(dir).addInPlaceFromFloats(.07,.07,.07);
      jet.emitRate=this.power*350; this.lights[i].position.copyFrom(this.positions[i]); this.lights[i].intensity=this.power*(3+Math.sin(this.clock*39)*.3);
    }
  }
}
