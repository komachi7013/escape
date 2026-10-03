export type Point = { x: number; z: number };
export const destinations = {
  desk: { x: -1.5, z: 1.35 }, memo: { x: -1.5, z: 1.35 }, bed: { x: -1.5, z: -.75 },
  painting: { x: -1.5, z: -2 }, shelf: { x: 1.5, z: -1.65 },
  chest: { x: 1.5, z: 1.35 }, flag: { x: 1.5, z: -2 }, door: { x: 0, z: -2.1 },
  crates:{x:-1.5,z:-.8}, rug:{x:0,z:1.35}, plants:{x:1.5,z:-1.5}, mirrorStand:{x:-1.5,z:1.35}, cache:{x:1.5,z:1.35}, window:{x:-1.5,z:-2},
  globe:{x:-1.5,z:1.35},starChart:{x:-1.5,z:-1.4},cipherDesk:{x:1.5,z:1.35},telescope:{x:1.5,z:-1.5},lexicon:{x:1.5,z:-2},
};
// Every investigation point lies inside the clear aisle. The central spine
// keeps all routes away from the furniture, including a retarget mid-walk.
export function route(from: Point, to: Point): Point[] {
  if (Math.abs(from.z - to.z) < .08) return [{ ...to }];
  return [{ x: 0, z: from.z }, { x: 0, z: to.z }, { ...to }].filter((p,i,a) => {
    const prev = i === 0 ? from : a[i-1]; return Math.hypot(p.x-prev.x,p.z-prev.z) > .02;
  });
}
