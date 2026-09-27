import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { graphicsConfig } from '../config/GraphicsConfig.js';

/** Shared direction for the celestial image, scattering and directional shadows. */
export function solarDirection(): Vector3 {
  const elevation = graphicsConfig.sunElevationDegrees * Math.PI / 180;
  const azimuth = graphicsConfig.sunAzimuthDegrees * Math.PI / 180;
  return new Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
}
export function solarPosition(cameraPosition: Vector3, distance = graphicsConfig.sunSkyDistance): Vector3 {
  return solarDirection().scale(distance).addInPlace(cameraPosition);
}
export function solarDiameter(): number {
  return 2 * graphicsConfig.sunSkyDistance * Math.tan(graphicsConfig.sunAngularDiameterDegrees * Math.PI / 360);
}
