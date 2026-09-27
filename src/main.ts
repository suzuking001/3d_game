import { Game } from './core/Game.js';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const loading = document.querySelector<HTMLDivElement>('#loading')!;
const initialization = new AbortController();
let activeGame: Game | undefined;
if (import.meta.hot) import.meta.hot.dispose(() => {
  initialization.abort(); activeGame?.dispose();
});
Game.create(canvas, initialization.signal).then(game => {
  activeGame = game; loading?.remove(); game.start();
}).catch((error: unknown) => {
  if (initialization.signal.aborted) return;
  console.error(error);
  if (loading) loading.textContent = `初期化できませんでした: ${error instanceof Error ? error.message : String(error)}`;
});
