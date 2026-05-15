import {
  formatProductionReadinessNextActions,
  formatProductionReadinessResults,
  getProductionReadinessExitCode,
  parseProductionReadinessEnv,
  runProductionReadinessChecks,
  type DnsClient,
  type ProductionReadinessResult,
} from '../../scripts/check-production-readiness';

const validJwtAnonKey = `eyJ${'.a'.repeat(2)}`;

const passingDns: DnsClient = {
  resolve4: async () => ['76.76.21.21'],
  resolve6: async () => [],
  resolveCname: async () => [],
};

const failingDns: DnsClient = {
  resolve4: async () => {
    throw new Error('not found');
  },
  resolve6: async () => {
    throw new Error('not found');
  },
  resolveCname: async () => {
    throw new Error('not found');
  },
};

describe('production readiness helpers', () => {
  it('requires production Supabase env vars without printing secret values', () => {
    const result = parseProductionReadinessEnv({});

    expect(result.config).toBeUndefined();
    expect(formatProductionReadinessResults(result.results)).toContain(
      '[FAIL] env VITE_SUPABASE_URL: Required production Supabase URL is missing.',
    );
    expect(formatProductionReadinessResults(result.results)).toContain(
      '[FAIL] env VITE_SUPABASE_ANON_KEY: Required browser-safe Supabase public key is missing.',
    );
    expect(formatProductionReadinessResults(result.results)).not.toContain('service_role');
  });

  it('accepts Supabase publishable and legacy anon JWT key shapes', () => {
    expect(
      parseProductionReadinessEnv({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc123',
      }).config?.supabaseAnonKeyShape,
    ).toBe('publishable');

    expect(
      parseProductionReadinessEnv({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: validJwtAnonKey,
      }).config?.supabaseAnonKeyShape,
    ).toBe('jwt');
  });

  it('rejects malformed URLs, key shapes, and apex domains', () => {
    const result = parseProductionReadinessEnv({
      VITE_SUPABASE_URL: 'ftp://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'plain-text-key',
      READINESS_APEX_DOMAIN: 'https://studyprecalc.com',
    });

    expect(result.config).toBeUndefined();
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'env VITE_SUPABASE_URL',
          status: 'fail',
        }),
        expect.objectContaining({
          name: 'env VITE_SUPABASE_ANON_KEY',
          status: 'fail',
        }),
        expect.objectContaining({
          name: 'env READINESS_APEX_DOMAIN',
          status: 'fail',
        }),
      ]),
    );
  });

  it('skips the optional www check unless READINESS_WWW_DOMAIN is set', () => {
    const result = parseProductionReadinessEnv({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc123',
    });

    expect(result.config).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKeyShape: 'publishable',
      apexDomain: 'studyprecalc.com',
    });
    expect(result.results).toContainEqual(
      expect.objectContaining({
        name: 'env READINESS_WWW_DOMAIN',
        status: 'skip',
      }),
    );
  });

  it('checks DNS and HTTPS for apex and configured www domains', async () => {
    const results = await runProductionReadinessChecks(
      {
        supabaseUrl: 'https://project.supabase.co',
        supabaseAnonKeyShape: 'publishable',
        apexDomain: 'studyprecalc.com',
        wwwDomain: 'www.studyprecalc.com',
      },
      {
        dns: passingDns,
        http: async () => ({ status: 200 }),
      },
    );

    expect(results).toEqual([
      {
        name: 'dns studyprecalc.com',
        status: 'pass',
        message: 'Resolved 1 DNS record(s).',
      },
      {
        name: 'http studyprecalc.com',
        status: 'pass',
        message: 'HTTPS returned 200.',
      },
      {
        name: 'dns www.studyprecalc.com',
        status: 'pass',
        message: 'Resolved 1 DNS record(s).',
      },
      {
        name: 'http www.studyprecalc.com',
        status: 'pass',
        message: 'HTTPS returned 200.',
      },
    ]);
  });

  it('fails DNS and HTTP checks with owner actions', async () => {
    const results = await runProductionReadinessChecks(
      {
        supabaseUrl: 'https://project.supabase.co',
        supabaseAnonKeyShape: 'publishable',
        apexDomain: 'studyprecalc.com',
      },
      {
        dns: failingDns,
        http: async () => ({ status: 404 }),
      },
    );

    expect(results).toEqual([
      expect.objectContaining({
        name: 'dns studyprecalc.com',
        status: 'fail',
      }),
      expect.objectContaining({
        name: 'http studyprecalc.com',
        status: 'fail',
      }),
    ]);
    expect(formatProductionReadinessNextActions(results)).toBe(
      [
        'Owner next action(s):',
        '- Configure DNS for studyprecalc.com in the domain registrar and Vercel.',
        '- Check the Vercel deployment and domain assignment for studyprecalc.com.',
      ].join('\n'),
    );
  });

  it('formats output and uses failures for exit code', () => {
    const results: ProductionReadinessResult[] = [
      { name: 'env VITE_SUPABASE_URL', status: 'pass', message: 'configured' },
      { name: 'env READINESS_WWW_DOMAIN', status: 'skip', message: 'optional' },
      { name: 'dns studyprecalc.com', status: 'fail', message: 'missing' },
    ];

    expect(formatProductionReadinessResults(results)).toBe(
      [
        '[PASS] env VITE_SUPABASE_URL: configured',
        '[SKIP] env READINESS_WWW_DOMAIN: optional',
        '[FAIL] dns studyprecalc.com: missing',
      ].join('\n'),
    );
    expect(getProductionReadinessExitCode(results)).toBe(1);
    expect(
      getProductionReadinessExitCode([
        { name: 'env', status: 'pass', message: 'configured' },
        { name: 'www', status: 'skip', message: 'optional' },
      ]),
    ).toBe(0);
  });
});
