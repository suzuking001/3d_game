import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
export const armorRadii=new Vector3(1.25,2.15,.95);
export const hullRadii=new Vector3(.7,1.8,.55);
/** Earliest segment/ellipsoid contact. Relative coordinates also sweep a moving wearer. */
export function intersectArmorSegment(start:Vector3,end:Vector3,radii:Vector3):number|null {
  const a=start.divide(radii),delta=end.subtract(start).divide(radii),c=a.lengthSquared()-1;
  if(c<=0)return 0;
  const quadratic=delta.lengthSquared();if(quadratic<1e-12)return null;
  const b=2*Vector3.Dot(a,delta),discriminant=b*b-4*quadratic*c;
  if(discriminant<0)return null;
  const fraction=(-b-Math.sqrt(discriminant))/(2*quadratic);
  return fraction>=0&&fraction<=1?fraction:null;
}
