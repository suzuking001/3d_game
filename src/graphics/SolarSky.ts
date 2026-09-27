import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { LensFlare } from '@babylonjs/core/LensFlares/lensFlare.js';
import { LensFlareSystem } from '@babylonjs/core/LensFlares/lensFlareSystem.js';
import '@babylonjs/core/LensFlares/lensFlareSystemSceneComponent.js';
import { VolumetricLightScatteringPostProcess } from '@babylonjs/core/PostProcesses/volumetricLightScatteringPostProcess.js';
import type { Camera } from '@babylonjs/core/Cameras/camera.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { graphicsConfig as config } from '../config/GraphicsConfig.js';
import { solarDiameter, solarPosition } from './SolarDirection.js';

/** Camera-relative sky representation, with real world-space positions for the
 * scattering and flare projections (infiniteDistance alone does not update them). */
export function createSolarSky(scene: Scene, camera: Camera): void {
  const sun = MeshBuilder.CreateSphere('celestial sun', { diameter: solarDiameter(), segments: 24 }, scene);
  sun.isPickable = false; sun.applyFog = false;
  const material = new StandardMaterial('solar radiance', scene);
  material.disableLighting = true; material.diffuseColor = Color3.Black();
  material.emissiveColor = new Color3(2.2, 2.05, 1.8); material.disableDepthWrite = true; material.fogEnabled = false;
  sun.material = material;

  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,245,216,0.6)'); gradient.addColorStop(0.15, 'rgba(255,245,216,0.23)');
  gradient.addColorStop(0.5, 'rgba(255,245,216,0.035)'); gradient.addColorStop(1, 'rgba(255,245,216,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new DynamicTexture('solar atmospheric aureole', canvas, scene, true); texture.hasAlpha = true; texture.update();
  const halo = MeshBuilder.CreatePlane('solar haze aureole', { size: solarDiameter() * 8 }, scene);
  halo.billboardMode = Mesh.BILLBOARDMODE_ALL; halo.isPickable = false; halo.applyFog = false;
  const haze = new StandardMaterial('forward scattered solar haze', scene);
  haze.diffuseTexture = texture; haze.useAlphaFromDiffuseTexture = true; haze.disableLighting = true;
  haze.emissiveColor = new Color3(0.55, 0.5, 0.4); haze.disableDepthWrite = true; haze.fogEnabled = false; haze.alpha = 0.45;
  halo.material = haze;

  const positionSky = () => {
    sun.position.copyFrom(solarPosition(camera.globalPosition));
    halo.position.copyFrom(solarPosition(camera.globalPosition, config.sunSkyDistance - 2));
  };
  positionSky(); scene.onBeforeRenderObservable.add(positionSky);
  if (!config.lightShaftsEnabled) return;
  const shafts = new VolumetricLightScatteringPostProcess('occluded sunlight scattering', 0.5, camera, sun, 64, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false);
  // HDR sky and the cosmetic halo must not block the sunlight mask.
  shafts.excludedMeshes = scene.meshes.filter(mesh => mesh.infiniteDistance || mesh === halo);
  shafts.exposure = 0.16; shafts.decay = 0.97; shafts.weight = 0.1; shafts.density = 0.78;

  const optics = new LensFlareSystem('subtle solar lens response', sun, scene); optics.borderLimit = 120;
  optics.meshesSelectionPredicate = mesh => mesh.isVisible && mesh !== sun && mesh !== halo && !mesh.infiniteDistance && !mesh.material?.needAlphaBlending();
  const flareTexture = canvas.toDataURL('image/png');
  new LensFlare(0.075, 0, new Color3(0.06, 0.05, 0.038), flareTexture, optics);
  new LensFlare(0.035, 0.65, new Color3(0.025, 0.045, 0.04), flareTexture, optics);
}
