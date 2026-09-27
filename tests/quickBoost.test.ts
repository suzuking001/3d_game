import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { mechConfig } from '../src/config/MechConfig.js';
import { QuickBoost, QuickBoostPhase } from '../src/player/QuickBoost.js';
import { EnergySystem } from '../src/player/EnergySystem.js';
import { CollisionController } from '../src/physics/CollisionController.js';
import { MechMovement } from '../src/player/MechMovement.js';
import { MechController } from '../src/player/MechController.js';
import { createInputState } from '../src/input/InputState.js';
import { TimeManager } from '../src/core/TimeManager.js';

test('Step 9: five QB phases have acceleration, peak, deceleration and retained exit velocity', () => {
  const config = { ...mechConfig }, qb = new QuickBoost(config), energy = new EnergySystem(config);
  const desired = new Vector3(0, 0, 1), velocity = Vector3.Zero();
  qb.queue(); assert.ok(qb.tryStart(desired, desired, velocity, energy));
  assert.equal(qb.phase, QuickBoostPhase.START);
  const phases = new Set<string>([qb.phase]);
  let peak = 0;
  for (let i = 0; i < 60 && qb.active; i++) {
    qb.solve(1 / 120, desired, velocity); phases.add(qb.phase); peak = Math.max(peak, velocity.z);
  }
  for (const phase of ['START', 'ACCELERATION', 'PEAK', 'DECELERATION', 'EXIT']) assert.ok(phases.has(phase));
  assert.equal(peak, config.quickBoostPeakSpeed);
  assert.equal(velocity.z, config.quickBoostPeakSpeed * config.quickBoostMomentumRetention);
  assert.equal(energy.currentEnergy, config.maxEnergy - config.quickBoostEnergyCost);
});
test('Step 9: all eight directions and no-input mech-forward fallback', () => {
  for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0]]) {
    const qb = new QuickBoost(mechConfig), energy = new EnergySystem(mechConfig), velocity = Vector3.Zero();
    const desired = new Vector3(x, 0, z).normalize(), facing = new Vector3(1, 0, 0);
    qb.queue(); qb.tryStart(desired, facing, velocity, energy); qb.solve(1 / 120, desired, velocity);
    assert.ok(Vector3.Dot(qb.direction, x === 0 && z === 0 ? facing : desired) > 0.999);
  }
});
test('Step 9: steering influence bends a boost without instant redirection', () => {
  const qb = new QuickBoost(mechConfig), energy = new EnergySystem(mechConfig), velocity = Vector3.Zero();
  qb.queue(); qb.tryStart(new Vector3(0, 0, 1), new Vector3(0, 0, 1), velocity, energy);
  qb.solve(1 / 120, new Vector3(1, 0, 0), velocity);
  assert.ok(qb.direction.x > 0 && qb.direction.x < 0.1); assert.ok(qb.direction.z > 0.99);
});
function player() {
  const config = { ...mechConfig };
  const boxes = [{ min: new Vector3(-1000, -4, -1000), max: new Vector3(1000, 0, 1000) }];
  return new MechController(new MechMovement(config, new CollisionController(boxes, config)));
}
test('Steps 10–11: early buffered reverse QB starts after cooldown; momentum survives exit', () => {
  const p = player(), input = createInputState(), forward = new Vector3(0, 0, 1), right = new Vector3(1, 0, 0);
  input.quickBoostPressed = true; input.forward = 1;
  p.update(1 / 120, input, forward, right); input.quickBoostPressed = false;
  for (let i = 0; i < 26; i++) p.update(1 / 120, input, forward, right);
  input.forward = -1; input.quickBoostPressed = true;
  p.update(1 / 120, input, forward, right); input.quickBoostPressed = false;
  for (let i = 0; i < 12; i++) p.update(1 / 120, input, forward, right);
  assert.equal(p.quickBoost.count, 2); assert.ok(p.movement.velocity.z < 0);
  for (let i = 0; i < 30; i++) p.update(1 / 120, input, forward, right);
  assert.ok(p.movement.velocity.length() > 0); assert.ok(p.movement.velocity.z <= -mechConfig.groundMaxSpeed);
});
test('Step 11: air QB can transition into ascend and return to ground', () => {
  const p = player(), input = createInputState(); input.ascend = true;
  const forward = new Vector3(0, 0, 1), right = new Vector3(1, 0, 0);
  for (let i = 0; i < 40; i++) p.update(1 / 120, input, forward, right);
  input.ascend = false; input.right = -1; input.quickBoostPressed = true;
  p.update(1 / 120, input, forward, right); input.quickBoostPressed = false;
  assert.ok(p.quickBoost.active && !p.movement.grounded); assert.ok(p.movement.velocity.x < 0);
  input.ascend = true;
  for (let i = 0; i < 40; i++) p.update(1 / 120, input, forward, right);
  assert.ok(p.movement.velocity.y > 0);
  input.ascend = false;
  for (let i = 0; i < 1000; i++) p.update(1 / 120, input, forward, right);
  assert.ok(p.movement.grounded);
});
test('Step 11: an expired buffer does not fire later; energy denial returns feedback', () => {
  const qb = new QuickBoost(mechConfig), energy = new EnergySystem(mechConfig), velocity = Vector3.Zero(), dir = new Vector3(0, 0, 1);
  qb.queue(); qb.tickTimers(1); assert.equal(qb.tryStart(dir, dir, velocity, energy), false);
  energy.currentEnergy = 0; qb.queue(); assert.equal(qb.tryStart(dir, dir, velocity, energy), false);
  assert.ok(energy.deniedTime > 0); assert.equal(qb.buffered, false);
});
test('Step 11: QB distance is independent of 30/60/144fps rendering', () => {
  const distances = [30, 60, 144].map(fps => {
    const p = player(), input = createInputState(), time = new TimeManager();
    input.quickBoostPressed = true;
    for (let frame = 0; frame < fps; frame++) time.advance(1 / fps, dt => {
      p.update(dt, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0)); input.quickBoostPressed = false;
    });
    return p.movement.position.z;
  });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 1e-7);
});
