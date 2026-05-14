import {
  formatSmokeResults,
  getSmokeExitCode,
  parseSupabaseSmokeEnv,
  type SmokeResult,
} from '../../scripts/smoke-supabase';

describe('Supabase smoke helpers', () => {
  it('requires Supabase URL and anon key', () => {
    const result = parseSupabaseSmokeEnv({});

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'VITE_SUPABASE_URL',
        message: 'VITE_SUPABASE_URL is required.',
      },
      {
        variable: 'VITE_SUPABASE_ANON_KEY',
        message: 'VITE_SUPABASE_ANON_KEY is required.',
      },
    ]);
  });

  it('rejects non-http Supabase URLs', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'ftp://example.com',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'VITE_SUPABASE_URL',
        message: 'VITE_SUPABASE_URL must be a valid http(s) URL.',
      },
    ]);
  });

  it('parses optional admin credentials and write opt-in', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: ' https://example.supabase.co ',
      VITE_SUPABASE_ANON_KEY: ' anon-key ',
      SMOKE_ADMIN_EMAIL: ' admin@example.com ',
      SMOKE_ADMIN_PASSWORD: ' password ',
      SMOKE_INVALID_INVITE_CODE: ' intentionally-missing ',
      SMOKE_WRITE: '1',
    });

    expect(result.issues).toEqual([]);
    expect(result.config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
      invalidInviteCode: 'intentionally-missing',
      writeEnabled: true,
      adminCredentials: {
        email: 'admin@example.com',
        password: 'password',
      },
    });
  });

  it('requires admin email and password together', () => {
    const result = parseSupabaseSmokeEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      SMOKE_ADMIN_EMAIL: 'admin@example.com',
    });

    expect(result.config).toBeUndefined();
    expect(result.issues).toEqual([
      {
        variable: 'SMOKE_ADMIN_PASSWORD',
        message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD must be provided together.',
      },
    ]);
  });

  it('formats smoke results for console output', () => {
    const results: SmokeResult[] = [
      { name: 'env', status: 'pass', message: 'configured' },
      { name: 'admin login', status: 'skip', message: 'not provided' },
      { name: 'rpc', status: 'fail', message: 'missing' },
    ];

    expect(formatSmokeResults(results)).toBe(
      ['[PASS] env: configured', '[SKIP] admin login: not provided', '[FAIL] rpc: missing'].join(
        '\n',
      ),
    );
  });

  it('returns a failing exit code when any check fails', () => {
    expect(
      getSmokeExitCode([
        { name: 'env', status: 'pass', message: 'configured' },
        { name: 'admin login', status: 'skip', message: 'not provided' },
      ]),
    ).toBe(0);
    expect(
      getSmokeExitCode([
        { name: 'env', status: 'pass', message: 'configured' },
        { name: 'rpc', status: 'fail', message: 'missing' },
      ]),
    ).toBe(1);
  });
});
