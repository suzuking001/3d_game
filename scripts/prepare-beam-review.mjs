// Local development copy only. Restore with Sync-Runtime.ps1 -Task none before a release build.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const source=join(process.cwd(),'src/core/Game.ts');
const destination=join(process.env.LOCALAPPDATA,'vector-mech-lab/src/core/Game.ts');
let code=readFileSync(source,'utf8');
code=code.replace('this.loop = new GameLoop','let reviewTime=0, released=false; const beamReview=new URLSearchParams(location.search).get("review")==="beam";\n    this.loop = new GameLoop');
code=code.replace('const reset = this.input.state.resetPressed;',`if(beamReview) {
          reviewTime+=dt;
          if(reviewTime>5){reviewTime=0;released=false;this.player.reset();this.combat.reset();}
          this.input.state.chargeHeld=reviewTime<1.5;
          this.input.state.chargeReleased=reviewTime>=1.5&&!released;
          if(this.input.state.chargeReleased)released=true;
        }
        const reset = this.input.state.resetPressed;`);
writeFileSync(destination,code);
console.log('Local-only beam charging/release review enabled.');
