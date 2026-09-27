import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { Scene } from '@babylonjs/core/scene.js';
/** Phase 2 GLB path. Loading the heavy glTF pipeline is deferred until needed. */
export async function loadMechGLB(url: string, scene: Scene) {
  await import('@babylonjs/loaders/glTF');
  return ImportMeshAsync(url, scene);
}
