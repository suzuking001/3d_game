export type DischargeSound='beam'|'quickBoost';
/** Deterministic original PCM: sub bass, resonant metal, filtered pressure noise and an electrical tail. */
export function synthesizeDischarge(kind:DischargeSound,power:number,sampleRate:number):Float32Array {
  const strength=Math.max(1,Math.min(4,power)),beam=kind==='beam';
  const duration=beam?.55+strength*.16:.9,pcm=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=0x1571af,low=0,mid=0,phase=0,electricPhase=0;
  const lowAlpha=1-Math.exp(-2*Math.PI*180/sampleRate),midAlpha=1-Math.exp(-2*Math.PI*(beam?2200:1200)/sampleRate);
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/2147483648-1;low+=(noise-low)*lowAlpha;mid+=(noise-mid)*midAlpha;
    phase+=2*Math.PI*((beam?46:39)+(beam?60:70)*Math.exp(-t*14))/sampleRate;
    electricPhase+=2*Math.PI*(95+(beam?780:240)*Math.exp(-t*9))/sampleRate;
    const attack=Math.min(1,t/.003),body=Math.exp(-t*(beam?5.5/Math.sqrt(strength):5));
    const bass=Math.sin(phase)*body*.8;
    const pressure=low*Math.exp(-t*4)*2.5+mid*Math.exp(-t*(beam?10:7))*.55;
    const metal=(Math.sin(t*2*Math.PI*143)+Math.sin(t*2*Math.PI*227)*.55)*Math.exp(-t*22)*.15;
    const electric=Math.sin(electricPhase)*Math.exp(-t*9)*(beam?.12:.04);
    const dry=(bass+pressure+metal+electric)*attack;
    // Sparse reflections give the blast a sense of scale without masking the low-frequency impact.
    const echo=i>sampleRate*.095?pcm[i-Math.round(sampleRate*.095)]*.17:0;
    const tail=Math.min(1,(duration-t)/.04);
    pcm[i]=Math.tanh(dry*(beam?.55+strength*.06:.75)+echo)*tail*.85;
  }
  return pcm;
}

/** Periodic turbulent pressure spectrum: exact cycles make the engine loop click-free. */
export function synthesizeEngineLoop(sampleRate:number):Float32Array {
  const pcm=new Float32Array(sampleRate*2);
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate;
    let pressure=0;
    for(let band=0;band<28;band++) {
      const frequency=31+band*band*2;
      pressure+=Math.sin(t*2*Math.PI*frequency+band*2.39996)/Math.sqrt(band+1)*.095;
    }
    const combustion=(Math.sin(t*2*Math.PI*55)+Math.sin(t*2*Math.PI*110)*.32)*.24;
    pcm[i]=Math.tanh((pressure+combustion)*(1+.1*Math.sin(t*2*Math.PI*13)))*.75;
  }
  return pcm;
}
