import { buildOrderBy, buildVehicleWhere } from './vehicle-filters';

describe('buildVehicleWhere', () => {
  it('defaults to in-stock vehicles', () => {
    const sql = buildVehicleWhere({});
    expect(sql.sql).toBe('vs.status IN (?)');
    expect(sql.values).toEqual(['IN_STOCK']);
  });

  it('combines filters with AND and treats NONE as "no action"', () => {
    const sql = buildVehicleWhere({ make: ['Toyota', 'Kia'], ageMin: 60, actionStatus: ['NONE', 'ON_HOLD'] });
    expect(sql.sql).toBe(
      'vs.status IN (?) AND vs.make IN (?,?) AND vs.age_days >= ? AND (vs.latest_action_status IN (?) OR vs.latest_action_id IS NULL)',
    );
    expect(sql.values).toEqual(['IN_STOCK', 'Toyota', 'Kia', 60, 'ON_HOLD']);
  });

  it('escapes LIKE wildcards in search', () => {
    const sql = buildVehicleWhere({ q: '50%_off' });
    expect(sql.values).toContain('%50\\%\\_off%');
  });
});

describe('buildOrderBy', () => {
  it('maps whitelisted fields and adds a stable tiebreak', () => {
    expect(buildOrderBy('listPrice:asc').sql).toBe('vs.list_price ASC NULLS LAST, vs.id ASC');
    expect(buildOrderBy(undefined).sql).toBe('vs.age_days DESC NULLS LAST, vs.id ASC');
  });
});
