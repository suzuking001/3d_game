import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';
import { solarDirection } from './SolarDirection.js';
export function createLighting(scene: Scene, casters: readonly AbstractMesh[]): void {
  const sky = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
  sky.intensity = 0.2; sky.diffuse = new Color3(0.67, 0.76, 0.84); sky.groundColor = new Color3(0.13, 0.12, 0.1);
  const sun = new DirectionalLight('sun through ash cloud', solarDirection().negate(), scene);
  sun.position.copyFrom(solarDirection().scale(300)); sun.intensity = 2.1; sun.diffuse = new Color3(1, 0.86, 0.67);
  const shadows = new CascadedShadowGenerator(graphicsConfig.shadowMapSize, sun);
  shadows.numCascades = 4; shadows.lambda = 0.75; shadows.shadowMaxZ = graphicsConfig.shadowDistance;
  shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.001; shadows.normalBias = 0.08; shadows.setDarkness(0.18);
  for (const mesh of casters) shadows.addShadowCaster(mesh);
}
