import './ArmorShader.js';
import { Matrix, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Camera } from '@babylonjs/core/Cameras/camera.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { EnergyArmor } from '../combat/EnergyArmor.js';
import { armorRadii } from '../combat/ArmorIntersection.js';

/** A subtle refractive field, with surface-local impact waves rather than an opaque bubble. */
export class EnergyArmorEffect {
  private readonly mesh:Mesh;
  private readonly material:ShaderMaterial;
  private readonly hits=Array.from({length:4},()=>new Vector4(0,1,0,10));
  private cursor=0;
  private clock=0;
  private burst=0;
  private collapse=0;
  private strength=1;
  private readonly sparks:ParticleSystem;
  private readonly mist:ParticleSystem;
  private scatter=false;
  private readonly light:PointLight;
  constructor(scene:Scene,root:TransformNode,camera:Camera) {
    const language=scene.getEngine().isWebGPU?ShaderLanguage.WGSL:ShaderLanguage.GLSL;
    this.material=new ShaderMaterial('AEGIS interference plasma',scene,'aegis',{
      attributes:['position','normal'],uniforms:['world','worldViewProjection','radii','eye','field','hit0','hit1','hit2','hit3'],needAlphaBlending:true,shaderLanguage:language,
    });
    this.material.alphaMode=Constants.ALPHA_ADD;this.material.disableDepthWrite=true;this.material.backFaceCulling=false;this.material.setVector3('radii',armorRadii);
    this.mesh=MeshBuilder.CreateSphere('AEGIS energy armor',{diameter:2,segments:40},scene);this.mesh.parent=root;this.mesh.position.y=.12;this.mesh.scaling.copyFrom(armorRadii);
    this.mesh.material=this.material;this.mesh.isPickable=false;
    const texture=new DynamicTexture('armor ion spark',32,scene,false),ctx=texture.getContext(),g=ctx.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(170,255,225,.9)');g.addColorStop(1,'rgba(40,180,150,0)');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);texture.update();
    this.sparks=new ParticleSystem('armor corona discharge',96,scene);this.sparks.particleTexture=texture;this.sparks.emitter=Vector3.Zero();this.sparks.emitRate=0;
    this.sparks.minEmitBox.setAll(-.03);this.sparks.maxEmitBox.setAll(.03);this.sparks.minSize=.018;this.sparks.maxSize=.065;
    this.sparks.minLifeTime=.12;this.sparks.maxLifeTime=.45;this.sparks.minEmitPower=2;this.sparks.maxEmitPower=8;
    this.sparks.color1=new Color4(.5,2,1.4,1);this.sparks.color2=new Color4(2,1.6,.6,1);this.sparks.colorDead=new Color4(.1,.5,.4,0);
    this.sparks.gravity.set(0,-2,0);this.sparks.billboardMode=ParticleSystem.BILLBOARDMODE_STRETCHED;this.sparks.minScaleY=2;this.sparks.maxScaleY=4;this.sparks.blendMode=ParticleSystem.BLENDMODE_ADD;this.sparks.start();
    this.sparks.startPositionFunction=(_matrix,point)=>{
      if(this.scatter){point.set(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1);point.normalize().multiplyInPlace(armorRadii).addInPlace(this.mesh.getAbsolutePosition());}
      else point.copyFrom(this.sparks.emitter as Vector3).addInPlaceFromFloats((Math.random()-.5)*.05,(Math.random()-.5)*.05,(Math.random()-.5)*.05);
    };
    this.mist=new ParticleSystem('armor suspended ions',48,scene);this.mist.particleTexture=texture;this.mist.emitter=Vector3.Zero();this.mist.emitRate=12;
    this.mist.minSize=.025;this.mist.maxSize=.06;this.mist.minLifeTime=.2;this.mist.maxLifeTime=.65;this.mist.minEmitPower=.02;this.mist.maxEmitPower=.15;
    this.mist.direction1.set(-.2,.1,-.2);this.mist.direction2.set(.2,.4,.2);this.mist.color1=new Color4(.08,.5,.32,.18);this.mist.color2=new Color4(.1,.3,.25,.1);this.mist.colorDead=new Color4(0,.1,.07,0);
    this.mist.blendMode=ParticleSystem.BLENDMODE_ADD;this.mist.startPositionFunction=(_matrix,point)=>{
      const local=new Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize();
      Vector3.TransformCoordinatesToRef(local,this.mesh.getWorldMatrix(),point);
    };this.mist.start();
    this.light=new PointLight('armor impact bounce',Vector3.Zero(),scene);this.light.diffuse.set(.35,1,.7);this.light.range=6;this.light.intensity=0;this.light.renderPriority=2;
    this.light.setEnabled(false);
    for(const material of scene.materials)if(material instanceof PBRMaterial)material.maxSimultaneousLights=8;
    const depth=scene.enableDepthRenderer(camera,false,false).getDepthMap();
    const refraction=new PostProcess('AEGIS field refraction','aegisRefraction',{size:1,camera,engine:scene.getEngine(),uniforms:['ellipse','field'],samplers:['depthSampler'],shaderLanguage:language});
    refraction.onApply=effect=>{
      const engine=scene.getEngine(),width=engine.getRenderWidth(),height=engine.getRenderHeight(),viewport=camera.viewport.toGlobal(width,height);
      const center=this.mesh.getAbsolutePosition(),p=Vector3.Project(center,Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
      const top=Vector3.Project(center.add(new Vector3(0,armorRadii.y,0)),Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
      const right=Vector3.Project(center.add(camera.getDirection(Vector3.Right()).scale(armorRadii.x)),Matrix.IdentityReadOnly,scene.getTransformMatrix(),viewport);
      const z=Vector3.TransformCoordinates(center,camera.getViewMatrix()).z;
      effect.setTexture('depthSampler',depth);effect.setFloat4('ellipse',p.x/width,1-p.y/height,Math.abs(right.x-p.x)/width,Math.abs(top.y-p.y)/height);
      effect.setFloat4('field',this.clock,this.strength,this.burst,Math.max(0,z-armorRadii.z)/(camera.maxZ-camera.minZ));
    };
  }
  hit(offset:Vector3,broke:boolean,shield=true):void {
    this.mesh.computeWorldMatrix(true);const inverse=this.mesh.getWorldMatrix().clone().invert();
    if(shield){
      const local=Vector3.TransformNormal(offset,inverse).normalize(),h=this.hits[this.cursor++%this.hits.length];h.set(local.x,local.y,local.z,0);
      this.burst=1;if(broke)this.collapse=1;
    }
    this.scatter=broke&&shield;
    const point=this.mesh.getAbsolutePosition().add(offset);(this.sparks.emitter as Vector3).copyFrom(point);
    const normal=offset.normalizeToNew();this.sparks.direction1.copyFrom(normal).addInPlaceFromFloats(-1,-1,-1);this.sparks.direction2.copyFrom(normal).addInPlaceFromFloats(1,1,1);
    this.sparks.color1=shield?new Color4(.5,2,1.4,1):new Color4(2,.7,.15,1);
    this.sparks.manualEmitCount=broke?90:shield?20:12;this.light.position.copyFrom(point);this.light.intensity=broke?14:7;
    this.light.setEnabled(true);
    const hotMetal=broke||!shield;
    this.light.diffuse.set(hotMetal?1:.35,hotMetal?.65:1,hotMetal?.3:.7);
  }
  reform():void {this.collapse=.65;this.burst=.6;}
  update(dt:number,armor:EnergyArmor,camera:Camera):void {
    this.clock+=dt;this.burst*=Math.exp(-dt*8);this.collapse*=Math.exp(-dt*4);this.light.intensity*=Math.exp(-dt*15);
    this.light.setEnabled(this.light.intensity>.015);
    this.strength=armor.active?(.35+.65*armor.integrity/armor.maxIntegrity):this.collapse;
    this.mesh.computeWorldMatrix(true);
    this.mesh.setEnabled(armor.active||this.collapse>.01);
    this.mist.emitRate=armor.active?12*this.strength:0;
    for(const [i,h] of this.hits.entries()){h.w+=dt;this.material.setVector4(`hit${i}`,h);}
    this.material.setVector3('eye',camera.position);this.material.setVector4('field',new Vector4(this.clock,this.strength,this.collapse,0));
  }
  reset():void {for(const h of this.hits)h.w=10;this.burst=this.collapse=0;this.sparks.reset();this.mist.reset();this.light.intensity=0;this.light.setEnabled(false);}
}
