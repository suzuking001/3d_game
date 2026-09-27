// Run npm test first. Exports the same original PCM used by the game's Web Audio effects.
import {mkdirSync,writeFileSync} from 'node:fs';
import {synthesizeDischarge,synthesizeEngineLoop} from '../.test-build/src/effects/AudioSynthesis.js';
const directory=process.argv[2]||'docs/audio';mkdirSync(directory,{recursive:true});
for(const [name,samples] of [['charged-beam',synthesizeDischarge('beam',4,48000)],['quick-boost',synthesizeDischarge('quickBoost',1,48000)],['booster-loop',synthesizeEngineLoop(48000)]]) {
  const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
  samples.forEach((sample,i)=>wav.writeInt16LE(Math.round(sample*.65*32767),44+i*2));
  writeFileSync(`${directory}/${name}.wav`,wav);console.log(`${name}: ${(samples.length/48000).toFixed(2)}s`);
}
