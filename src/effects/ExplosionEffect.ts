import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
/** Phase 2 extension contract; no explosions in the movement prototype. */
export interface ExplosionEffect { trigger(position: Vector3, intensity: number): void; }
