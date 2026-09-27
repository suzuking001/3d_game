import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
/** Phase 2 contract only. */
export interface TargetingSystem { readonly targetPosition: Vector3 | null; switchTarget(direction: number): void; }
