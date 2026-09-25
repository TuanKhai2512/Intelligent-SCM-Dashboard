import { describe, expect, it } from 'vitest';
import { agingActionLink, bucketLink, inventoryLink, NEEDS_ATTENTION_LINKS } from './links';

describe('overview links', () => {
  it('builds inventory URLs with only the given filters', () => {
    expect(inventoryLink({})).toBe('/inventory');
    expect(bucketLink('WATCH')).toBe('/inventory?bucket=WATCH');
    expect(agingActionLink('NONE')).toBe('/inventory?bucket=AGING&actionStatus=NONE');
    expect(NEEDS_ATTENTION_LINKS).toEqual({
      noAction: '/inventory?badge=NO_ACTION',
      stale: '/inventory?badge=STALE',
      overdue: '/inventory?badge=OVERDUE',
    });
  });
});
