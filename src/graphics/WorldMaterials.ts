import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { assetUrl } from '../core/AssetUrl.js';
export class WorldMaterials {
  readonly concrete: PBRMaterial;
  readonly asphalt: PBRMaterial;
  readonly rust: PBRMaterial;
  readonly charred: PBRMaterial;
  readonly glass: PBRMaterial;
  readonly water: PBRMaterial;
  readonly paint: PBRMaterial;
  readonly emissive: PBRMaterial;
  readonly grime: PBRMaterial;
  constructor(scene: Scene) {
    const scanned = (name: string, asset: string, tint: string, roughness: number, metallic: number) => {
      const m = new PBRMaterial(name, scene);
      m.albedoColor = Color3.FromHexString(tint); m.metallic = metallic; m.roughness = roughness;
      m.albedoTexture = new Texture(assetUrl(`textures/${asset}-Diffuse.jpg`), scene);
      m.bumpTexture = new Texture(assetUrl(`textures/${asset}-nor_gl.jpg`), scene, false, false); m.bumpTexture.level = 0.65;
      m.metallicTexture = new Texture(assetUrl(`textures/${asset}-rough.jpg`), scene, false, false);
      m.metallicTexture.gammaSpace = false;
      m.useRoughnessFromMetallicTextureGreen = true; m.useRoughnessFromMetallicTextureAlpha = false;
      m.useMetallnessFromMetallicTextureBlue = false; m.environmentIntensity = 0.85;
      return m;
    };
    this.concrete = scanned('weathered concrete', 'concrete_debris', '#c5b8a2', 0.96, 0);
    this.asphalt = scanned('wet fractured asphalt', 'asphalt_02', '#7e827e', 0.5, 0.03);
    this.rust = scanned('oxidized steel', 'rusty_metal_02', '#b8997d', 0.85, 0.6);
    this.charred = this.concrete.clone('burned concrete')!; this.charred.albedoColor = Color3.FromHexString('#474c49');
    this.glass = new PBRMaterial('dead window glass', scene);
    this.glass.albedoColor = Color3.FromHexString('#141e20'); this.glass.metallic = 0.75; this.glass.roughness = 0.23;
    this.water = new PBRMaterial('rainwater', scene);
    this.water.albedoColor = Color3.FromHexString('#27332e'); this.water.metallic = 0.15; this.water.roughness = 0.08;
    this.water.clearCoat.isEnabled = true; this.water.clearCoat.intensity = 1; this.water.clearCoat.roughness = 0.06;
    this.water.environmentIntensity = 0.35;
    const waterNormals = new Texture(assetUrl('textures/asphalt_02-nor_gl.jpg'), scene, false, false);
    waterNormals.level = 0.06; waterNormals.uScale = waterNormals.vScale = 0.5; this.water.bumpTexture = waterNormals;
    this.paint = this.concrete.clone('old road markings')!; this.paint.albedoColor = Color3.FromHexString('#ad9d68');
    this.emissive = new PBRMaterial('emergency amber', scene);
    this.emissive.albedoColor = Color3.FromHexString('#4c210a'); this.emissive.emissiveColor = new Color3(2.3, 0.65, 0.12);
    this.emissive.metallic = 0.1; this.emissive.roughness = 0.35;
    const streaks = new DynamicTexture('soot and rain leakage', { width: 256, height: 512 }, scene, true);
    const ctx = streaks.getContext(); ctx.clearRect(0, 0, 256, 512);
    let seed = 7161;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 120; i++) {
      const x = random() * 256, width = 0.5 + random() * 12, length = 30 + random() * 480;
      const gradient = ctx.createLinearGradient(0, 0, 0, length);
      gradient.addColorStop(0, `rgba(20,24,19,${0.12 + random() * 0.45})`); gradient.addColorStop(1, 'rgba(20,24,19,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x, 0, width, length);
    }
    streaks.hasAlpha = true; streaks.update();
    this.grime = new PBRMaterial('facade soot streaks', scene);
    this.grime.albedoTexture = streaks; this.grime.useAlphaFromAlbedoTexture = true;
    this.grime.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND; this.grime.roughness = 1; this.grime.metallic = 0;
  }
}
