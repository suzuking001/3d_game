import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { BeamShot } from '../combat/WeaponSystem.js';

interface Burst { beams:Mesh[]; arc:LinesMesh; points:Vector3[]; flash:Mesh; blast:Mesh; halo:Mesh; rings:Mesh[]; sparks:ParticleSystem; life:number; duration:number; power:number; impact:boolean; }
/** Bounded reusable bursts: white-hot core, plasma envelope, muzzle flare and radial impact ejecta. */
export class BeamEffect {
  private readonly bursts:Burst[]=[];
  private cursor=0;
  private readonly chargeOrb:Mesh;
  private readonly chargeRing:Mesh;
  private readonly light:PointLight;
  private lightLife=0;
  private clock=0;
  flashPower=0;
  constructor(scene:Scene) {
    const texture=new DynamicTexture('beam radial plasma',64,scene,false);
    const ctx=texture.getContext(), gradient=ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.12,'rgba(230,250,255,1)');
    gradient.addColorStop(.38,'rgba(145,200,255,.6)'); gradient.addColorStop(1,'rgba(80,100,255,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);texture.update();
    const material=(name:string,color:Color3,alpha:number,soft=false) => {
      const m=new StandardMaterial(name,scene);m.disableLighting=true;m.emissiveColor=color;m.diffuseColor=color;
      m.alpha=alpha;m.alphaMode=Constants.ALPHA_ADD;m.disableDepthWrite=true;m.backFaceCulling=false;
      if(soft) {m.diffuseTexture=texture;m.opacityTexture=texture;} return m;
    };
    const white=material('beam white hot core',new Color3(7,9,12),1);
    const cyan=material('beam electric plasma',new Color3(.15,1.7,4),.42);
    const violet=material('beam ultraviolet corona',new Color3(1.4,.2,3),.16);
    const soft=material('beam lens flare plasma',new Color3(2,4,8),.8,true);
    const shock=material('beam ion shock front',new Color3(.5,2.2,4),.7);
    const make=(mesh:Mesh,m:StandardMaterial)=>{mesh.material=m;mesh.isPickable=false;mesh.setEnabled(false);return mesh;};
    for(let i=0;i<4;i++) {
      const beams=[white,cyan,violet].map((m,j)=>make(MeshBuilder.CreateCylinder(`beam ${i} layer ${j}`,{height:1,diameter:1,tessellation:16},scene),m));
      const flash=make(MeshBuilder.CreatePlane('beam muzzle star',{size:1},scene),soft);flash.billboardMode=Mesh.BILLBOARDMODE_ALL;
      const blast=make(MeshBuilder.CreateSphere('white impact plasma',{diameter:1,segments:16},scene),white);
      const halo=make(MeshBuilder.CreatePlane('impact bloom halo',{size:1},scene),soft);halo.billboardMode=Mesh.BILLBOARDMODE_ALL;
      const rings=[0,1].map(()=>make(MeshBuilder.CreateTorus('beam shockwave',{diameter:1,thickness:.01,tessellation:48},scene),shock));
      const points=Array.from({length:81},()=>Vector3.Zero());
      const arc=MeshBuilder.CreateLines('beam helical discharge',{points,updatable:true},scene);arc.color.set(.35,2,4);arc.isPickable=false;arc.setEnabled(false);
      const sparks=new ParticleSystem(`beam molten fragments ${i}`,180,scene);sparks.particleTexture=texture;
      sparks.emitter=Vector3.Zero();sparks.emitRate=0;sparks.minEmitBox.setAll(-.06);sparks.maxEmitBox.setAll(.06);
      sparks.direction1.set(-1,-.15,-1);sparks.direction2.set(1,1.7,1);sparks.minEmitPower=8;sparks.maxEmitPower=24;
      sparks.gravity.set(0,-10,0);sparks.minLifeTime=.15;sparks.maxLifeTime=.7;sparks.minSize=.025;sparks.maxSize=.09;
      sparks.color1=new Color4(1.5,.65,.2,1);sparks.color2=new Color4(.25,1,3,1);sparks.colorDead=new Color4(.1,.15,.3,0);
      sparks.billboardMode=ParticleSystem.BILLBOARDMODE_STRETCHED;sparks.minScaleY=2;sparks.maxScaleY=6;
      sparks.blendMode=ParticleSystem.BLENDMODE_ADD;sparks.start();
      this.bursts.push({beams,arc,points,flash,blast,halo,rings,sparks,life:0,duration:1,power:1,impact:false});
    }
    this.chargeOrb=make(MeshBuilder.CreatePlane('beam charging singularity',{size:1},scene),soft);this.chargeOrb.billboardMode=Mesh.BILLBOARDMODE_ALL;
    this.chargeRing=make(MeshBuilder.CreateTorus('beam charging induction vortex',{diameter:1,thickness:.025,tessellation:48},scene),shock);
    this.light=new PointLight('beam plasma bounce',Vector3.Zero(),scene);this.light.diffuse.set(.22,.55,1);this.light.range=14;this.light.intensity=0;
    this.light.renderPriority=1; // Keep transient illumination inside the existing eight-light PBR budget.
  }
  trigger(from:Vector3,to:Vector3,normal:Vector3,shot:BeamShot,impact:boolean,killed:boolean):void {
    const b=this.bursts[this.cursor++%this.bursts.length];b.power=shot.power;b.duration=shot.charged?.8:.32;b.life=b.duration;b.impact=impact;
    const direction=to.subtract(from),length=direction.length(),rotation=Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(),direction.normalize(),rotation);
    const width=.07+shot.power*.055;
    b.beams.forEach((beam,j)=>{beam.setEnabled(true);beam.position.copyFrom(from.add(to).scale(.5));beam.rotationQuaternion=rotation.clone();beam.scaling.set(width*[1,3.6,7][j],length,width*[1,3.6,7][j]);});
    b.flash.position.copyFrom(from);b.flash.setEnabled(true);
    const side=Vector3.Cross(direction,Math.abs(direction.y)>.95?Vector3.Right():Vector3.Up()).normalize(),up=Vector3.Cross(side,direction).normalize();
    for(let i=0;i<b.points.length;i++) {
      const t=i/(b.points.length-1),angle=t*Math.PI*16,radius=Math.sin(t*Math.PI)*width*2;
      b.points[i].copyFrom(from).addInPlace(direction.scale(length*t)).addInPlace(side.scale(Math.cos(angle)*radius)).addInPlace(up.scale(Math.sin(angle)*radius));
    }
    MeshBuilder.CreateLines('beam helical discharge',{points:b.points,instance:b.arc},this.chargeOrb.getScene());b.arc.setEnabled(true);
    b.blast.position.copyFrom(to);b.halo.position.copyFrom(to);b.blast.setEnabled(impact);b.halo.setEnabled(impact);
    const face=Quaternion.Identity();Quaternion.FromUnitVectorsToRef(Vector3.Up(),normal.normalize(),face);
    for(const [i,ring] of b.rings.entries()) {ring.position.copyFrom(i===0?from:to.add(normal.scale(.08)));ring.rotationQuaternion=i===0?rotation.clone():face.clone();ring.setEnabled(i===0||impact);}
    b.power+=killed?1:0;
    if(impact) {(b.sparks.emitter as Vector3).copyFrom(to);b.sparks.manualEmitCount=Math.round((new URLSearchParams(location.search).get('quality')==='low'?18:36)*b.power);}
    this.light.position.copyFrom(impact?to:from);this.lightLife=.4;this.light.intensity=7*shot.power;
    this.flashPower=Math.min(1,shot.power*.3);
    this.animate(b);
  }
  private animate(b:Burst):void {
    const t=1-b.life/b.duration,fade=Math.pow(1-t,1.4);
    for(const [j,beam] of b.beams.entries()) beam.visibility=fade*(j===0?1:.8);
    b.arc.alpha=fade;
    b.flash.scaling.setAll((.8+b.power*.65)*(1+t*2));b.flash.visibility=Math.pow(1-t,4);
    b.blast.scaling.setAll((.12+t*1.6)*b.power);b.blast.visibility=Math.pow(1-t,3);
    b.halo.scaling.setAll((1+t*4)*b.power);b.halo.visibility=fade*.6;
    for(const [i,ring] of b.rings.entries()){ring.scaling.setAll(.3+t*b.power*(i===0?1.3:3));ring.visibility=fade*.75;}
  }
  update(dt:number,muzzle:Vector3,direction:Vector3,charge:number):void {
    this.clock+=dt;
    for(const b of this.bursts) {b.life=Math.max(0,b.life-dt);this.animate(b);if(!b.life)for(const m of [...b.beams,b.arc,b.flash,b.blast,b.halo,...b.rings])m.setEnabled(false);}
    this.flashPower*=Math.exp(-dt*8);
    this.chargeOrb.setEnabled(charge>.01);this.chargeRing.setEnabled(charge>.01);
    this.chargeOrb.position.copyFrom(muzzle);this.chargeRing.position.copyFrom(muzzle);
    const radius=.25+charge*1.5+Math.sin(this.clock*42)*charge*.07;
    this.chargeOrb.scaling.setAll(radius);this.chargeOrb.visibility=.25+charge*.75;
    this.chargeRing.scaling.setAll(radius*.7);Quaternion.FromUnitVectorsToRef(Vector3.Up(),direction,this.chargeRing.rotationQuaternion??=Quaternion.Identity());
    this.lightLife=Math.max(0,this.lightLife-dt);
    if(charge>.01){this.light.position.copyFrom(muzzle);this.light.intensity=charge*5;}else this.light.intensity*=Math.exp(-dt*16);
    if(!this.lightLife&&charge<=.01)this.light.intensity=0;
  }
  reset():void {for(const b of this.bursts){b.life=0;b.sparks.reset();}this.lightLife=this.flashPower=0;}
}
