// Visual QA only: patch the LOCALAPPDATA development copy, never the project or a release build.
// Restore with Sync-Runtime.ps1 -Task none before building a release.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const project = process.cwd();
const file = join(process.env.LOCALAPPDATA,'vector-mech-lab/src/core/Game.ts');
let code = readFileSync(join(project,'src/core/Game.ts'),'utf8');
code = code.replace('this.loop = new GameLoop', 'let reviewTime = 0; const review = new URLSearchParams(location.search).get("review");\n    this.loop = new GameLoop');
code = code.replace('const reset = this.input.state.resetPressed;', `reviewTime += dt;
        if (review) {
          const phase = reviewTime % 3;
          if (phase < dt) this.player.reset();
          this.input.state.forward = review === 'run' ? (phase < 2 ? 1 : phase < 4 ? -1 : 0) : 0;
          this.input.state.ascend = review === 'ascend' && phase < 3;
          this.input.state.quickBoostPressed = review === 'boost' && phase < dt;
        }
        const reset = this.input.state.resetPressed;`);
writeFileSync(file,code);
console.log('Development-only controlled input review enabled. Restore before release.');
