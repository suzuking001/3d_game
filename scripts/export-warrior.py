"""Convert crownjoshua's CC0 knight to a clean, animated glTF. Never run embedded scripts."""
import pathlib, sys, os, math
sys.path.insert(0, str(pathlib.Path(os.environ['LOCALAPPDATA']) / 'vector-mech-asset-tools'))
import bpy
from mathutils import Quaternion, Vector, Matrix
root = pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'art-source/warrior/Knight.blend'), load_ui=False, use_scripts=False)
old = bpy.data.objects['rig']
names = ['Man','Belt','BreastPlate','cuisse','Gauntlets','Helmet','Shoes','Shoulder-Plate']
meshes = [bpy.data.objects[n] for n in names]
keep = ['DEF-spine'+s for s in ['', '.001','.002','.003','.004','.005','.006']]
for side in ['L','R']:
    keep += ['DEF-'+n+'.'+side for n in ['shoulder','upper_arm','forearm','hand','thigh','shin','foot','toe']]
rest = {n:(old.data.bones[n].head_local.copy(), old.data.bones[n].tail_local.copy(), old.data.bones[n].matrix_local.copy()) for n in keep}
for side in ['L','R']:
    for limb in ['upper_arm','forearm','thigh','shin']:
        rest['DEF-'+limb+'.'+side] = (rest['DEF-'+limb+'.'+side][0], old.data.bones['DEF-'+limb+'.'+side+'.001'].tail_local.copy(), rest['DEF-'+limb+'.'+side][2])
arm = bpy.data.armatures.new('WarriorSkeleton'); rig = bpy.data.objects.new('Warrior',arm); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
for name,(head,tail,matrix) in rest.items():
    b=arm.edit_bones.new(name); b.head=head; b.tail=tail; b.align_roll(matrix.to_3x3() @ Vector((0,0,1)))
for i,name in enumerate(keep[:7]):
    if i: arm.edit_bones[name].parent=arm.edit_bones[keep[i-1]]
for side in ['L','R']:
    for chain,parent in [(['shoulder','upper_arm','forearm','hand'],'DEF-spine.003'), (['thigh','shin','foot','toe'],'DEF-spine')]:
        for n in chain:
            name='DEF-'+n+'.'+side; arm.edit_bones[name].parent=arm.edit_bones[parent]; parent=name
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
    o.animation_data_clear(); o.parent=rig; o.matrix_parent_inverse=Matrix.Translation((0,0,2.084846258163452)); o.hide_render=False; o.hide_set(False)
    for mod in list(o.modifiers):
        if mod.type=='ARMATURE': mod.object=rig
        elif mod.type=='BUILD': o.modifiers.remove(mod)
    # Collapse split limb segments and facial/finger controls into this runtime skeleton.
    mapping={}
    for g in o.vertex_groups:
        n=g.name
        if n in keep: mapping[g.index]=n
        elif n.startswith('DEF-'):
            target=n.replace('.L.001','.L').replace('.R.001','.R')
            if target in keep: mapping[g.index]=target
            elif any(s in n for s in ['finger','thumb','palm','f_']): mapping[g.index]='DEF-hand.'+('L' if '.L' in n else 'R')
            elif n.startswith('DEF-pelvis'): mapping[g.index]='DEF-spine'
            else: mapping[g.index]='DEF-spine.006'
    weights=[[(mapping[g.group],g.weight) for g in v.groups if g.group in mapping] for v in o.data.vertices]
    o.vertex_groups.clear()
    groups={n:o.vertex_groups.new(name=n) for n in keep}
    for v,ws in zip(o.data.vertices,weights):
        merged={}
        for n,w in ws: merged[n]=merged.get(n,0)+w
        total=sum(merged.values())
        for n,w in merged.items(): groups[n].add([v.index],w/total,'REPLACE')
    for p in o.data.polygons: p.use_smooth=True
for o in list(bpy.data.objects):
    if o not in meshes and o != rig: bpy.data.objects.remove(o,do_unlink=True)
for m in bpy.data.materials:
    m.use_nodes=True
    m.node_tree.nodes.clear()
    bs=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); output=m.node_tree.nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface'])
    name=m.name.lower()
    cloth=any(s in name for s in ['skin','black','body','dzenis'])
    gold='gold' in name
    bs.inputs['Base Color'].default_value= ((.065,.075,.075,1) if cloth else (.12,.105,.07,1) if gold else (.32,.37,.39,1))
    bs.inputs['Metallic'].default_value=0 if cloth else .82
    bs.inputs['Roughness'].default_value=.87 if cloth else .43
scene=bpy.context.scene; scene.render.fps=30
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
def rotate(n,axis,angle):
    b=rig.pose.bones[n]; q=b.bone.matrix_local.to_quaternion()
    b.rotation_mode='QUATERNION'; b.rotation_quaternion=q.inverted() @ Quaternion(axis,angle) @ q
def pose(mode,t):
    for b in rig.pose.bones: b.rotation_quaternion=Quaternion(); b.location=(0,0,0)
    running=mode=='Run'; flying=mode in ['Boost','Ascend','Fall']
    cycle=math.sin(t*math.tau)
    # Lower the pelvis to keep the extended stance leg on the floor throughout the stride.
    hip_z=-2.0*(1-math.cos(cycle*.55)) if running else .012*math.sin(t*math.tau)
    rig.pose.bones['DEF-spine'].location=rig.data.bones['DEF-spine'].matrix_local.to_quaternion().inverted() @ Vector((0,0,hip_z))
    rotate('DEF-spine',(1,0,0),-.22 if running else -.48 if mode=='Boost' else .06 if flying else 0)
    for side,sign in [('L',-1),('R',1)]:
        rotate('DEF-upper_arm.'+side,(0,1,0),sign*1.03)
        b=rig.pose.bones['DEF-upper_arm.'+side]
        q=b.bone.matrix_local.to_quaternion()
        b.rotation_quaternion=q.inverted() @ (Quaternion((1,0,0),sign*cycle*.55 if running else -.25 if flying else .04*cycle) @ Quaternion((0,1,0),sign*1.03)) @ q
        elbow_axis=Quaternion((0,1,0),sign*1.03).inverted() @ Vector((1,0,0))
        rotate('DEF-forearm.'+side,elbow_axis,.9 if running else .5 if flying else .14)
        angle=sign*cycle*.55 if running else .35 if flying else 0
        rotate('DEF-thigh.'+side,(1,0,0),angle)
        rotate('DEF-shin.'+side,(1,0,0),-max(0,sign*cycle)*1.15 if running else -.65 if flying else 0)
        rotate('DEF-foot.'+side,(1,0,0),-.15 if running else .25 if flying else 0)
for mode,seconds in [('Idle',2),('Run',.8),('Boost',1),('Ascend',1),('Fall',1)]:
    rig.animation_data_create(); rig.animation_data.action=None
    for f in range(round(seconds*30)+1):
        scene.frame_set(f+1); pose(mode,f/(seconds*30))
        for b in rig.pose.bones:
            b.keyframe_insert('rotation_quaternion',frame=f+1,group=b.name); b.keyframe_insert('location',frame=f+1,group=b.name)
    action=rig.animation_data.action; action.name=mode
    track=rig.animation_data.nla_tracks.new(); track.name=mode
    track.strips.new(mode,1,action); rig.animation_data.action=None
for track in rig.animation_data.nla_tracks: track.mute=True
pose('Idle',0); scene.frame_set(1)
out=root/'public/models'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for o in meshes: o.select_set(True)
rig.data.pose_position='POSE'
bpy.ops.export_scene.gltf(filepath=str(out/'warrior.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_def_bones=True,export_rest_position_armature=True)
rig.data.pose_position='POSE'; pose('Idle',0)
print('EXPORTED',out/'warrior.glb')
# Keep a reproducible editable source and a neutral front view for asset inspection.
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art-source/warrior/warrior-runtime.blend'))
scene.render.engine='CYCLES'; scene.cycles.samples=12; scene.cycles.device='CPU'
scene.render.resolution_x=700; scene.render.resolution_y=850; scene.render.resolution_percentage=100
scene.world.color=(.2,.2,.2)
bpy.ops.object.camera_add(location=(6,9,4.5)); cam=bpy.context.object; cam.rotation_euler=(Vector((0,0,2.1))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=5; scene.camera=cam
for loc,power,size in [((3,4,7),1400,5),((-4,2,4),1000,4),((1,-4,6),1800,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; l.rotation_euler=(Vector((0,0,2))-l.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(root/'art-source/warrior/preview.png'); bpy.ops.render.render(write_still=True)
