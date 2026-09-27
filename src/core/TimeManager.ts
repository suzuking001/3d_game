export class TimeManager {
  private accumulator = 0;
  readonly step: number;
  constructor(hz = 120, private readonly maxFrameDelta = 0.1) { this.step = 1 / hz; }
  advance(frameDelta: number, simulate: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(frameDelta, 0), this.maxFrameDelta);
    while (this.accumulator + 1e-10 >= this.step) {
      simulate(this.step); this.accumulator -= this.step;
    }
    return Math.max(0, this.accumulator / this.step);
  }
  reset(): void { this.accumulator = 0; }
}
