import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion,Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TrainingTargets } from './TrainingTargets.js';
import { beamPickable } from './BeamTargeting.js';
import { intersectArmorSegment,armorRadii,hullRadii } from './ArmorIntersection.js';

interface Bolt {mesh:Mesh;position:Vector3;velocity:Vector3;remaining:number;active:boolean;}
/** Static-world occlusion is traced once at launch; fixed-step relative sweeps cannot tunnel through armor. */
export class IncomingFire {
  enabled=true;
  private timers=[3,4.1,5.2];
  private readonly bolts:Bolt[]=[];
  constructor(private readonly scene:Scene,private readonly targets:TrainingTargets) {
    const plasma=new StandardMaterial('incoming amber plasma',scene);plasma.disableLighting=true;plasma.emissiveColor=new Color3(6,1.5,.3);
    for(let i=0;i<12;i++) {
      const mesh=MeshBuilder.CreateCylinder('drone plasma bolt',{height:.8,diameter:.09,tessellation:8},scene);mesh.material=plasma;mesh.isPickable=false;mesh.setEnabled(false);
      this.bolts.push({mesh,position:Vector3.Zero(),velocity:Vector3.Zero(),remaining:0,active:false});
    }
  }
  reset():void {this.timers=[3,4.1,5.2];for(const b of this.bolts){b.active=false;b.mesh.setEnabled(false);}}
  update(dt:number,previous:Vector3,current:Vector3,armored:()=>boolean,hit:(offset:Vector3,damage:number)=>void):void {
    if(!this.enabled)return;
    const center=current.add(new Vector3(0,.12,0)),previousCenter=previous.add(new Vector3(0,.12,0));
    for(const [i,target] of this.targets.targets.entries()) {
      this.timers[i]-=dt;
      if(this.timers[i]>0)continue;this.timers[i]=2.6+i*.25;
      if(!target.health.alive)continue;
      const origin=target.root.position,direction=center.subtract(origin),distance=direction.length();
      if(distance>85||distance<2)continue;direction.normalize();
      const obstacle=this.scene.pickWithRay(new Ray(origin,direction,distance+4),mesh=>beamPickable(mesh)&&mesh.metadata?.trainingId===undefined);
      if(obstacle?.hit&&obstacle.distance<distance-(armored()?1.25:.7))continue;
      const bolt=this.bolts.find(b=>!b.active);if(!bolt)continue;
      bolt.position.copyFrom(origin);bolt.velocity.copyFrom(direction.scale(46));bolt.remaining=obstacle?.hit?obstacle.distance:90;bolt.active=true;
      bolt.mesh.rotationQuaternion=Quaternion.Identity();Quaternion.FromUnitVectorsToRef(Vector3.Up(),direction,bolt.mesh.rotationQuaternion);bolt.mesh.setEnabled(true);
    }
    for(const bolt of this.bolts) {
      if(!bolt.active)continue;
      const start=bolt.position.clone(),travel=Math.min(dt*46,bolt.remaining),end=start.add(bolt.velocity.scale(travel/46));
      const fraction=intersectArmorSegment(start.subtract(previousCenter),end.subtract(center),armored()?armorRadii:hullRadii);
      if(fraction!==null) {
        const contact=Vector3.Lerp(start,end,fraction),wearer=Vector3.Lerp(previousCenter,center,fraction);
        hit(contact.subtract(wearer),34);bolt.active=false;
      }
      bolt.position.copyFrom(end);bolt.remaining-=travel;
      if(bolt.remaining<=1e-8)bolt.active=false;
      bolt.mesh.position.copyFrom(bolt.position);bolt.mesh.setEnabled(bolt.active);
    }
  }
  toggle():boolean {this.enabled=!this.enabled;this.reset();return this.enabled;}
}
