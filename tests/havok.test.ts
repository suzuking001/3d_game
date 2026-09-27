import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate.js';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent.js';
import { GroundDetector } from '../src/physics/GroundDetector.js';
import { mechConfig } from '../src/config/MechConfig.js';
test('Step 6 integration: actual Havok WASM body is found by ground raycast', async () => {
  const require = createRequire(import.meta.url);
  const binary = await readFile(require.resolve('@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const havok = await HavokPhysics({ wasmBinary: Uint8Array.from(binary).buffer });
  const engine = new NullEngine(); const scene = new Scene(engine);
  try {
    const plugin = new HavokPlugin(true, havok);
    assert.ok(scene.enablePhysics(new Vector3(0, -42, 0), plugin));
    const mesh = MeshBuilder.CreateBox('floor', { width: 50, height: 4, depth: 50 }, scene);
    mesh.position.y = -2;
    new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 }, scene);
    const detector = new GroundDetector(plugin, mechConfig);
    const p = new Vector3(0, mechConfig.collisionHalfHeight + 0.03, 0), v = new Vector3(0, -1, 0);
    assert.ok(detector.probe(p, v));
    assert.ok(detector.normal.y > 0.99); assert.equal(v.y, 0);
    assert.ok(Math.abs(p.y - mechConfig.collisionHalfHeight - mechConfig.collisionSkin) < 1e-5);
    p.y += 5; assert.equal(detector.probe(p, v), false);
    p.y = mechConfig.collisionHalfHeight; v.y = 1; assert.equal(detector.probe(p, v), false);
  } finally { scene.dispose(); engine.dispose(); }
});
