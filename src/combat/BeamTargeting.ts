import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Scene } from '@babylonjs/core/scene.js';

export const beamPickable=(mesh:AbstractMesh):boolean => mesh.isPickable && mesh.isVisible && mesh.isEnabled() && (mesh.material?.alpha ?? 1)>.5;
/** Camera selects the reticle point, then a second ray prevents shooting through cover at the muzzle. */
export function traceBeam(scene:Scene, cameraRay:Ray, muzzle:Vector3, range:number) {
  const aim=scene.pickWithRay(cameraRay,beamPickable);
  const point=aim?.pickedPoint ?? cameraRay.origin.add(cameraRay.direction.scale(range));
  const direction=point.subtract(muzzle).normalize();
  const hit=scene.pickWithRay(new Ray(muzzle,direction,range),beamPickable);
  return { point:hit?.pickedPoint ?? muzzle.add(direction.scale(range)), normal:hit?.getNormal(true) ?? direction.negate(), hit,
    targetId:hit?.pickedMesh?.metadata?.trainingId as number|undefined };
}
