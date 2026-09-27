import { Engine } from '@babylonjs/core/Engines/engine.js';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine.js';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent.js';
import '@babylonjs/core/Culling/ray.js';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.multiRender.js';
import '@babylonjs/core/Engines/Extensions/engine.multiRender.js';
import HavokPhysics from '@babylonjs/havok';
import havokWasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { graphicsConfig, applyGraphicsQuality } from '../config/GraphicsConfig.js';
import { createSkyEnvironment } from '../graphics/SkyEnvironment.js';

export class SceneManager {
  private constructor(readonly engine: AbstractEngine, readonly scene: Scene, readonly backend: string, readonly physics: HavokPlugin) {}
  static async create(canvas: HTMLCanvasElement): Promise<SceneManager> {
    const quality = new URLSearchParams(location.search).get('quality');
    if (quality === 'high' || quality === 'low') applyGraphicsQuality(quality);
    let engine: AbstractEngine;
    let backend = 'WebGPU';
    if (!new URLSearchParams(location.search).has('webgl') && await WebGPUEngine.IsSupportedAsync) {
      const gpu = new WebGPUEngine(canvas, { antialias: true });
      try { await gpu.initAsync(); engine = gpu; }
      catch (error) { console.warn('WebGPU init failed; falling back to WebGL2', error); gpu.dispose(); engine = new Engine(canvas, true); backend = 'WebGL2'; }
    } else { engine = new Engine(canvas, true); backend = 'WebGL2'; }
    if (engine instanceof Engine && engine.webGLVersion < 2) {
      engine.dispose(); throw new Error('WebGL2またはWebGPUが必要です。');
    }
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, graphicsConfig.pixelRatioLimit));
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString('#747b7eff');
    scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = graphicsConfig.fogDensity;
    scene.fogColor = Color3.FromHexString('#747b7e');
    createSkyEnvironment(scene);
    const havok = await HavokPhysics({ locateFile: () => havokWasmUrl });
    const physics = new HavokPlugin(true, havok);
    if (!scene.enablePhysics(new Vector3(0, -42, 0), physics)) {
      scene.dispose(); engine.dispose(); throw new Error('Havokの初期化に失敗しました。');
    }
    return new SceneManager(engine, scene, backend, physics);
  }
  dispose(): void { this.scene.dispose(); this.engine.dispose(); }
}
