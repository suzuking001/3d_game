import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { MechCamera } from '../camera/MechCamera.js';
import type { TrainingTargets } from './TrainingTargets.js';
import { EnergyArmor } from './EnergyArmor.js';
import { IncomingFire } from './IncomingFire.js';
import { EnergyArmorEffect } from '../effects/EnergyArmorEffect.js';

export class ArmorCombat {
  readonly armor=new EnergyArmor();
  private readonly incoming:IncomingFire;
  private readonly effect:EnergyArmorEffect;
  private readonly hud:HTMLElement;
  private readonly status:HTMLElement;
  private readonly capacity:HTMLElement;
  private readonly hull:HTMLElement;
  private readonly meter:HTMLElement;
  private readonly hits:{offset:Vector3;broke:boolean;absorbed:boolean}[]=[];
  private reformPending=false;
  private shake=0;
  constructor(scene:Scene,root:TransformNode,camera:MechCamera,targets:TrainingTargets,private readonly hitSound:(broken:boolean)=>void) {
    this.incoming=new IncomingFire(scene,targets);this.effect=new EnergyArmorEffect(scene,root,camera.camera);
    this.hud=document.createElement('section');this.hud.className='armor-hud';this.hud.setAttribute('aria-label','エネルギー装甲');
    this.hud.innerHTML='<div class="armor-heading">PA / AEGIS FIELD <button class="incoming-toggle" aria-pressed="true">迎撃 ON</button></div><div class="armor-readout"><strong class="armor-state">STABLE</strong><span class="armor-capacity">200 / 200</span></div><div class="armor-meter"><i></i></div><div class="armor-hull">AP <b>1000</b> / 1000</div><p>被弾で減衰・無被弾で回復 / 崩壊中は防御停止</p>';
    document.querySelector('#hud')!.append(this.hud);this.status=this.hud.querySelector('.armor-state')!;this.capacity=this.hud.querySelector('.armor-capacity')!;this.hull=this.hud.querySelector('b')!;this.meter=this.hud.querySelector('i')!;
    const button=this.hud.querySelector<HTMLButtonElement>('.incoming-toggle')!;
    button.addEventListener('click',()=>{const on=this.incoming.toggle();button.textContent=on?'迎撃 ON':'迎撃 OFF';button.setAttribute('aria-pressed',String(on));});
  }
  simulate(dt:number,previous:Vector3,current:Vector3):void {
    this.armor.update(dt);this.reformPending ||= this.armor.reforming;
    if(this.armor.hull<=0){this.incoming.reset();return;}
    this.incoming.update(dt,previous,current,()=>this.armor.active,(offset,damage)=>{
      const result=this.armor.hit(damage);this.hits.push({offset,broke:result.broke,absorbed:result.absorbed>0});
      this.shake=Math.max(this.shake,result.broke?.22:.04);
    });
  }
  reset():void {this.armor.reset();this.incoming.reset();this.effect.reset();this.hits.length=0;this.shake=0;this.reformPending=false;}
  render(dt:number,camera:MechCamera):void {
    this.effect.update(dt,this.armor,camera.camera);
    for(const hit of this.hits) {
      this.effect.hit(hit.offset,hit.broke,hit.absorbed);
      this.hitSound(hit.broke||!hit.absorbed);
    }
    if(this.reformPending)this.effect.reform();
    if(this.hits.length||this.reformPending)this.effect.update(0,this.armor,camera.camera);
    this.hits.length=0;this.reformPending=false;
    if(this.shake){camera.effects.kick(this.shake);this.shake=0;}
    const a=this.armor;
    this.status.textContent=a.hull<=0?'SYSTEM DOWN / R':a.collapsed?'FIELD COLLAPSED':a.recoveryDelay>0?'UNDER PRESSURE':a.integrity<a.maxIntegrity?'REGENERATING':'STABLE';
    this.capacity.textContent=`${Math.ceil(a.integrity)} / ${a.maxIntegrity}`;this.hull.textContent=Math.ceil(a.hull).toString();this.meter.style.width=`${a.integrity/a.maxIntegrity*100}%`;
    this.hud.classList.toggle('collapsed',a.collapsed);this.hud.classList.toggle('critical',a.hull<250);
  }
  dispose():void {this.hud.remove();}
}
