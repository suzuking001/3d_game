import type { Scene } from '@babylonjs/core/scene.js';
import type { MechCamera } from '../camera/MechCamera.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { InputState } from '../input/InputState.js';
import { WeaponSystem, type BeamShot, type WeaponEnergy } from './WeaponSystem.js';
import { BeamCannonView } from './BeamCannonView.js';
import { TrainingTargets } from './TrainingTargets.js';
import { beamPickable, traceBeam } from './BeamTargeting.js';
import { BeamEffect } from '../effects/BeamEffect.js';
import { GameAudio } from '../effects/GameAudio.js';

export class BeamCombat {
  readonly weapon=new WeaponSystem();
  readonly targets:TrainingTargets;
  private readonly cannon:BeamCannonView;
  private readonly effect:BeamEffect;
  private readonly pending:BeamShot[]=[];
  private readonly hud:HTMLElement;
  private readonly status:HTMLElement;
  private readonly meter:HTMLElement;
  private readonly targetLabel:HTMLElement;
  private hitTime=0;
  private readonly audio=new GameAudio();
  private boostQueued=false;
  get flashPower():number {return Math.max(this.effect.flashPower,this.weapon.charge*.25);}
  constructor(private readonly scene:Scene,root:TransformNode) {
    this.targets=new TrainingTargets(scene);this.cannon=new BeamCannonView(scene,root);this.effect=new BeamEffect(scene);
    this.hud=document.createElement('section');this.hud.className='beam-hud';this.hud.setAttribute('aria-label','ビーム兵器');
    this.hud.innerHTML='<div class="beam-title">LANCE / PLASMA CANNON <button class="sound-toggle" aria-pressed="false" aria-label="効果音をミュート">SOUND ON</button></div><strong class="beam-status">READY</strong><div class="beam-meter"><i></i></div><p>左クリック / F：射撃　右クリック / E：溜めて離す</p><p>GAMEPAD: RT 射撃 / LT チャージ</p><div class="beam-target">射撃用ドローン：照準を合わせて撃つ</div>';
    document.querySelector('#hud')!.append(this.hud);this.status=this.hud.querySelector('.beam-status')!;
    this.meter=this.hud.querySelector('i')!;this.targetLabel=this.hud.querySelector('.beam-target')!;
    const sound=this.hud.querySelector<HTMLButtonElement>('.sound-toggle')!;
    sound.addEventListener('click',()=>{const muted=this.audio.toggleMute();sound.textContent=muted?'SOUND OFF':'SOUND ON';sound.setAttribute('aria-pressed',String(muted));});
  }
  simulate(dt:number,input:InputState,energy:WeaponEnergy):void {
    if(input.resetPressed)this.reset();
    this.targets.update(dt);const shot=this.weapon.update(dt,input,energy);if(shot)this.pending.push(shot);
    if(input.combatCancelled)this.pending.length=0;
  }
  reset():void {this.weapon.reset();this.targets.reset();this.pending.length=0;this.effect.reset();this.hitTime=0;this.boostQueued=false;}
  boostStarted():void {this.boostQueued=true;}
  armorHit(broken:boolean):void {this.audio.armorHit(broken);}
  render(dt:number,camera:MechCamera,thrust=0):void {
    camera.camera.getViewMatrix(true);
    const ray=camera.camera.getForwardRay(300),aim=this.scene.pickWithRay(ray,beamPickable);
    const point=aim?.pickedPoint??ray.origin.add(ray.direction.scale(300));
    this.cannon.update(point,this.weapon.charge,this.weapon.recoil);
    const muzzle=this.cannon.muzzle.getAbsolutePosition().clone();
    this.effect.update(dt,muzzle,point.subtract(muzzle).normalize(),this.weapon.charge);
    this.audio.update(this.weapon.charge,thrust);
    if(this.boostQueued){this.audio.boostBurst();this.boostQueued=false;}
    this.hitTime=Math.max(0,this.hitTime-dt);
    for(const shot of this.pending) {
      const hit=traceBeam(this.scene,ray,muzzle,shot.range);
      const killed=hit.targetId!==undefined&&this.targets.hit(hit.targetId,shot.damage);
      if(hit.targetId!==undefined)this.hitTime=.35;
      this.effect.trigger(muzzle,hit.point,hit.normal,shot,!!hit.hit?.hit,killed);
      this.audio.fire(shot.power);
      camera.effects.kick(shot.charged?.32:.07);
    }
    this.pending.length=0;
    const charge=this.weapon.charge;
    this.status.textContent=charge>=.8?'OVERCHARGE / RELEASE':charge>0?`CHARGING ${Math.round(charge*100)}%`:this.weapon.cooldown>0?'COOLING':'READY';
    this.meter.style.width=`${charge*100}%`;this.hud.classList.toggle('charged',charge>=.8);
    const id=aim?.pickedMesh?.metadata?.trainingId as number|undefined;
    this.targetLabel.textContent=id!==undefined?`DRONE ${id+1} / HP ${Math.ceil(this.targets.targets[id].health.health)} / DESTROYED ${this.targets.kills}`:`DESTROYED ${this.targets.kills} / 射撃用ドローンは7秒で再出現`;
    const reticle=document.querySelector<HTMLElement>('.camera-point');
    reticle?.classList.toggle('target-acquired',id!==undefined);reticle?.classList.toggle('beam-hit',this.hitTime>0);
  }
  dispose():void {this.audio.dispose();this.hud.remove();}
}
