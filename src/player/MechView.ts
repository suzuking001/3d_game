import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Axis } from '@babylonjs/core/Maths/math.axis.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/glTFFileLoader.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { MechController } from './MechController.js';
import { assetUrl } from '../core/AssetUrl.js';

/** CC0 skinned knight. Animation never moves the authoritative collision body. */
export class MechView {
  readonly root: TransformNode;
  readonly exhaust: TransformNode[] = [];
  private groups: AnimationGroup[] = [];
  private chest?: TransformNode;
  private mount?: TransformNode;
  private engines: TransformNode[] = [];
  private readonly inverse = Matrix.Identity();
  get weaponAnchor(): TransformNode { return this.mount ?? this.root; }
  private constructor(scene: Scene) { this.root = new TransformNode('armored-warrior', scene); }
  static async create(scene: Scene): Promise<MechView> {
    const view = new MechView(scene);
    const asset = await ImportMeshAsync(assetUrl('models/warrior.glb'), scene);
    const model = asset.meshes[0]; model.parent = view.root;
    model.scaling.scaleInPlace(0.85); model.position.y = -1.75;
    model.rotationQuaternion = (model.rotationQuaternion ?? Quaternion.Identity()).multiply(Quaternion.RotationAxis(Axis.Y,Math.PI));
    const normal = new Texture(assetUrl('textures/rusty_metal_02-nor_gl.jpg'), scene, false, false); normal.level = 0.12;
    const weathering = new Texture(assetUrl('textures/rusty_metal_02-Diffuse.jpg'), scene, false, false);
    for (const mesh of asset.meshes) {
      mesh.isPickable = false; mesh.receiveShadows = true;
      if (mesh.material instanceof PBRMaterial && mesh.material.metallic! > 0.5) {
        mesh.material.bumpTexture = normal; mesh.material.roughness = 0.53;
        if (mesh.material.name === 'White') {
          mesh.material.albedoTexture = weathering; mesh.material.albedoColor.set(.68,.75,.8);
        }
      }
    }
    view.groups = asset.animationGroups;
    for (const group of view.groups) group.stop();
    for (const group of view.groups) {
      group.enableBlending = false; group.weight = group.name === 'Idle' ? 1 : 0; group.start(true);
    }
    // These outlets follow the animated chest bone.
    view.chest = asset.transformNodes.find(n => n.name === 'DEF-spine.003');
    const mount = new TransformNode('chest exhaust mount', scene); mount.parent = view.root; mount.position.y = .8; view.mount = mount;
    const metal = new PBRMaterial('blackened exhaust housings', scene);
    metal.albedoColor = Color3.FromHexString('#252a2b'); metal.metallic = 0.85; metal.roughness = 0.44;
    for (const side of [-1, 1]) {
      const engine = MeshBuilder.CreateCylinder('warrior jet housing', { height: 0.65, diameter: 0.28, tessellation: 24 }, scene);
      engine.parent = mount; engine.position.set(side * 0.35, -.2, -.48); view.engines.push(engine);
      engine.material = metal; engine.receiveShadows = true; engine.isPickable = false;
      const nozzle = new TransformNode('exhaust outlet', scene); nozzle.parent = engine; nozzle.position.y = -0.34; view.exhaust.push(nozzle);
    }
    return view;
  }
  update(position: Vector3, yaw: number, dt: number, player: MechController): void {
    this.root.position.copyFrom(position); this.root.rotation.y = yaw;
    if (this.chest && this.mount) {
      this.root.computeWorldMatrix(true).invertToRef(this.inverse); this.chest.computeWorldMatrix(true);
      Vector3.TransformCoordinatesToRef(this.chest.getAbsolutePosition(),this.inverse,this.mount.position);
    }
    for (const engine of this.engines) engine.rotation.x += ((player.quickBoost.active ? Math.PI / 2 : 0) - engine.rotation.x) * (1 - Math.exp(-dt * 22));
    const m = player.movement, speed = Math.hypot(m.velocity.x, m.velocity.z);
    const clip = player.quickBoost.active ? 'Boost' : player.boost.ascending ? 'Ascend' : !m.grounded ? 'Fall' : speed > 0.8 ? 'Run' : 'Idle';
    const blend = 1 - Math.exp(-dt * 12);
    for (const group of this.groups) {
      const current = group.animatables[0]?.weight ?? 0;
      group.setWeightForAllAnimatables(current + ((group.name === clip ? 1 : 0) - current) * blend);
      group.speedRatio = group.name === 'Run' ? Math.max(0.5, Math.min(2.4, speed / 7)) : 1;
    }
  }
}
