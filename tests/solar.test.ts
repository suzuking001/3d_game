import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { solarPosition, solarDirection, solarDiameter } from '../src/graphics/SolarDirection.js';
import { graphicsConfig } from '../src/config/GraphicsConfig.js';

test('Sun stays in the same distant sky direction throughout ascent and traversal', () => {
  const direction = solarDirection();
  for (const camera of [new Vector3(0, 4, -55), new Vector3(125, 125, 95), new Vector3(-150, 1500, 150)]) {
    const offset = solarPosition(camera).subtract(camera);
    assert.ok(Math.abs(offset.length() - graphicsConfig.sunSkyDistance) < 1e-8);
    assert.ok(Vector3.Distance(offset.normalize(), direction) < 1e-8);
  }
});
test('Solar image retains a realistic angular size and shares the lighting elevation', () => {
  const angle = 2 * Math.atan(solarDiameter() / (2 * graphicsConfig.sunSkyDistance)) * 180 / Math.PI;
  assert.ok(Math.abs(angle - 0.53) < 1e-8);
  assert.ok(Math.abs(Math.asin(solarDirection().y) * 180 / Math.PI - 55) < 1e-8);
});
