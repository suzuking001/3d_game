import type { WorldMaterials } from './WorldMaterials.js';
import type { RuinGeometry } from './RuinGeometry.js';
export type AddCollider = (name: string, x: number, y: number, z: number, w: number, h: number, d: number) => void;
export function buildRuinedCity(g: RuinGeometry, m: WorldMaterials, collider: AddCollider): void {
  const building = (x: number, z: number, w: number, depth: number, floors: number, damaged: boolean) => {
    const h = floors * 4.5;
    g.box('foundation', m.charred, x, 2, z, w, 4, depth); collider('building base', x, 2, z, w, 4, depth);
    for (let f = 1; f <= floors; f++) {
      const y = f * 4.5, missing = damaged && f > floors - 2;
      const slabWidth = missing ? w * (0.4 + g.random() * 0.25) : w;
      const slabX = missing ? x - (w - slabWidth) / 2 : x;
      g.box('broken floor plate', m.concrete, slabX, y, z, slabWidth, 0.45, depth);
      collider('floor plate', slabX, y, z, slabWidth, 0.45, depth);
      for (let col = 0; col <= Math.floor(w / 4); col++) {
        const px = x - w / 2 + col * 4;
        for (const side of [-1, 1]) {
          if (missing && col > w / 7 && g.random() > 0.2) continue;
          const pz = z + side * (depth / 2 - 0.35);
          g.box('concrete pier', m.concrete, px, y - 2, pz, 0.65, 4, 0.85);
          if (!missing && col < Math.floor(w / 4) && g.random() > 0.35) {
            g.box('window recess', m.glass, px + 1.9, y - 1.8, pz - side * 0.18, 3.05, 2.6, 0.09);
            g.box('window lintel', m.charred, px + 1.9, y - 3.6, pz, 3.35, 0.55, 0.65);
          }
          if (f === floors && damaged) for (let rod = 0; rod < 3; rod++)
            g.box('exposed rebar', m.rust, px + (rod - 1) * 0.16, y + 0.7, pz, 0.045, 1.6 + g.random(), 0.045, (g.random() - 0.5) * 0.45);
        }
      }
      for (const side of [-1, 1]) {
        const px = x + side * (w / 2 - 0.3);
        for (let bay = 0; bay < Math.floor(depth / 4); bay++) {
          const pz = z - depth / 2 + bay * 4 + 2;
          if (missing && g.random() > 0.45) continue;
          g.box('avenue facade pier', m.concrete, px, y - 2, pz - 1.7, 0.85, 4, 0.65);
          if (g.random() > 0.28) {
            g.box('avenue window', m.glass, px + side * 0.03, y - 1.6, pz, 0.09, 2.7, 3);
            g.box('weathered spandrel', m.charred, px, y - 3.5, pz, 0.6, 0.85, 3.45);
            g.box('window mullion', m.rust, px + side * 0.08, y - 1.6, pz, 0.13, 2.7, 0.07);
          } else {
            g.box('torn wall panel', m.concrete, px, y - 2.3, pz, 0.5, 2.4, 1.1, 0.1);
          }
          if (f === 2 || f === 4) {
            g.box('abandoned air conditioner', m.rust, px + side * 0.7, y - 3.2, pz, 0.85, 0.6, 1.1);
          }
          if (f % 2 === 0) g.panel(m.grime, px + side * 0.46, y - 2.2, pz, 3.6, 4.1, -side * Math.PI / 2);
        }
        // The damaged facade uses a conservative traversal volume.
        if (!missing) collider('side wall', px, y - 2.1, z, 0.55, 3.8, depth);
      }
    }
    g.box('utility box', m.rust, x - w / 3, h + 0.8, z + depth / 4, 3, 1.8, 3.2);
    if (damaged) for (let edge = 0; edge < 18; edge++) {
      const px = x - w / 2 + g.random() * w * 0.65, pz = z + (g.random() - 0.5) * depth;
      g.rubble(m.concrete, px, h + 0.2, pz, 0.6 + g.random(), 0.5 + g.random(), 1);
    }
    if (damaged) for (let i = 0; i < 14; i++) {
      const px = x + (g.random() - 0.5) * w * 1.4, pz = z - depth / 2 - g.random() * 7;
      g.box('fallen facade slab', m.concrete, px, 0.5 + g.random(), pz, 1 + g.random() * 4, 0.4 + g.random() * 1.2, 1 + g.random() * 3, (g.random() - 0.5) * 1.4);
    }
  };
  for (const side of [-1, 1]) {
    for (let block = 0; block < 5; block++) building(side * (38 + g.random() * 9), -100 + block * 49, 22 + g.random() * 7, 27 + g.random() * 8, 4 + Math.floor(g.random() * 7), true);
    for (let block = 0; block < 4; block++) building(side * 105, -95 + block * 68, 34, 45, 7 + Math.floor(g.random() * 8), true);
  }
  for (const side of [-1, 1]) {
    g.box('viaduct pier', m.concrete, side * 18, 8, 38, 3, 16, 5); collider('viaduct pier', side * 18, 8, 38, 3, 16, 5);
    g.box('broken viaduct span', m.charred, side * 32, 16, 38, 33, 1.7, 9, side * 0.045);
    // Conservative volume includes the tilted edges of the broken span.
    collider('viaduct span', side * 32, 16, 38, 33.2, 3.3, 9);
    for (let j = 0; j < 10; j++) g.box('bridge reinforcement', m.rust, side * (4 + j * 0.8), 16 - g.random() * 3, 35 + g.random() * 6, 0.08, 3 + g.random() * 3, 0.08, side * 0.55);
  }
  for (let i = 0; i < 38; i++) {
    const angle = i / 38 * Math.PI * 2, distance = 225 + g.random() * 110, height = 25 + g.random() * 65;
    const x = Math.sin(angle) * distance, z = Math.cos(angle) * distance, w = 12 + g.random() * 15, d = 14 + g.random() * 18;
    g.box('distant industrial skyline', m.charred, x, height / 2, z, w, height, d);
    for (let floor = 8; floor < height; floor += 8) {
      g.box('distant concrete ledge', m.concrete, x, floor, z, w + 0.35, 0.4, d + 0.35);
      g.box('distant dark glazing', m.glass, x, floor - 2, z - d / 2 - 0.02, w * 0.84, 2, 0.07);
    }
    g.box('distant rooftop plant', m.rust, x, height + 1.6, z, w * 0.4, 3.2, d * 0.5);
  }
}
