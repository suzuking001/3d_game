/** Training drones respawn after destruction; one hit can produce only one kill. */
export class TargetHealth {
  health = 100;
  private respawn = 0;
  get alive(): boolean { return this.health > 0; }
  damage(amount: number): boolean {
    if (!this.alive || amount <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    if (!this.alive) { this.respawn = 7; return true; }
    return false;
  }
  update(dt: number): void {
    if (this.alive) return;
    this.respawn = Math.max(0, this.respawn - dt);
    if (this.respawn <= 1e-8) this.health = 100;
  }
  reset(): void { this.health = 100; this.respawn = 0; }
}
