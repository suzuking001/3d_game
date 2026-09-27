import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { mechConfig } from '../src/config/MechConfig.js';
import { CollisionController } from '../src/physics/CollisionController.js';
import { MechMovement } from '../src/player/MechMovement.js';
import { MechController } from '../src/player/MechController.js';
import { createInputState } from '../src/input/InputState.js';
import { TimeManager } from '../src/core/TimeManager.js';
import { MechState } from '../src/player/MechState.js';

const floor = { min: new Vector3(-1000, -4, -1000), max: new Vector3(1000, 0, 1000) };
function makePlayer() {
  const config = { ...mechConfig };
  return new MechController(new MechMovement(config, new CollisionController([floor], config)));
}
test('Step 4: ground movement follows camera axes, including diagonals', () => {
  for (const [right, forward] of [[0, 1], [0, -1], [1, 0], [-1, 0], [Math.SQRT1_2, Math.SQRT1_2]]) {
    const player = makePlayer(), input = createInputState();
    input.right = right; input.forward = forward;
    for (let i = 0; i < 120; i++) player.update(1 / 120, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0));
    assert.ok(Math.abs(player.movement.velocity.length() - mechConfig.groundMaxSpeed) < 0.1);
    assert.ok(player.movement.position.x * right >= 0);
    assert.ok((player.movement.position.z - mechConfig.spawnZ) * forward >= 0);
  }
  const player = makePlayer(), input = createInputState(); input.forward = 1;
  for (let i = 0; i < 120; i++) player.update(1 / 120, input, new Vector3(1, 0, 0), new Vector3(0, 0, -1));
  assert.ok(player.movement.position.x > 20);
});
test('Step 4: 30/60/144fps render schedules produce equal fixed-step travel', () => {
  const distances = [30, 60, 144].map(fps => {
    const player = makePlayer(), input = createInputState(); input.forward = 1;
    const clock = new TimeManager();
    for (let frame = 0; frame < fps * 2; frame++) clock.advance(1 / fps, dt => player.update(dt, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0)));
    return player.movement.position.z;
  });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 1e-7);
});
test('Step 6: floor contact remains stable at rest', () => {
  const p = makePlayer(), input = createInputState();
  for (let i = 0; i < 1000; i++) p.update(1 / 120, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0));
  assert.ok(p.movement.grounded); assert.equal(p.movement.state, MechState.GROUND);
  assert.ok(Math.abs(p.movement.position.y - (mechConfig.collisionHalfHeight + mechConfig.collisionSkin)) < 1e-6);
});
test('Steps 7–8: ascend, steer in air, release, fall, land and recharge', () => {
  const p = makePlayer(), input = createInputState(); input.ascend = true; input.right = 1;
  for (let i = 0; i < 120; i++) p.update(1 / 120, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0));
  assert.ok(p.movement.position.y > 20); assert.equal(p.movement.state, MechState.ASCEND_BOOST);
  assert.ok(p.movement.velocity.x > 30); assert.ok(p.energy.currentEnergy < 80);
  input.ascend = false; input.right = 0;
  let falling = false, landed = false;
  for (let i = 0; i < 1200; i++) {
    p.update(1 / 120, input, new Vector3(0, 0, 1), new Vector3(1, 0, 0));
    falling ||= String(p.movement.state) === MechState.FALLING; landed ||= p.landed;
  }
  assert.ok(falling && landed); assert.ok(p.movement.grounded);
  assert.equal(p.energy.currentEnergy, p.energy.maxEnergy);
});
