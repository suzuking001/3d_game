import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';
import { SSRRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline.js';
import { MotionBlurPostProcess } from '@babylonjs/core/PostProcesses/motionBlurPostProcess.js';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves.js';
import type { Camera } from '@babylonjs/core/Cameras/camera.js';
import type { Scene } from '@babylonjs/core/scene.js';
import '@babylonjs/core/Rendering/depthRendererSceneComponent.js';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent.js';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent.js';
import { graphicsConfig as config } from '../config/GraphicsConfig.js';
import { createSolarSky } from './SolarSky.js';
import { HeatHaze } from '../effects/HeatHaze.js';
import type { ThrusterEffect } from '../effects/ThrusterEffect.js';

export class WorldPostProcessing {
  private motion?: MotionBlurPostProcess;
  private heat: HeatHaze;
  private readonly pipeline: DefaultRenderingPipeline;
  constructor(scene: Scene, camera: Camera) {
    if (config.ssaoEnabled && SSAO2RenderingPipeline.IsSupported) {
      const ao = new SSAO2RenderingPipeline('contact occlusion', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
      // Babylon 9.28 sets this only when its original-color pass first draws.
      // Other ULTRA passes can compile first; seed the camera before that first frame
      // so SSAO binds its uniforms/noise texture even while the copy pass is still compiling.
      (ao as unknown as { _thinSSAORenderingPipeline: { camera: Camera } })._thinSSAORenderingPipeline.camera = camera;
      ao.radius = 2.2; ao.totalStrength = 0.85; ao.samples = 16; ao.maxZ = 220; ao.expensiveBlur = true;
    }
    if (config.ssrEnabled) {
      const reflections = new SSRRenderingPipeline('wet surface reflections', scene, [camera]);
      reflections.maxDistance = 120; reflections.maxSteps = 64; reflections.step = 4; reflections.thickness = 0.8;
      reflections.reflectivityThreshold = 0.12; reflections.blurDispersionStrength = 0.03;
    }
    const processing = scene.imageProcessingConfiguration;
    processing.toneMappingEnabled = true; processing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    processing.exposure = config.exposure; processing.contrast = config.contrast;
    processing.vignetteEnabled = true; processing.vignetteWeight = 1.2; processing.vignetteCameraFov = 0.5;
    const curves = new ColorCurves(); curves.globalSaturation = -15;
    curves.shadowsHue = 205; curves.shadowsDensity = 10; curves.highlightsHue = 38; curves.highlightsDensity = 8;
    processing.colorCurves = curves; processing.colorCurvesEnabled = true;
    const pipeline = new DefaultRenderingPipeline('cinematic world', true, scene, [camera], false);
    this.pipeline=pipeline;
    pipeline.samples = 4; pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = config.bloomEnabled; pipeline.bloomThreshold = 0.9;
    pipeline.bloomWeight = config.bloomWeight; pipeline.bloomKernel = 48;
    pipeline.sharpenEnabled = true; pipeline.sharpen.edgeAmount = 0.14;
    pipeline.grainEnabled = true; pipeline.grain.intensity = config.grainIntensity; pipeline.grain.animated = true;
    pipeline.chromaticAberrationEnabled = true; pipeline.chromaticAberration.aberrationAmount = config.chromaticAberration;
    pipeline.depthOfFieldEnabled = config.depthOfFieldEnabled;
    pipeline.depthOfField.focusDistance = 17000; pipeline.depthOfField.focalLength = 45;
    pipeline.depthOfField.fStop = 5.6; pipeline.depthOfField.lensSize = 35;
    pipeline.prepare();
    createSolarSky(scene, camera);
    if (config.motionBlurEnabled) {
      this.motion = new MotionBlurPostProcess('QB motion blur', scene, 1, camera);
      this.motion.isObjectBased = false; this.motion.motionBlurSamples = 8; this.motion.motionStrength = 0;
    }
    this.heat = new HeatHaze(scene, camera);
  }
  update(boostIntensity: number, dt: number, thruster: ThrusterEffect, weaponFlash=0): void {
    this.pipeline.bloomWeight=config.bloomWeight+weaponFlash*.6;
    this.pipeline.chromaticAberration.aberrationAmount=config.chromaticAberration+weaponFlash*3;
    if (this.motion) this.motion.motionStrength = boostIntensity * 0.12;
    this.heat.update(dt,thruster);
  }
}
