import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture.js';
import { BackgroundMaterial } from '@babylonjs/core/Materials/Background/backgroundMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';
import { assetUrl } from '../core/AssetUrl.js';
export function createSkyEnvironment(scene: Scene): void {
  const hdr = new HDRCubeTexture(assetUrl('environment/overcast.hdr'), scene, 256, false, true, false, true);
  scene.environmentTexture = hdr; scene.environmentIntensity = graphicsConfig.environmentIntensity;
  const sky = MeshBuilder.CreateBox('photographic overcast sky', { size: 2400 }, scene);
  const material = new BackgroundMaterial('HDR sky', scene);
  material.backFaceCulling = false; material.reflectionTexture = hdr.clone();
  material.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  material.reflectionBlur = 0.12; material.fogEnabled = false;
  sky.material = material; sky.infiniteDistance = true; sky.isPickable = false;
}
