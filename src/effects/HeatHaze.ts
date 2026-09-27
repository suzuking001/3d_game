import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess.js';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore.js';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Camera } from '@babylonjs/core/Cameras/camera.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ThrusterEffect } from './ThrusterEffect.js';

// Local refractive turbulence: the scene behind each hot jet bends, foreground geometry stays sharp.
ShaderStore.ShadersStore.warriorHeatPixelShader = `precision highp float;
varying vec2 vUV; uniform sampler2D textureSampler; uniform sampler2D depthSampler;
uniform vec4 plume0; uniform vec4 plume1; uniform vec4 heat;
float mask(vec4 p) { vec2 q=(vUV-p.xy)/max(p.zw,vec2(.0001)); return exp(-dot(q,q)*2.5); }
void main() {
 float depth=texture2D(depthSampler,vUV).r;
 float visible=step(heat.w-.00001,depth);
 float strength=max(mask(plume0),mask(plume1))*heat.y*visible;
 vec2 wave=vec2(sin(vUV.y*310.+heat.x*17.+sin(vUV.x*150.)),cos(vUV.x*260.-heat.x*13.));
 vec2 offset=wave*vec2(.0007,.0011)*strength;
 gl_FragColor=texture2D(textureSampler,clamp(vUV+offset,vec2(.001),vec2(.999)));
}`;
ShaderStore.ShadersStoreWGSL.warriorHeatPixelShader = `varying vUV: vec2f;
var textureSamplerSampler: sampler; var textureSampler: texture_2d<f32>;
var depthSamplerSampler: sampler; var depthSampler: texture_2d<f32>;
uniform plume0: vec4f; uniform plume1: vec4f; uniform heat: vec4f;
fn mask(p: vec4f, uv: vec2f)->f32 { let q=(uv-p.xy)/max(p.zw,vec2f(.0001)); return exp(-dot(q,q)*2.5); }
@fragment fn main(input: FragmentInputs)->FragmentOutputs {
 let depth=textureSample(depthSampler,depthSamplerSampler,input.vUV).r;
 let visible=step(uniforms.heat.w-.00001,depth);
 let strength=max(mask(uniforms.plume0,input.vUV),mask(uniforms.plume1,input.vUV))*uniforms.heat.y*visible;
 let wave=vec2f(sin(input.vUV.y*310.+uniforms.heat.x*17.+sin(input.vUV.x*150.)),cos(input.vUV.x*260.-uniforms.heat.x*13.));
 let offset=wave*vec2f(.0007,.0011)*strength;
 fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,clamp(input.vUV+offset,vec2f(.001),vec2f(.999)));
}`;
export class HeatHaze {
  private time = 0;
  private source?: ThrusterEffect;
  constructor(scene: Scene, camera: Camera) {
    const depth = scene.enableDepthRenderer(camera, false, false).getDepthMap();
    const pass = new PostProcess('warrior exhaust refraction','warriorHeat', {
      size: 1, camera, engine: scene.getEngine(), uniforms: ['plume0','plume1','heat'], samplers: ['depthSampler'],
      shaderLanguage: scene.getEngine().isWebGPU ? ShaderLanguage.WGSL : ShaderLanguage.GLSL,
    });
    pass.onApply = effect => {
      effect.setTexture('depthSampler',depth);
      const source=this.source;
      let closest=1;
      for (let i=0;i<2;i++) {
        if (!source) { effect.setFloat4(`plume${i}`, -2,-2,.001,.001); continue; }
        const point=source.positions[i].add(source.directions[i].scale(.65));
        const engine=scene.getEngine(), viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
        const p=Vector3.Project(point,Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
        const z=Vector3.TransformCoordinates(point,camera.getViewMatrix()).z;
        const radius=Math.min(.10,.5/Math.max(2,z));
        effect.setFloat4(`plume${i}`,p.x/engine.getRenderWidth(),1-p.y/engine.getRenderHeight(),radius*.55,radius);
        closest=Math.min(closest,z/(camera.maxZ-camera.minZ));
      }
      effect.setFloat4('heat',this.time,source?.power??0,0,closest);
    };
  }
  update(dt: number, source: ThrusterEffect): void { this.time+=dt; this.source=source; }
}
