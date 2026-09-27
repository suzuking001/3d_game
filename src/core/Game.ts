import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { SceneManager } from './SceneManager.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from '../input/InputManager.js';
import { MechMovement } from '../player/MechMovement.js';
import { MechController } from '../player/MechController.js';
import { MechView } from '../player/MechView.js';
import { MechCamera } from '../camera/MechCamera.js';
import { CollisionController } from '../physics/CollisionController.js';
import { Environment } from '../graphics/Environment.js';
import { createLighting } from '../graphics/Lighting.js';
import { WorldPostProcessing } from '../graphics/PostProcessing.js';
import { Atmosphere } from '../graphics/Atmosphere.js';
import { mechConfig } from '../config/MechConfig.js';
import { GroundDetector } from '../physics/GroundDetector.js';
import { EffectManager } from '../effects/EffectManager.js';
import { DebugHUD } from '../debug/DebugHUD.js';
import { DebugRenderer } from '../debug/DebugRenderer.js';
import { cameraConfig } from '../config/CameraConfig.js';
import { BeamCombat } from '../combat/BeamCombat.js';
import { ArmorCombat } from '../combat/ArmorCombat.js';

export class Game {
  private readonly loop: GameLoop;
  private readonly input: InputManager;
  private readonly environment: Environment;
  readonly player: MechController;
  readonly camera: MechCamera;
  private readonly view: MechView;
  private readonly effects: EffectManager;
  private readonly debug: DebugRenderer;
  private readonly hud: DebugHUD;
  private readonly atmosphere: Atmosphere;
  private readonly postProcessing: WorldPostProcessing;
  private readonly combat: BeamCombat;
  private readonly armor: ArmorCombat;
  private readonly renderPosition = Vector3.Zero();
  private readonly resize = () => this.manager.engine.resize();
  private constructor(private readonly manager: SceneManager, canvas: HTMLCanvasElement, view: MechView) {
    this.environment = new Environment(manager.scene);
    const movement = new MechMovement(mechConfig, new CollisionController(this.environment.boxes, mechConfig));
    this.player = new MechController(movement, new GroundDetector(manager.physics, mechConfig)); this.input = new InputManager(canvas);
    this.camera = new MechCamera(manager.scene, movement.position); this.view = view;
    createLighting(manager.scene, [...this.environment.shadowCasters, ...this.view.root.getChildMeshes()]);
    this.atmosphere = new Atmosphere(manager.scene);
    this.effects = new EffectManager(manager.scene, this.view.exhaust);
    this.debug = new DebugRenderer(manager.scene);
    this.hud = new DebugHUD(document.querySelector('#hud')!, manager.backend, this.debug, () => {
      this.player.reset(); this.camera.reset(movement.position); this.input.clear(); this.combat.reset(); this.armor.reset();
    });
    this.combat = new BeamCombat(manager.scene, this.view.weaponAnchor);
    this.postProcessing = new WorldPostProcessing(manager.scene, this.camera.camera);
    this.armor = new ArmorCombat(manager.scene,this.view.root,this.camera,this.combat.targets,broken=>this.combat.armorHit(broken));
    this.loop = new GameLoop(manager.engine, {
      input: dt => { this.input.sample(dt); this.camera.readLook(this.input.state); },
      simulate: dt => {
        if(movement.position.y < -100)this.input.state.resetPressed=true;
        const reset = this.input.state.resetPressed;
        if(this.armor.armor.hull<=0&&!reset){
          Object.assign(this.input.state,{right:0,forward:0,ascend:false,quickBoostPressed:false,fireHeld:false,firePressed:false,chargeHeld:false,chargeReleased:false,combatCancelled:true});
        }
        this.player.update(dt, this.input.state, this.camera.forward, this.camera.right);
        this.combat.simulate(dt, this.input.state, this.player.energy);
        if(reset)this.armor.reset();
        this.armor.simulate(dt,movement.previousPosition,movement.position);
        if (reset) this.camera.reset(movement.position);
        if (this.player.quickBoost.started) {
          this.camera.effects.kick(mechConfig.quickBoostCameraShakeStrength);
          this.effects.boostStarted(movement.position);
          this.combat.boostStarted();
        }
        if (this.player.landed) this.camera.effects.kick(cameraConfig.landingShake);
        this.input.consumeEdges();
      },
      render: (dt, alpha) => {
        Vector3.LerpToRef(movement.previousPosition, movement.position, alpha, this.renderPosition);
        this.view.update(this.renderPosition, movement.yaw, dt, this.player);
        const qb = this.player.quickBoost, intensity = qb.active ? Math.min(1, qb.speed / mechConfig.quickBoostPeakSpeed) : 0;
        const lateral = qb.direction.x * this.camera.right.x + qb.direction.z * this.camera.right.z;
        this.camera.effects.update(dt, mechConfig.quickBoostCameraFovKick * intensity + this.combat.weapon.recoil * 1.3, lateral * intensity);
        this.camera.update(dt, this.renderPosition, mechConfig.quickBoostCameraLagStrength * intensity);
        this.combat.render(dt, this.camera, qb.active ? 1 : this.player.boost.ascending ? .8 : 0);
        this.armor.render(dt,this.camera);
        this.effects.update(dt, this.renderPosition, movement.velocity, qb.active, this.player.boost.ascending);
        this.atmosphere.update(dt); this.postProcessing.update(intensity, dt, this.effects.thruster, this.combat.flashPower);
        this.debug.update(this.player, this.camera);
        this.hud.update(dt, manager.engine, this.player, this.camera, this.input.state);
        manager.scene.render();
      },
    });
    window.addEventListener('resize', this.resize);
  }
  static async create(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<Game> {
    const manager = await SceneManager.create(canvas);
    if (signal?.aborted) { manager.dispose(); throw new DOMException('Initialization cancelled', 'AbortError'); }
    try {
      const view = await MechView.create(manager.scene);
      if (signal?.aborted) throw new DOMException('Initialization cancelled', 'AbortError');
      return new Game(manager, canvas, view);
    }
    catch (error) { manager.dispose(); throw error; }
  }
  start(): void { this.loop.start(); }
  dispose(): void {
    this.loop.stop(); this.input.dispose(); this.armor.dispose(); this.combat.dispose(); this.hud.dispose(); window.removeEventListener('resize', this.resize);
    this.environment.dispose(); this.manager.dispose();
  }
}
