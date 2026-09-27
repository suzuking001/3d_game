export const graphicsConfig = {
  arenaHalfSize: 150, fogDensity: 0.0038, pixelRatioLimit: 2,
  bloomEnabled: true, bloomWeight: 0.22, trailPoolSize: 64, trailLifetime: 0.24,
  environmentIntensity: 0.72, shadowMapSize: 2048, shadowDistance: 200,
  exposure: 1.15, contrast: 1.12, ssaoEnabled: true, ssrEnabled: true,
  depthOfFieldEnabled: true, motionBlurEnabled: true, lightShaftsEnabled: true,
  grainIntensity: 3, chromaticAberration: 0.12, smokeParticles: 160,
  ashParticles: 500, debrisCount: 340, seed: 91427,
  sunElevationDegrees: 55, sunAzimuthDegrees: -35,
  sunAngularDiameterDegrees: 0.53, sunSkyDistance: 1000,
};
export type GraphicsQuality = 'ultra' | 'high' | 'low';
export function applyGraphicsQuality(quality: GraphicsQuality): void {
  if (quality === 'ultra') return;
  graphicsConfig.ssrEnabled = false; graphicsConfig.depthOfFieldEnabled = false;
  graphicsConfig.motionBlurEnabled = false;
  if (quality === 'low') {
    graphicsConfig.ssaoEnabled = false; graphicsConfig.lightShaftsEnabled = false;
    graphicsConfig.shadowMapSize = 1024; graphicsConfig.pixelRatioLimit = 1;
    graphicsConfig.debrisCount = 140; graphicsConfig.ashParticles = 180;
  }
}
