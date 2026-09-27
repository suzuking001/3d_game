import { synthesizeDischarge, synthesizeEngineLoop, type DischargeSound } from './AudioSynthesis.js';

/** Shared bus for heavy weapon/engine sound. No downloaded audio or autoplay. */
export class GameAudio {
  private context?:AudioContext;
  private bus?:DynamicsCompressorNode;
  private master?:GainNode;
  private hum?:OscillatorNode;
  private humGain?:GainNode;
  private engine?:AudioBufferSourceNode;
  private engineGain?:GainNode;
  private engineFilter?:BiquadFilterNode;
  private readonly buffers=new Map<string,AudioBuffer>();
  private readonly abort=new AbortController();
  muted=false;
  constructor() {
    const unlock=()=>{this.initialize();void this.context?.resume().catch(()=>{});};
    window.addEventListener('pointerdown',unlock,{signal:this.abort.signal});window.addEventListener('keydown',unlock,{signal:this.abort.signal});
    const silence=()=>{const ctx=this.context;if(!ctx)return;this.humGain?.gain.setValueAtTime(0,ctx.currentTime);this.engineGain?.gain.setValueAtTime(0,ctx.currentTime);};
    window.addEventListener('blur',silence,{signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();},{signal:this.abort.signal});
  }
  private buffer(samples:Float32Array):AudioBuffer {
    const ctx=this.context!,buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);
    buffer.getChannelData(0).set(samples);return buffer;
  }
  private initialize():void {
    if(this.context||!('AudioContext' in window))return;
    const ctx=this.context=new AudioContext();
    this.master=ctx.createGain();this.master.gain.value=this.muted?0:.65;this.master.connect(ctx.destination);
    this.bus=ctx.createDynamicsCompressor();this.bus.threshold.value=-12;this.bus.knee.value=12;this.bus.ratio.value=5;this.bus.attack.value=.004;this.bus.release.value=.2;this.bus.connect(this.master);
    this.hum=ctx.createOscillator();this.hum.type='triangle';this.humGain=ctx.createGain();this.humGain.gain.value=0;
    const humFilter=ctx.createBiquadFilter();humFilter.type='lowpass';humFilter.frequency.value=550;
    this.hum.connect(humFilter).connect(this.humGain).connect(this.bus);this.hum.start();
    this.engine=ctx.createBufferSource();this.engine.buffer=this.buffer(synthesizeEngineLoop(ctx.sampleRate));this.engine.loop=true;
    this.engineGain=ctx.createGain();this.engineGain.gain.value=0;this.engineFilter=ctx.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.Q.value=.65;
    this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.bus);this.engine.start();
  }
  update(charge:number,thrust:number):void {
    const ctx=this.context;if(!ctx||ctx.state!=='running')return;
    const visible=!document.hidden&&document.hasFocus(),c=visible?charge:0,power=visible?thrust:0;
    this.hum!.frequency.setTargetAtTime(48+c*125,ctx.currentTime,.04);this.humGain!.gain.setTargetAtTime(c*.2,ctx.currentTime,.04);
    this.engine!.playbackRate.setTargetAtTime(.72+power*.55,ctx.currentTime,.055);
    this.engineFilter!.frequency.setTargetAtTime(220+power*1600,ctx.currentTime,.04);
    this.engineGain!.gain.setTargetAtTime(power*.48,ctx.currentTime,power>0?.035:.14);
  }
  private play(kind:DischargeSound,power:number):void {
    const ctx=this.context;if(!ctx||ctx.state!=='running'||this.muted)return;
    const level=Math.round(Math.max(1,Math.min(4,power))*4)/4,key=`${kind}:${level}`;
    let buffer=this.buffers.get(key);if(!buffer){buffer=this.buffer(synthesizeDischarge(kind,level,ctx.sampleRate));this.buffers.set(key,buffer);}
    const source=ctx.createBufferSource();source.buffer=buffer;
    const gain=ctx.createGain();gain.gain.value=kind==='armorHit'?.35:kind==='armorBreak'?.8:1;
    source.connect(gain).connect(this.bus!);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};
  }
  fire(power:number):void {this.play('beam',power);}
  boostBurst():void {this.play('quickBoost',1);}
  armorHit(broken:boolean):void {this.play(broken?'armorBreak':'armorHit',broken?2:1);}
  toggleMute():boolean {
    this.muted=!this.muted;if(this.context)this.master!.gain.setTargetAtTime(this.muted?0:.65,this.context.currentTime,.025);return this.muted;
  }
  dispose():void {this.abort.abort();this.hum?.stop();this.engine?.stop();if(this.context)void this.context.close();}
}
