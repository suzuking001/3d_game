import pathlib, sys, os, json
sys.path.insert(0, str(pathlib.Path(os.environ['LOCALAPPDATA']) / 'vector-mech-asset-tools'))
import bpy
root = pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root / 'art-source/warrior/Knight.blend'), load_ui=False, use_scripts=False)
report = {'objects': [], 'actions': [a.name for a in bpy.data.actions]}
for o in bpy.data.objects:
    entry = {'name':o.name, 'type':o.type, 'location':list(o.location), 'dimensions':list(o.dimensions), 'hidden':o.hide_render, 'parent':o.parent.name if o.parent else None}
    if o.type == 'MESH':
        entry.update(vertices=len(o.data.vertices), materials=[m.name for m in o.data.materials if m], modifiers=[(m.name,m.type) for m in o.modifiers])
    if o.type == 'ARMATURE':
        entry['bones'] = [{'name':b.name,'head':list(b.head_local),'tail':list(b.tail_local),'deform':b.use_deform} for b in o.data.bones]
    report['objects'].append(entry)
(root/'art-source/warrior/inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps([{k:v for k,v in entry.items() if k != 'bones'} for entry in report['objects']],indent=2))
print('ACTIONS', report['actions'])
