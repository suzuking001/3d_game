import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { createInputState } from '../src/input/InputState.js';
import { WeaponSystem } from '../src/combat/WeaponSystem.js';
import { TargetHealth } from '../src/combat/TargetHealth.js';
import { traceBeam } from '../src/combat/BeamTargeting.js';
import { BeamCannonView } from '../src/combat/BeamCannonView.js';
import { EnergySystem } from '../src/player/EnergySystem.js';
import { mechConfig } from '../src/config/MechConfig.js';
import { TimeManager } from '../src/core/TimeManager.js';

test('Beam: fixed-step cadence is identical at 30, 60 and 144 render fps',()=>{
  const counts=[30,60,144].map(fps=>{
    const weapon=new WeaponSystem(),input=createInputState(),clock=new TimeManager();input.fireHeld=true;
    for(let i=0;i<fps*2;i++)clock.advance(1/fps,dt=>weapon.update(dt,input,{spend:()=>true}));
    return weapon.shots;
  });
  assert.equal(counts[0],8);assert.deepEqual(counts,[8,8,8]);
});
test('Beam: a full charge is capped, consumes 30 energy and releases once',()=>{
  const weapon=new WeaponSystem(),input=createInputState(),energy=new EnergySystem({...mechConfig});input.chargeHeld=true;
  for(let i=0;i<240;i++)assert.equal(weapon.update(1/120,input,energy),null);
  assert.equal(weapon.charge,1);assert.equal(energy.currentEnergy,100);
  input.chargeHeld=false;input.chargeReleased=true;const shot=weapon.update(1/120,input,energy);
  assert.equal(shot?.charged,true);assert.equal(shot?.damage,160);assert.equal(energy.currentEnergy,70);
  assert.equal(weapon.update(1/120,input,energy),null);assert.equal(weapon.shots,1);
});
test('Beam: empty energy denies firing; focus loss cancels an armed charge',()=>{
  const weapon=new WeaponSystem(),input=createInputState();input.firePressed=true;
  assert.equal(weapon.update(.1,input,{spend:()=>false}),null);assert.equal(weapon.shots,0);
  input.firePressed=false;input.chargeHeld=true;weapon.update(.6,input,{spend:()=>true});
  input.combatCancelled=true;weapon.update(.01,input,{spend:()=>true});
  input.combatCancelled=false;input.chargeHeld=false;input.chargeReleased=true;
  assert.equal(weapon.update(.01,input,{spend:()=>true}),null);assert.equal(weapon.charge,0);
});
test('Beam: four standard hits destroy a drone; it respawns after seven seconds',()=>{
  const health=new TargetHealth();for(let i=0;i<3;i++)assert.equal(health.damage(28),false);
  assert.equal(health.health,16);assert.equal(health.damage(28),true);assert.equal(health.damage(160),false);
  health.update(6.9);assert.equal(health.alive,false);health.update(.1);assert.equal(health.health,100);
});
test('Beam: muzzle trace hits intervening cover even when the reticle sees a target',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    const target=MeshBuilder.CreateBox('target',{size:2},scene);target.material=new StandardMaterial('solid',scene);target.position.z=10;target.metadata={trainingId:0};target.computeWorldMatrix(true);
    const ray=new Ray(new Vector3(0,0,-10),Vector3.Forward(),100),muzzle=new Vector3(2,0,0);
    assert.equal(traceBeam(scene,ray,muzzle,100).targetId,0);
    const wall=MeshBuilder.CreateBox('cover',{width:.7,height:3,depth:.5},scene);wall.material=target.material;wall.position.set(1,0,5);wall.computeWorldMatrix(true);
    const hit=traceBeam(scene,ray,muzzle,100);assert.equal(hit.hit?.pickedMesh,wall);assert.equal(hit.targetId,undefined);
    assert.ok(hit.point.z<6);
  }finally{scene.dispose();engine.dispose();}
});
test('Beam: excludes self/effects and respects maximum range',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    const self=MeshBuilder.CreateBox('avatar',{size:2},scene);self.position.z=3;self.isPickable=false;self.computeWorldMatrix(true);
    const ray=new Ray(Vector3.Zero(),Vector3.Forward(),12);
    const hit=traceBeam(scene,ray,Vector3.Zero(),12);assert.equal(hit.hit?.hit,false);assert.equal(hit.point.z,12);
  }finally{scene.dispose();engine.dispose();}
});
test('Beam: the articulated barrel points toward the world target after wearer rotation',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    const wearer=new TransformNode('animated shoulder',scene);wearer.position.set(3,4,-8);wearer.rotation.y=.7;
    const cannon=new BeamCannonView(scene,wearer),aim=new Vector3(-10,7,25);cannon.update(aim,.9,2);
    const forward=Vector3.TransformNormal(Vector3.Forward(),cannon.muzzle.getWorldMatrix()).normalize();
    assert.ok(Vector3.Dot(forward,aim.subtract(cannon.muzzle.getAbsolutePosition()).normalize())>.9999);
  }finally{scene.dispose();engine.dispose();}
});
