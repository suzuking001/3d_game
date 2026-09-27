import { mechConfig } from '../config/MechConfig.js';
import { cameraConfig } from '../config/CameraConfig.js';
import { createInputState } from './InputState.js';

export class InputManager {
  readonly state = createInputState();
  private readonly keys = new Set<string>();
  private readonly abort = new AbortController();
  private mouseX = 0;
  private mouseY = 0;
  private queuedBoost = false;
  private queuedReset = false;
  private padBoostHeld = false;
  private mouseFire = false;
  private mouseCharge = false;
  private queuedFire = false;
  private queuedChargeRelease = false;
  private padChargeHeld = false;
  constructor(canvas: HTMLCanvasElement) {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
      if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && event.code.startsWith('Shift')) this.queuedBoost = true;
      if (!event.repeat && event.code === 'KeyR') this.queuedReset = true;
      if (!event.repeat && event.code === 'KeyF') this.queuedFire = true;
    }, options);
    window.addEventListener('keyup', event => {
      if (event.code === 'KeyE' && this.keys.has(event.code)) this.queuedChargeRelease = true;
      this.keys.delete(event.code);
    }, options);
    canvas.addEventListener('mousedown', event => {
      if (event.button === 0 && document.pointerLockElement === canvas) this.mouseFire = this.queuedFire = true;
      if (event.button === 2) { event.preventDefault(); canvas.focus(); this.mouseCharge = true; }
    }, options);
    window.addEventListener('mouseup', event => {
      if (event.button === 0) this.mouseFire = false;
      if (event.button === 2 && this.mouseCharge) { this.mouseCharge = false; this.queuedChargeRelease = true; }
    }, options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); }, options);
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) this.clear(); }, options);
    canvas.addEventListener('click', () => {
      canvas.focus();
      canvas.requestPointerLock()?.catch(() => { /* Drag-look remains available. */ });
    }, options);
    window.addEventListener('mousemove', event => {
      if (document.pointerLockElement === canvas || (event.buttons === 1 && event.target === canvas)) {
        this.mouseX += event.movementX; this.mouseY += event.movementY;
      }
    }, options);
  }
  sample(dt: number): void {
    const s = this.state;
    s.right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    s.forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    s.ascend = this.keys.has('Space');
    s.fireHeld = this.mouseFire || this.keys.has('KeyF');
    s.chargeHeld = this.mouseCharge || this.keys.has('KeyE');
    s.lookX = this.mouseX * cameraConfig.mouseSensitivity;
    s.lookY = this.mouseY * cameraConfig.mouseSensitivity;
    this.mouseX = this.mouseY = 0;
    const pad = navigator.getGamepads?.()[0];
    if (pad?.connected) {
      const axis = (value: number) => Math.abs(value) < mechConfig.gamepadDeadzone ? 0 : Math.sign(value) * (Math.abs(value) - mechConfig.gamepadDeadzone) / (1 - mechConfig.gamepadDeadzone);
      s.right += axis(pad.axes[0] ?? 0); s.forward -= axis(pad.axes[1] ?? 0);
      s.lookX += axis(pad.axes[2] ?? 0) * cameraConfig.gamepadLookSpeed * dt;
      s.lookY += axis(pad.axes[3] ?? 0) * cameraConfig.gamepadLookSpeed * dt;
      s.ascend ||= pad.buttons[0]?.pressed ?? false;
      s.fireHeld ||= pad.buttons[7]?.pressed ?? false;
      const charge = pad.buttons[6]?.pressed ?? false;
      if (this.padChargeHeld && !charge) this.queuedChargeRelease = true;
      s.chargeHeld ||= charge; this.padChargeHeld = charge;
      const pressed = pad.buttons[1]?.pressed ?? false;
      if (pressed && !this.padBoostHeld) this.queuedBoost = true;
      this.padBoostHeld = pressed;
    } else { if (this.padChargeHeld) s.combatCancelled = true; this.padBoostHeld = this.padChargeHeld = false; }
    const length = Math.hypot(s.right, s.forward);
    if (length > 1) { s.right /= length; s.forward /= length; }
    s.quickBoostPressed ||= this.queuedBoost;
    s.resetPressed ||= this.queuedReset;
    s.firePressed ||= this.queuedFire; s.chargeReleased ||= this.queuedChargeRelease;
    this.queuedFire = this.queuedChargeRelease = false;
    this.queuedBoost = this.queuedReset = false;
  }
  consumeEdges(): void {
    this.state.quickBoostPressed = this.state.resetPressed = this.state.firePressed = this.state.chargeReleased = this.state.combatCancelled = false;
  }
  clear(): void {
    this.keys.clear(); this.mouseX = this.mouseY = 0;
    this.queuedBoost = this.queuedReset = this.padBoostHeld = false;
    Object.assign(this.state, createInputState());
    this.mouseFire = this.mouseCharge = this.queuedFire = this.queuedChargeRelease = this.padChargeHeld = false;
    this.state.combatCancelled = true;
  }
  dispose(): void { this.abort.abort(); this.clear(); }
}
