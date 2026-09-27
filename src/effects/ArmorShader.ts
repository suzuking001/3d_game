import { ShaderStore } from '@babylonjs/core/Engines/shaderStore.js';

ShaderStore.ShadersStore.aegisVertexShader=`precision highp float;
attribute vec3 position; attribute vec3 normal;
uniform mat4 world; uniform mat4 worldViewProjection; uniform vec3 radii;
varying vec3 local; varying vec3 positionW; varying vec3 normalW;
void main(){local=position;positionW=(world*vec4(position,1.)).xyz;normalW=normalize(mat3(world)*(normal/(radii*radii)));gl_Position=worldViewProjection*vec4(position,1.);}`;
ShaderStore.ShadersStore.aegisPixelShader=`precision highp float;
varying vec3 local; varying vec3 positionW; varying vec3 normalW;
uniform vec3 eye; uniform vec4 field; uniform vec4 hit0;uniform vec4 hit1;uniform vec4 hit2;uniform vec4 hit3;
float impact(vec4 h){float d=acos(clamp(dot(normalize(local),h.xyz),-1.,1.));float age=h.w;float delta=(d-age*3.4)*13.;
 return (exp(-delta*delta)*exp(-age*4.)+exp(-d*d*70.)*exp(-age*12.))*step(age,1.2);}
void main(){float rim=pow(clamp(1.-abs(dot(normalize(normalW),normalize(eye-positionW))),0.,1.),3.);
 float wave=impact(hit0)+impact(hit1)+impact(hit2)+impact(hit3);
 float turbulence=sin(local.y*31.-field.x*3.+sin(local.z*17.+field.x))*sin(local.x*37.+local.z*23.+field.x*4.);
 float wisps=smoothstep(.75,.97,turbulence);
 float base=(rim*.04+wisps*.009)*field.y;
 float energy=base+wave*.8+field.z*rim*.9;
 vec3 color=mix(vec3(.14,1.35,1.1),vec3(3.5,2.4,.9),clamp(wave+field.z,0.,1.));
 gl_FragColor=vec4(color*(1.+wave*2.),clamp(energy,0.,.75));}`;

ShaderStore.ShadersStoreWGSL.aegisVertexShader=`attribute position:vec3f; attribute normal:vec3f;
uniform world:mat4x4f; uniform worldViewProjection:mat4x4f; uniform radii:vec3f;
varying local:vec3f; varying positionW:vec3f; varying normalW:vec3f;
@vertex fn main(input:VertexInputs)->FragmentInputs {
 vertexOutputs.local=vertexInputs.position;vertexOutputs.positionW=(uniforms.world*vec4f(vertexInputs.position,1.)).xyz;
 vertexOutputs.normalW=normalize((uniforms.world*vec4f(vertexInputs.normal/(uniforms.radii*uniforms.radii),0.)).xyz);
 vertexOutputs.position=uniforms.worldViewProjection*vec4f(vertexInputs.position,1.);}`;
ShaderStore.ShadersStoreWGSL.aegisPixelShader=`varying local:vec3f; varying positionW:vec3f; varying normalW:vec3f;
uniform eye:vec3f;uniform field:vec4f;uniform hit0:vec4f;uniform hit1:vec4f;uniform hit2:vec4f;uniform hit3:vec4f;
fn impact(h:vec4f,p:vec3f)->f32 {let d=acos(clamp(dot(normalize(p),h.xyz),-1.,1.));let age=h.w;let delta=(d-age*3.4)*13.;
 return (exp(-delta*delta)*exp(-age*4.)+exp(-d*d*70.)*exp(-age*12.))*step(age,1.2);}
@fragment fn main(input:FragmentInputs)->FragmentOutputs {
 let rim=pow(clamp(1.-abs(dot(normalize(input.normalW),normalize(uniforms.eye-input.positionW))),0.,1.),3.);
 let wave=impact(uniforms.hit0,input.local)+impact(uniforms.hit1,input.local)+impact(uniforms.hit2,input.local)+impact(uniforms.hit3,input.local);
 let turbulence=sin(input.local.y*31.-uniforms.field.x*3.+sin(input.local.z*17.+uniforms.field.x))*sin(input.local.x*37.+input.local.z*23.+uniforms.field.x*4.);
 let wisps=smoothstep(.75,.97,turbulence);let base=(rim*.04+wisps*.009)*uniforms.field.y;
 let energy=base+wave*.8+uniforms.field.z*rim*.9;
 let color=mix(vec3f(.14,1.35,1.1),vec3f(3.5,2.4,.9),clamp(wave+uniforms.field.z,0.,1.));
 fragmentOutputs.color=vec4f(color*(1.+wave*2.),clamp(energy,0.,.75));}`;

ShaderStore.ShadersStore.aegisRefractionPixelShader=`precision highp float;
varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D depthSampler;
uniform vec4 ellipse;uniform vec4 field;
void main(){vec2 q=(vUV-ellipse.xy)/max(ellipse.zw,vec2(.001));float r=length(q);
 float band=smoothstep(.35,.9,r)*(1.-smoothstep(.95,1.05,r));
 float visible=step(field.w,texture2D(depthSampler,vUV).r);
 float wave=sin(r*52.-field.x*8.+sin(q.y*17.+field.x));
 vec2 offset=normalize(q+vec2(.00001))*wave*band*visible*(.00025*field.y+.0018*field.z);
 gl_FragColor=texture2D(textureSampler,clamp(vUV+offset,vec2(.001),vec2(.999)));}`;
ShaderStore.ShadersStoreWGSL.aegisRefractionPixelShader=`varying vUV:vec2f;
var textureSamplerSampler:sampler;var textureSampler:texture_2d<f32>;var depthSamplerSampler:sampler;var depthSampler:texture_2d<f32>;
uniform ellipse:vec4f;uniform field:vec4f;
@fragment fn main(input:FragmentInputs)->FragmentOutputs {
 let q=(input.vUV-uniforms.ellipse.xy)/max(uniforms.ellipse.zw,vec2f(.001));let r=length(q);
 let band=smoothstep(.35,.9,r)*(1.-smoothstep(.95,1.05,r));
 let visible=step(uniforms.field.w,textureSample(depthSampler,depthSamplerSampler,input.vUV).r);
 let wave=sin(r*52.-uniforms.field.x*8.+sin(q.y*17.+uniforms.field.x));
 let offset=normalize(q+vec2f(.00001))*wave*band*visible*(.00025*uniforms.field.y+.0018*uniforms.field.z);
 fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,clamp(input.vUV+offset,vec2f(.001),vec2f(.999)));}`;
