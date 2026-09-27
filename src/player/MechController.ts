import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { InputState } from '../input/InputState.js';
import type { MechMovement } from './MechMovement.js';
import { MechState } from './MechState.js';
import { EnergySystem } from './EnergySystem.js';
import { BoostSystem } from './BoostSystem.js';
import type { GroundQuery } from '../physics/GroundDetector.js';
import { QuickBoost } from './QuickBoost.js';

export class MechController {
  readonly energy: EnergySystem;
  readonly boost: BoostSystem;
  readonly quickBoost: QuickBoost;
  landed = false;
  constructor(readonly movement: MechMovement, private readonly ground?: GroundQuery) {
    this.energy = new EnergySystem(movement.config); this.boost = new BoostSystem(movement.config);
    this.quickBoost = new QuickBoost(movement.config);
  }
  reset(): void { this.movement.reset(); this.energy.reset(); this.boost.reset(); this.quickBoost.reset(); }
  update(dt: number, input: InputState, cameraForward: Vector3, cameraRight: Vector3): void {
    const m = this.movement;
    if (input.resetPressed || m.position.y < -100) this.reset();
    m.beginStep();
    const wasGrounded = m.grounded;
    m.desired.set(cameraForward.x * input.forward + cameraRight.x * input.right, 0, cameraForward.z * input.forward + cameraRight.z * input.right);
    this.quickBoost.tickTimers(dt);
    if (input.quickBoostPressed) this.quickBoost.queue();
    this.quickBoost.tryStart(m.desired, m.forward, m.velocity, this.energy);
    if (this.quickBoost.active) this.quickBoost.solve(dt, m.desired, m.velocity);
    else m.solveHorizontal(dt);
    this.boost.update(dt, input.ascend, m.velocity, this.energy);
    m.finishStep(dt);
    if (this.ground) {
      const hit = this.ground.probe(m.position, m.velocity);
      if (hit) m.groundNormal.copyFrom(this.ground.normal);
      m.grounded = hit || m.grounded;
    }
    this.landed = !wasGrounded && m.grounded;
    m.state = this.quickBoost.active ? MechState.QUICK_BOOST : this.boost.ascending ? MechState.ASCEND_BOOST : m.grounded ? MechState.GROUND : m.velocity.y < -0.5 ? MechState.FALLING : MechState.AIR;
    this.energy.update(dt);
  }
}
