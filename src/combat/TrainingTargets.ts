import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { TargetHealth } from './TargetHealth.js';

export class TrainingTargets {
  readonly targets: {root:TransformNode; health:TargetHealth}[]=[];
  kills=0;
  constructor(scene:Scene) {
    const armor=new PBRMaterial('drone scorched armor',scene); armor.albedoColor.set(.19,.22,.23); armor.metallic=.85; armor.roughness=.4;
    const core=new PBRMaterial('drone energy heart',scene); core.emissiveColor=new Color3(2,.12,.025); core.albedoColor.set(.2,.03,.01);
    for (const [id,position] of [new Vector3(1.35,1.35,-32),new Vector3(-8,3,-18),new Vector3(9,4,-9)].entries()) {
      const root=new TransformNode(`training drone ${id+1}`,scene); root.position.copyFrom(position);
      const sphere=MeshBuilder.CreateSphere('drone heart',{diameter:.75,segments:16},scene); sphere.parent=root; sphere.material=core;
      for(let i=0;i<3;i++) {
        const ring=MeshBuilder.CreateTorus('drone armored hoop',{diameter:1.35,thickness:.19,tessellation:24},scene);
        ring.parent=root; ring.rotation.set(i===0?Math.PI/2:0,i===1?Math.PI/2:0,0); ring.material=armor; ring.receiveShadows=true;
      }
      for(const mesh of root.getChildMeshes()) { mesh.metadata={trainingId:id}; mesh.isPickable=true; }
      this.targets.push({root,health:new TargetHealth()});
    }
  }
  update(dt:number):void { for(const target of this.targets) { target.health.update(dt); target.root.setEnabled(target.health.alive); } }
  hit(id:number,damage:number):boolean {
    const target=this.targets[id]; if(!target) return false;
    const killed=target.health.damage(damage); if(killed) { this.kills++; target.root.setEnabled(false); } return killed;
  }
  reset():void { this.kills=0; for(const t of this.targets) {t.health.reset();t.root.setEnabled(true);} }
}
