/**
 * Tiny deterministic PRNG so a given (categoryKey, index, variant, canvas)
 * always produces the exact same decorative layout. mulberry32 is more than
 * enough here and keeps the engine dependency-free and reproducible for tests.
 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
}

export function createRng(seed: string | number): Rng {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (arr) => {
      if (arr.length === 0) throw new Error("cannot pick from empty array");
      const item = arr[Math.floor(next() * arr.length)];
      if (item === undefined) throw new Error("pick out of range");
      return item;
    },
  };
}
