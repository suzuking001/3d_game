import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { MechController } from '../player/MechController.js';
import type { MechCamera } from '../camera/MechCamera.js';
import type { InputState } from '../input/InputState.js';
import { mechConfig, type MechMovementConfig } from '../config/MechConfig.js';
import { cameraConfig } from '../config/CameraConfig.js';
import type { DebugRenderer } from './DebugRenderer.js';

const vector = (v: Vector3) => `${v.x.toFixed(1)} / ${v.y.toFixed(1)} / ${v.z.toFixed(1)}`;
export class DebugHUD {
  private readonly root: HTMLElement;
  private readonly values = new Map<string, HTMLElement>();
  private readonly energyBar: HTMLElement;
  private readonly speedBar: HTMLElement;
  private readonly notice: HTMLElement;
  private elapsed = 0;
  private readonly defaults = { ...mechConfig };
  private readonly cameraDefaults = { ...cameraConfig };
  private readonly abort = new AbortController();
  constructor(root: HTMLElement, backend: string, debug: DebugRenderer, reset: () => void) {
    this.root = root;
    root.innerHTML = `
      <header class="topbar">
        <div class="identity"><span class="identity-mark">V<span>∕</span></span><div><h1>VECTOR<span> / 01</span></h1><p>ARMORED MOVEMENT LAB</p></div></div>
        <div class="session"><span class="live-dot"></span> ASHFALL <span class="divider">/</span> ABANDONED DISTRICT <span class="session-id">E–07</span></div>
        <div class="backend"><b>${backend}</b><span>${mechConfig.simulationHz} Hz SIMULATION</span></div>
      </header>
      <div class="field-label"><span>DESOLATION ZONE / E–07</span><b>THE SILENT AVENUE</b><p>ASH IN THE AIR. NOTHING LEFT BUT STEEL.</p></div>
      <nav class="tools" aria-label="開発ツール">
        <select id="graphics-quality" aria-label="グラフィック品質"><option value="ultra">ULTRA</option><option value="high">HIGH</option><option value="low">LOW</option></select>
        <button id="telemetry-toggle" aria-expanded="false">TELEMETRY</button>
        <button id="vector-toggle" aria-pressed="false">VECTORS</button>
        <button id="tuning-toggle" aria-expanded="false">TUNING</button>
        <button id="reset-mech">RESET <kbd>R</kbd></button>
        <button id="hide-hud">HUD OFF <kbd>H</kbd></button>
      </nav>
      <section class="telemetry panel" id="telemetry" hidden><div class="panel-heading">LIVE TELEMETRY <span data-value="fps">—</span></div>
        <dl>${[
          ['frame', 'FRAME TIME'], ['position', 'POSITION'], ['velocity', 'VELOCITY'], ['acceleration', 'ACCELERATION'],
          ['movement', 'MOVEMENT STATE'], ['qb', 'QB PHASE'], ['grounded', 'GROUNDED'],
          ['input', 'INPUT X / Z'], ['direction', 'QB DIRECTION'], ['fov', 'CAMERA FOV'], ['cooldown', 'QB COOLDOWN'],
        ].map(([key, label]) => `<div><dt>${label}</dt><dd data-value="${key}">—</dd></div>`).join('')}</dl>
        <div class="vector-legend" hidden><span>VELOCITY</span><span>DESIRED</span><span>QB</span><span>GROUND</span><span>CAM FWD</span><span>CAM RIGHT</span><span>CONTACT</span></div>
      </section>
      <section class="tuning panel" id="tuning" hidden><div class="panel-heading">DEVELOPER TUNING <button id="restore">DEFAULTS</button></div>
        <p class="panel-note">変更は即時反映。移動の感触を調整します。</p>
        <div id="sliders"></div>
        <details><summary>全移動パラメータ</summary><p class="panel-note">simulationHz / maxFrameDelta は再起動時に適用。</p><div id="numeric-config"></div></details>
      </section>
      <div class="camera-point" aria-hidden="true"><i></i></div>
      <div class="notice" id="notice" role="status" hidden>ENERGY LOW <span>ブーストに必要なエネルギーが不足しています</span></div>
      <footer class="bottom-hud">
        <section class="speed-section"><div class="eyebrow">VELOCITY <span data-value="surface">GROUND</span></div><div class="speed-number"><strong data-value="speed">000</strong><span>m/s</span></div><div class="meter speed-meter"><i id="speed-bar"></i></div><div class="meter-scale"><span>0</span><span data-value="mid-speed">56</span><span data-value="max-speed">112</span></div></section>
        <section class="energy-section"><div class="eyebrow">BOOST ENERGY <span><b data-value="energy">100</b> <small>/ <span data-value="max-energy">100</span></small></span></div><div class="meter energy-meter"><i id="energy-bar"></i></div><div class="boost-status"><span class="live-dot"></span><span data-value="ready">QUICK BOOST READY</span><span class="boost-count">QB <b data-value="count">00</b></span></div><div class="altitude">ALTITUDE <b data-value="altitude">0.0</b> m</div></section>
        <section class="controls"><div><kbd>W A S D</kbd><span>移動</span><kbd>SHIFT</kbd><span>Quick Boost</span></div><div><kbd>SPACE</kbd><span>長押しで上昇</span><kbd>MOUSE</kbd><span>カメラ</span></div><p>画面をクリックしてマウスを捕捉 / Esc で解除</p><p class="pad-help">GAMEPAD: 左スティック 移動 / 右 カメラ / A 上昇 / B QB</p></section>
      </footer><button class="hud-return" id="show-hud" hidden>HUD ON / H</button><a class="asset-credit" href="https://polyhaven.com" target="_blank" rel="noopener">Powered by Poly Haven</a>`;
    for (const element of root.querySelectorAll<HTMLElement>('[data-value]')) this.values.set(element.dataset.value!, element);
    this.energyBar = root.querySelector('#energy-bar')!; this.speedBar = root.querySelector('#speed-bar')!;
    this.notice = root.querySelector('#notice')!;
    const listen = (selector: string, action: (button: HTMLButtonElement) => void) => {
      const button = root.querySelector<HTMLButtonElement>(selector)!;
      button.addEventListener('click', () => action(button), { signal: this.abort.signal });
    };
    listen('#telemetry-toggle', button => {
      const panel = root.querySelector<HTMLElement>('#telemetry')!; panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
    });
    listen('#vector-toggle', button => {
      debug.enabled = !debug.enabled; button.setAttribute('aria-pressed', String(debug.enabled));
      root.querySelector<HTMLElement>('.vector-legend')!.hidden = !debug.enabled;
    });
    listen('#tuning-toggle', button => {
      const panel = root.querySelector<HTMLElement>('#tuning')!; panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
    });
    listen('#reset-mech', () => reset());
    const quality = root.querySelector<HTMLSelectElement>('#graphics-quality')!;
    quality.value = new URLSearchParams(location.search).get('quality') || 'ultra';
    quality.addEventListener('change', () => {
      const url = new URL(location.href); url.searchParams.set('quality', quality.value); location.assign(url);
    }, { signal: this.abort.signal });
    const toggleHud = () => {
      const hidden = root.classList.toggle('cinematic-view');
      root.querySelector<HTMLElement>('#show-hud')!.hidden = !hidden;
    };
    listen('#hide-hud', toggleHud); listen('#show-hud', toggleHud);
    window.addEventListener('keydown', event => {
      if (event.code === 'KeyH' && !event.repeat && !(event.target instanceof HTMLInputElement)) toggleHud();
    }, { signal: this.abort.signal });
    this.addSlider('QB Peak Speed', 'quickBoostPeakSpeed', 50, 200, 1);
    this.addSlider('Acceleration Time', 'quickBoostAccelerationTime', 0.015, 0.2, 0.005);
    this.addSlider('Momentum Retention', 'quickBoostMomentumRetention', 0.1, 0.8, 0.01);
    this.addSlider('Air Control', 'airControl', 0.1, 1, 0.01);
    this.addSlider('QB Camera Lag', 'quickBoostCameraLagStrength', 0, 0.85, 0.01);
    this.addSlider('Camera FOV', 'normalFov', 50, 95, 1, true);
    for (const key of Object.keys(mechConfig) as (keyof MechMovementConfig)[]) {
      const label = document.createElement('label'); label.className = 'numeric-row';
      label.append(key);
      const input = document.createElement('input'); input.type = 'number'; input.step = 'any';
      input.value = String(mechConfig[key]); input.dataset.config = key;
      input.addEventListener('change', () => {
        const value = input.valueAsNumber;
        const positive = /MaxSpeed|PeakSpeed|Time$|maxEnergy|Radius|HalfHeight|maxFrameDelta/.test(key);
        const min = key.startsWith('spawn') ? -1000 : ['collisionIterations', 'simulationHz'].includes(key) ? 1 : positive ? 0.001 : 0;
        const max = /Retention|Influence|Control|LagStrength|Deadzone/.test(key) ? 0.99 : 2000;
        if (Number.isFinite(value) && value >= min && value <= max) mechConfig[key] = ['collisionIterations', 'simulationHz'].includes(key) ? Math.floor(value) : value;
        else input.value = String(mechConfig[key]);
        this.refreshInputs();
      }, { signal: this.abort.signal });
      label.append(input); root.querySelector('#numeric-config')!.append(label);
    }
    listen('#restore', () => { Object.assign(mechConfig, this.defaults); Object.assign(cameraConfig, this.cameraDefaults); this.refreshInputs(); });
  }
  private addSlider(label: string, key: string, min: number, max: number, step: number, camera = false): void {
    const config = (camera ? cameraConfig : mechConfig) as unknown as Record<string, number>;
    const row = document.createElement('label'); row.className = 'slider-row';
    row.innerHTML = `<span>${label}<output>${config[key]}</output></span><input type="range" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${config[key]}">`;
    const input = row.querySelector('input')!; input.dataset.config = key;
    if (camera) input.dataset.camera = 'true';
    input.addEventListener('input', () => { config[key] = input.valueAsNumber; this.refreshInputs(); }, { signal: this.abort.signal });
    this.root.querySelector('#sliders')!.append(row);
  }
  private refreshInputs(): void {
    for (const input of this.root.querySelectorAll<HTMLInputElement>('input[data-config]')) {
      const config = (input.dataset.camera ? cameraConfig : mechConfig) as unknown as Record<string, number>;
      input.value = String(config[input.dataset.config!]);
      const output = input.parentElement?.querySelector('output'); if (output) output.textContent = input.value;
    }
  }
  private set(key: string, value: string): void { this.values.get(key)!.textContent = value; }
  update(dt: number, engine: AbstractEngine, player: MechController, camera: MechCamera, input: InputState): void {
    this.elapsed += dt; if (this.elapsed < 0.08) return; this.elapsed = 0;
    const m = player.movement, qb = player.quickBoost, energy = player.energy;
    const speed = m.velocity.length();
    this.set('speed', Math.round(speed).toString().padStart(3, '0'));
    this.set('mid-speed', (mechConfig.quickBoostPeakSpeed / 2).toFixed(0)); this.set('max-speed', mechConfig.quickBoostPeakSpeed.toFixed(0));
    this.set('energy', energy.currentEnergy.toFixed(0)); this.set('max-energy', energy.maxEnergy.toFixed(0));
    this.set('fps', `${engine.getFps().toFixed(0)} FPS`);
    this.set('frame', `${engine.getDeltaTime().toFixed(2)} ms`);
    this.set('position', vector(m.position)); this.set('velocity', vector(m.velocity)); this.set('acceleration', vector(m.acceleration));
    this.set('movement', m.state); this.set('qb', qb.phase); this.set('grounded', m.grounded ? 'YES' : 'NO');
    this.set('input', `${input.right.toFixed(2)} / ${input.forward.toFixed(2)}`); this.set('direction', vector(qb.direction));
    this.set('fov', `${(camera.camera.fov * 180 / Math.PI).toFixed(1)}°`);
    this.set('cooldown', `${qb.cooldownRemaining.toFixed(2)} s${qb.buffered ? ' / BUFFERED' : ''}`);
    this.set('surface', m.state); this.set('count', qb.count.toString().padStart(2, '0'));
    this.set('altitude', Math.max(0, m.position.y - mechConfig.collisionHalfHeight).toFixed(1));
    this.set('ready', qb.active ? 'QUICK BOOST ACTIVE' : qb.cooldownRemaining > 0 ? 'QUICK BOOST RECHARGING' : energy.currentEnergy < mechConfig.quickBoostEnergyCost ? 'ENERGY RECHARGING' : 'QUICK BOOST READY');
    this.energyBar.style.width = `${100 * energy.currentEnergy / Math.max(1, energy.maxEnergy)}%`;
    this.speedBar.style.width = `${Math.min(100, 100 * speed / mechConfig.quickBoostPeakSpeed)}%`;
    this.root.classList.toggle('energy-low', energy.currentEnergy < mechConfig.quickBoostEnergyCost);
    this.notice.hidden = energy.deniedTime <= 0;
  }
  dispose(): void { this.abort.abort(); this.root.replaceChildren(); }
}
