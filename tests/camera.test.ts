import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraEffects } from '../src/camera/CameraEffects.js';
import { cameraConfig } from '../src/config/CameraConfig.js';
test('Step 13: FOV attacks smoothly and returns without a discontinuity', () => {
  const effects = new CameraEffects(), normal = cameraConfig.normalFov * Math.PI / 180;
  effects.update(1 / 60, 12, 0);
  assert.ok(effects.fov > normal && effects.fov < 82 * Math.PI / 180);
  for (let i = 0; i < 30; i++) effects.update(1 / 60, 12, 0);
  assert.ok(effects.fov > 81 * Math.PI / 180);
  for (let i = 0; i < 120; i++) effects.update(1 / 60, 0, 0);
  assert.ok(Math.abs(effects.fov - normal) < 1e-5);
});
test('Step 12: camera shake is event-driven and decays; roll stays limited', () => {
  const effects = new CameraEffects(); effects.update(1 / 60, 0, 0);
  assert.equal(effects.shake, 0); effects.kick(0.05);
  for (let i = 0; i < 120; i++) effects.update(1 / 60, 0, 1);
  assert.ok(effects.shake < 1e-7); assert.ok(Math.abs(effects.roll) <= cameraConfig.rollStrength);
});
