import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { CollisionController } from '../src/physics/CollisionController.js';
import { mechConfig } from '../src/config/MechConfig.js';
const wall = { min: new Vector3(-20, 0, 5), max: new Vector3(20, 20, 5.1) };
test('Step 14: high-speed sweep cannot tunnel through a 10cm wall even at 1000m/s', () => {
  for (const dt of [1 / 120, 1 / 30, 0.1]) {
    const collision = new CollisionController([wall], mechConfig);
    const p = new Vector3(0, 4, -10), v = new Vector3(0, 0, 1000);
    for (let i = 0; i < 100; i++) collision.move(p, v, dt);
    assert.ok(p.z < 5 - mechConfig.collisionRadius); assert.equal(v.z, 0);
  }
});
test('Step 14: diagonal sweep slides along a wall without deleting tangential velocity', () => {
  const collision = new CollisionController([wall], mechConfig);
  const p = new Vector3(0, 4, 0), v = new Vector3(25, 0, 112);
  collision.move(p, v, 0.1);
  assert.ok(p.z <= 5 - mechConfig.collisionRadius); assert.ok(p.x > 2);
  assert.equal(v.x, 25); assert.equal(v.z, 0);
});
test('Step 14: a fall onto an elevated platform stops on its top', () => {
  const platform = { min: new Vector3(-10, 0, -10), max: new Vector3(10, 8, 10) };
  const collision = new CollisionController([platform], mechConfig);
  const p = new Vector3(0, 30, 0), v = new Vector3(0, -1000, 0);
  collision.move(p, v, 0.1);
  assert.ok(collision.grounded); assert.equal(v.y, 0);
  assert.ok(Math.abs(p.y - (8 + mechConfig.collisionHalfHeight + mechConfig.collisionSkin)) < 1e-6);
});
test('Step 14: concave corners resolve both normals and starting overlap is corrected', () => {
  const side = { min: new Vector3(5, 0, -20), max: new Vector3(5.1, 20, 20) };
  const collision = new CollisionController([wall, side], mechConfig);
  const p = new Vector3(0, 4, 0), v = new Vector3(112, 0, 112);
  collision.move(p, v, 0.1);
  assert.ok(p.x < 5 - mechConfig.collisionRadius && p.z < 5 - mechConfig.collisionRadius);
  assert.equal(v.x, 0); assert.equal(v.z, 0);
  const overlap = new Vector3(0, 4, 5.05);
  collision.move(overlap, Vector3.Zero(), 0.01);
  assert.ok(overlap.z < 4.1 || overlap.z > 6);
});
