import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {EnergyArmor} from '../src/combat/EnergyArmor.js';
import {intersectArmorSegment,armorRadii} from '../src/combat/ArmorIntersection.js';
import {TrainingTargets} from '../src/combat/TrainingTargets.js';
import {IncomingFire} from '../src/combat/IncomingFire.js';

test('Armor: absorbs 94 percent and passes overflow to the hull when it collapses',()=>{
  const armor=new EnergyArmor(),first=armor.hit(100);
  assert.equal(first.absorbed,94);assert.equal(first.hullDamage,6);assert.equal(armor.integrity,106);assert.equal(armor.hull,994);
  const second=armor.hit(200);assert.equal(second.absorbed,106);assert.equal(second.hullDamage,94);assert.equal(second.broke,true);assert.equal(armor.active,false);
  const third=armor.hit(20);assert.equal(third.absorbed,0);assert.equal(third.hullDamage,20);assert.equal(third.broke,false);
});
test('Armor: waits four seconds after collapse and reforms only after reaching 50 integrity',()=>{
  const armor=new EnergyArmor();armor.hit(300);armor.update(4);assert.equal(armor.integrity,0);
  armor.update(1.5);assert.equal(armor.integrity,48);assert.equal(armor.active,false);
  armor.update(.1);assert.equal(armor.active,true);assert.equal(armor.reforming,true);
  armor.update(.1);assert.equal(armor.reforming,false);
  assert.equal(armor.hull,900); // Regeneration repairs the field, not physical damage.
});
test('Armor: regeneration duration agrees across frame schedules and reset restores both layers',()=>{
  const integrity=[30,60,144].map(hz=>{const a=new EnergyArmor();a.hit(100);for(let i=0;i<hz*4;i++)a.update(1/hz);return a.integrity;});
  assert.ok(Math.max(...integrity)-Math.min(...integrity)<1e-7);
  const a=new EnergyArmor();a.hit(2000);assert.equal(a.active,false);a.update(100);assert.equal(a.active,false);a.reset();assert.equal(a.integrity,200);assert.equal(a.hull,1000);
  assert.equal(a.hit(NaN).absorbed,0);assert.equal(a.hull,1000);
});
test('Armor: a fast projectile and a moving wearer use swept contact instead of tunneling',()=>{
  const fraction=intersectArmorSegment(new Vector3(0,0,30),new Vector3(0,0,-30),armorRadii);
  assert.ok(fraction!==null);assert.ok(Math.abs(fraction-(30-.95)/60)<1e-8);
  assert.equal(intersectArmorSegment(new Vector3(3,0,30),new Vector3(3,0,-30),armorRadii),null);
  const beforeBolt=new Vector3(0,0,1),afterBolt=new Vector3(0,0,1),beforeHero=new Vector3(-5,0,0),afterHero=new Vector3(5,0,0);
  const hit=intersectArmorSegment(beforeBolt.subtract(beforeHero),afterBolt.subtract(afterHero),new Vector3(1.25,2.15,1.2));assert.ok(hit!==null);
});
test('Armor: drone fire reaches the shield but cannot fire through solid cover',()=>{
  for(const covered of [false,true]) {
    const engine=new NullEngine(),scene=new Scene(engine);
    try {
      const targets=new TrainingTargets(scene),fire=new IncomingFire(scene,targets),player=new Vector3(0,1.8,-55);let hits=0;
      if(covered){const wall=MeshBuilder.CreateBox('solid cover',{width:10,height:10,depth:1},scene);wall.position.set(0,3,-40);wall.material=new StandardMaterial('cover',scene);wall.computeWorldMatrix(true);}
      fire.update(3.1,player,player,()=>true,()=>hits++);assert.equal(hits,covered?0:1);
      fire.toggle();fire.update(10,player,player,()=>true,()=>hits++);assert.equal(hits,covered?0:1);
    }finally{scene.dispose();engine.dispose();}
  }
});
