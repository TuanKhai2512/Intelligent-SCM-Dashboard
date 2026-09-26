import { describe, expect, it } from 'vitest';
import { priceAxis } from './PriceHistoryChart';

const M = 1_000_000;

describe('priceAxis', () => {
  it('gives a single price a padded axis with round, distinct ticks', () => {
    expect(priceAxis([574 * M])).toEqual({
      domain: [540 * M, 620 * M],
      ticks: [540 * M, 560 * M, 580 * M, 600 * M, 620 * M],
    });
  });

  it('pads a real range and snaps it to round steps', () => {
    expect(priceAxis([900 * M, 850 * M])).toEqual({
      domain: [840 * M, 920 * M],
      ticks: [840 * M, 860 * M, 880 * M, 900 * M, 920 * M],
    });
  });

  it('never goes below zero', () => {
    expect(priceAxis([10, 1_000]).domain[0]).toBe(0);
  });
});
