import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine.js';
import { TimeManager } from './TimeManager.js';
import { mechConfig } from '../config/MechConfig.js';

export interface LoopCallbacks {
  input(dt: number): void;
  simulate(dt: number): void;
  render(dt: number, alpha: number): void;
}
export class GameLoop {
  private readonly time = new TimeManager(mechConfig.simulationHz, mechConfig.maxFrameDelta);
  private lastTime = 0;
  private readonly tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, mechConfig.maxFrameDelta); this.lastTime = now;
    if (document.hidden) { this.time.reset(); return; }
    this.callbacks.input(dt);
    const alpha = this.time.advance(dt, this.callbacks.simulate);
    this.callbacks.render(dt, alpha);
  };
  constructor(private readonly engine: AbstractEngine, private readonly callbacks: LoopCallbacks) {}
  start(): void { this.lastTime = performance.now(); this.engine.runRenderLoop(this.tick); }
  stop(): void { this.engine.stopRenderLoop(this.tick); }
}
