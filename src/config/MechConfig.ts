export interface MechMovementConfig {
  simulationHz: number;
  maxFrameDelta: number;
  groundMaxSpeed: number;
  groundAcceleration: number;
  groundBraking: number;
  airMaxSpeed: number;
  airAcceleration: number;
  airControl: number;
  airDrag: number;
  fallGravity: number;
  riseGravity: number;
  maxFallSpeed: number;
  maxRiseSpeed: number;
  verticalBoostForce: number;
  hoverDuration: number;
  hoverGravity: number;
  quickBoostPeakSpeed: number;
  quickBoostAccelerationTime: number;
  quickBoostHoldTime: number;
  quickBoostDecelerationTime: number;
  quickBoostCooldown: number;
  quickBoostEnergyCost: number;
  quickBoostMomentumRetention: number;
  quickBoostSteeringInfluence: number;
  quickBoostInputBuffer: number;
  quickBoostCameraFovKick: number;
  quickBoostCameraLagStrength: number;
  quickBoostCameraShakeStrength: number;
  maxEnergy: number;
  boostDrain: number;
  energyRechargeRate: number;
  energyRechargeDelay: number;
  collisionRadius: number;
  collisionHalfHeight: number;
  collisionSkin: number;
  collisionIterations: number;
  groundProbeDistance: number;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  facingResponse: number;
  gamepadDeadzone: number;
}

export const mechConfig: MechMovementConfig = {
  simulationHz: 120, maxFrameDelta: 0.1,
  groundMaxSpeed: 32, groundAcceleration: 145, groundBraking: 85,
  airMaxSpeed: 38, airAcceleration: 100, airControl: 0.72, airDrag: 0.35,
  fallGravity: 42, riseGravity: 28, maxFallSpeed: 58, maxRiseSpeed: 30,
  verticalBoostForce: 100, hoverDuration: 0.18, hoverGravity: 6,
  quickBoostPeakSpeed: 112, quickBoostAccelerationTime: 0.055,
  quickBoostHoldTime: 0.065, quickBoostDecelerationTime: 0.14,
  quickBoostCooldown: 0.3, quickBoostEnergyCost: 18,
  quickBoostMomentumRetention: 0.42, quickBoostSteeringInfluence: 0.15,
  quickBoostInputBuffer: 0.16, quickBoostCameraFovKick: 12,
  quickBoostCameraLagStrength: 0.48, quickBoostCameraShakeStrength: 0.055,
  maxEnergy: 100, boostDrain: 22, energyRechargeRate: 32, energyRechargeDelay: 0.55,
  collisionRadius: 0.9, collisionHalfHeight: 1.8, collisionSkin: 0.005,
  collisionIterations: 5, groundProbeDistance: 0.08,
  spawnX: 0, spawnY: 1.805, spawnZ: -55, facingResponse: 14, gamepadDeadzone: 0.16,
};
