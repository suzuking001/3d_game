import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** A compact articulated shoulder cannon; local +Z is the firing direction. */
export class BeamCannonView {
  readonly muzzle: TransformNode;
  private readonly pivot: TransformNode;
  private readonly barrel: TransformNode;
  private readonly glow: PBRMaterial;
  private readonly inverse = Matrix.Identity();
  constructor(scene: Scene, private readonly wearer: TransformNode) {
    this.pivot = new TransformNode('beam cannon gimbal', scene); this.pivot.parent = wearer;
    this.pivot.position.set(.72, .15, -.1);
    this.barrel = new TransformNode('beam cannon recoil carriage', scene); this.barrel.parent = this.pivot;
    const metal = new PBRMaterial('beam cannon titanium', scene);
    metal.albedoColor.set(.14,.17,.2); metal.metallic=.9; metal.roughness=.34; metal.maxSimultaneousLights=8;
    this.glow = new PBRMaterial('beam cannon capacitors', scene);
    this.glow.albedoColor.set(.04,.16,.24); this.glow.emissiveColor.set(.1,.8,1.6); this.glow.metallic=.6; this.glow.roughness=.25;
    for (let i=0;i<4;i++) {
      const body = MeshBuilder.CreateCylinder('segmented beam barrel', {height:i===0?.8:.13,diameter:i===0?.3:.39,tessellation:24},scene);
      body.parent=this.barrel; body.rotation.x=Math.PI/2; body.position.z=i===0?.32:.16+i*.22;
      body.material=metal; body.isPickable=false; body.receiveShadows=true;
      if (i>0) {
        const coil=MeshBuilder.CreateTorus('charged induction ring',{diameter:.33,thickness:.035,tessellation:24},scene);
        coil.parent=this.barrel; coil.rotation.x=Math.PI/2; coil.position.z=body.position.z+.07; coil.material=this.glow; coil.isPickable=false;
      }
    }
    const emitter=MeshBuilder.CreateCylinder('beam aperture',{height:.04,diameter:.19,tessellation:24},scene);
    emitter.parent=this.barrel; emitter.rotation.x=Math.PI/2; emitter.position.z=.87; emitter.material=this.glow; emitter.isPickable=false;
    this.muzzle=new TransformNode('beam muzzle',scene); this.muzzle.parent=this.barrel; this.muzzle.position.z=.91;
  }
  update(aim: Vector3, charge: number, recoil: number): void {
    this.wearer.computeWorldMatrix(true).invertToRef(this.inverse);
    const direction=Vector3.TransformCoordinates(aim,this.inverse).subtract(this.pivot.position).normalize();
    Quaternion.FromUnitVectorsToRef(Vector3.Forward(),direction,this.pivot.rotationQuaternion??=Quaternion.Identity());
    this.barrel.position.z=-Math.min(.23,recoil*.075);
    this.glow.emissiveColor.set(.1+charge*2,.8+charge*3,1.6+charge*4);
    this.muzzle.computeWorldMatrix(true);
  }
}
