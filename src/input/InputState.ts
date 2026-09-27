export interface InputState {
  right: number;
  forward: number;
  lookX: number;
  lookY: number;
  ascend: boolean;
  quickBoostPressed: boolean;
  resetPressed: boolean;
}
export function createInputState(): InputState {
  return { right: 0, forward: 0, lookX: 0, lookY: 0, ascend: false, quickBoostPressed: false, resetPressed: false };
}
