import { createRng } from './random';

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('int() stays within inclusive bounds', () => {
    const r = createRng(1);
    const values = Array.from({ length: 1000 }, () => r.int(3, 5));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(5);
  });
});
