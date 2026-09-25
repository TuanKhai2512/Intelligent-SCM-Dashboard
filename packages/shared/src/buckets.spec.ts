import { bucketFor } from './buckets';

describe('bucketFor', () => {
  it.each([
    [0, 'FRESH'], [30, 'FRESH'],
    [31, 'NORMAL'], [60, 'NORMAL'],
    [61, 'WATCH'], [90, 'WATCH'],
    [91, 'AGING'], [200, 'AGING'],
  ])('age %i with threshold 90 is %s', (age, bucket) => {
    expect(bucketFor(age, 90)).toBe(bucket);
  });

  it.each([
    [30, 'FRESH'], [31, 'WATCH'], [60, 'WATCH'], [61, 'AGING'],
  ])('age %i with threshold 60 is %s', (age, bucket) => {
    expect(bucketFor(age, 60)).toBe(bucket);
  });

  it('moves the Watch window with the threshold', () => {
    expect(bucketFor(90, 120)).toBe('NORMAL');
    expect(bucketFor(91, 120)).toBe('WATCH');
    expect(bucketFor(121, 120)).toBe('AGING');
  });
});
