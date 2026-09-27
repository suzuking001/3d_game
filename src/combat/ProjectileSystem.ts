import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
/** Phase 2 contract only. */
export interface ProjectileSystem { spawn(position: Vector3, velocity: Vector3): void; update(dt: number): void; }
