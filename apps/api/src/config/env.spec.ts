import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'a-secret-that-is-long-enough',
};

describe('validateEnv', () => {
  it('applies defaults', () => {
    expect(validateEnv(valid)).toEqual({ ...valid, JWT_TTL_SECONDS: 28800, API_PORT: 3000 });
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => validateEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
