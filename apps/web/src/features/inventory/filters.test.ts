import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filtersToParams, nextSort, parseFilters, toApiQuery, updateFilters } from './filters';

const parse = (qs: string) => parseFilters(new URLSearchParams(qs));

describe('parseFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(parse('')).toEqual({
      make: [], model: [], bucket: [], actionStatus: [], status: [], badge: [],
      yearMin: undefined, yearMax: undefined, ageMin: undefined, ageMax: undefined,
      priceMin: undefined, priceMax: undefined, q: '', sort: 'age:desc', page: 1, pageSize: 25,
    });
  });

  it('reads repeated and comma-separated lists, numbers and search', () => {
    const f = parse('make=Toyota&make=Kia,Mazda&bucket=AGING&actionStatus=NONE&badge=STALE&ageMin=60&q=%20vios%20&page=3&pageSize=50&sort=listPrice:asc');
    expect(f).toMatchObject({
      make: ['Toyota', 'Kia', 'Mazda'], bucket: ['AGING'], actionStatus: ['NONE'], badge: ['STALE'],
      ageMin: 60, q: 'vios', page: 3, pageSize: 50, sort: 'listPrice:asc',
    });
  });

  it('drops unknown enum values and invalid numbers', () => {
    const f = parse('bucket=OLD&bucket=WATCH&status=GONE&badge=LATE&ageMin=abc&page=-2&pageSize=7&sort=vin:up');
    expect(f).toMatchObject({ bucket: ['WATCH'], status: [], badge: [], ageMin: undefined, page: 1, pageSize: 25, sort: 'age:desc' });
  });
});

describe('filtersToParams / toApiQuery', () => {
  it('round-trips through the URL and omits defaults', () => {
    const f = parse('make=Toyota&bucket=AGING&ageMax=120&page=2');
    const qs = filtersToParams(f).toString();
    expect(qs).toBe('make=Toyota&bucket=AGING&ageMax=120&page=2');
    expect(parse(qs)).toEqual(f);
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe('');
  });

  it('builds an API query with explicit sort and paging', () => {
    const f = parse('make=Toyota');
    expect(toApiQuery(f)).toBe('make=Toyota&sort=age%3Adesc&page=1&pageSize=25');
    expect(toApiQuery(f, { paging: false })).toBe('make=Toyota&sort=age%3Adesc');
  });
});

describe('updateFilters', () => {
  it('resets to page 1 when a filter changes', () => {
    const f = parse('page=4');
    expect(updateFilters(f, { make: ['Kia'] }).page).toBe(1);
    expect(updateFilters(f, { page: 5 }).page).toBe(5);
  });
});

describe('nextSort', () => {
  it('starts descending and toggles on the same field', () => {
    expect(nextSort('age:desc', 'age')).toBe('age:asc');
    expect(nextSort('age:asc', 'age')).toBe('age:desc');
    expect(nextSort('age:desc', 'listPrice')).toBe('listPrice:desc');
  });
});
