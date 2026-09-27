import {test} from 'node:test';
import assert from 'node:assert/strict';
import {synthesizeDischarge,synthesizeEngineLoop} from '../src/effects/AudioSynthesis.js';

const rms=(data:Float32Array)=>Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);
test('Audio: heavy discharges are finite, bounded and decay into a quiet tail',()=>{
  for(const [kind,power] of [['beam',1],['beam',4],['quickBoost',1]] as const) {
    const pcm=synthesizeDischarge(kind,power,48000);
    assert.ok(pcm.length>=48000*.6);
    assert.ok(pcm.every(x=>Number.isFinite(x)&&Math.abs(x)<=.851));
    assert.ok(rms(pcm.slice(0,4800))>.12);
    assert.ok(rms(pcm.slice(-4800))<rms(pcm.slice(0,4800))*.2);
  }
});
test('Audio: charged beam sustains more low-frequency energy than a normal shot',()=>{
  const normal=synthesizeDischarge('beam',1,48000),charged=synthesizeDischarge('beam',4,48000);
  assert.ok(charged.length>normal.length*1.5);
  const lowEnergy=(pcm:Float32Array)=>{
    let filtered=0,energy=0;const alpha=1-Math.exp(-2*Math.PI*180/48000);
    for(const sample of pcm){filtered+=(sample-filtered)*alpha;energy+=filtered*filtered;}
    return energy;
  };
  assert.ok(lowEnergy(charged)>lowEnergy(normal)*1.4);
});
test('Audio: continuous engine loop has no discontinuity at its seam',()=>{
  const pcm=synthesizeEngineLoop(48000);
  assert.ok(Math.abs(pcm[0]-pcm[pcm.length-1])<.015);
  assert.ok(pcm.every(Number.isFinite));assert.ok(rms(pcm)>.1);assert.ok(rms(pcm)<.4);
});
test('Audio: armor impact and collapse remain bounded and fade to silence',()=>{
  for(const kind of ['armorHit','armorBreak'] as const) {
    const pcm=synthesizeDischarge(kind,2,48000);
    assert.ok(pcm.every(x=>Number.isFinite(x)&&Math.abs(x)<=.851));
    assert.ok(rms(pcm.slice(0,4800))>.05);
    assert.ok(rms(pcm.slice(-1920))<rms(pcm.slice(0,4800))*.25);
  }
});
