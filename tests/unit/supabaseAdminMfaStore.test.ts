import {
  createSupabaseAdminMfaStore,
  deriveAdminMfaRequirement,
  normalizeMfaCode,
  selectPreferredTotpFactor,
  type AdminMfaTotpFactor,
  type SupabaseAdminMfaClient,
} from '../../src/data/supabase/adminMfaStore';

function createMfaClient(
  options: {
    factors?: Array<Record<string, unknown>>;
    currentLevel?: string;
    nextLevel?: string;
    enrollError?: string;
    verifyError?: string;
  } = {},
) {
  const enrollCalls: unknown[] = [];
  const verifyCalls: unknown[] = [];
  const client: SupabaseAdminMfaClient = {
    auth: {
      mfa: {
        async listFactors() {
          return {
            data: {
              totp: options.factors,
            },
            error: null,
          };
        },
        async getAuthenticatorAssuranceLevel() {
          return {
            data: {
              currentLevel: options.currentLevel ?? 'aal1',
              nextLevel: options.nextLevel ?? 'aal2',
            },
            error: null,
          };
        },
        async enroll(input) {
          enrollCalls.push(input);

          if (options.enrollError) {
            return {
              data: null,
              error: { message: options.enrollError },
            };
          }

          return {
            data: {
              id: 'factor-new',
              totp: {
                qr_code: 'svg-or-data-url',
                secret: 'SECRET123',
                uri: 'otpauth://totp/StudyPrecalc:admin',
              },
            },
            error: null,
          };
        },
        async challengeAndVerify(input) {
          verifyCalls.push(input);

          if (options.verifyError) {
            return {
              data: null,
              error: { message: options.verifyError },
            };
          }

          return {
            data: {},
            error: null,
          };
        },
      },
    },
  };

  return {
    client,
    enrollCalls,
    verifyCalls,
  };
}

describe('Supabase admin MFA helpers', () => {
  it('normalizes common TOTP code formatting', () => {
    expect(normalizeMfaCode(' 123 456 ')).toBe('123456');
    expect(normalizeMfaCode('123-456')).toBe('123456');
  });

  it('selects a verified TOTP factor before unverified factors', () => {
    const factors: AdminMfaTotpFactor[] = [
      {
        id: 'unverified-newer',
        factorType: 'totp',
        status: 'unverified',
        updatedAt: '2026-05-14T12:00:00Z',
      },
      {
        id: 'verified-older',
        factorType: 'totp',
        status: 'verified',
        updatedAt: '2026-05-13T12:00:00Z',
      },
    ];

    expect(selectPreferredTotpFactor(factors)?.id).toBe('verified-older');
  });

  it('derives setup, verification, and satisfied requirements', () => {
    expect(
      deriveAdminMfaRequirement({
        enabled: false,
      }).status,
    ).toBe('unavailable');
    expect(
      deriveAdminMfaRequirement({
        enabled: true,
        currentLevel: 'aal1',
        factors: [],
      }).status,
    ).toBe('setup-required');
    expect(
      deriveAdminMfaRequirement({
        enabled: true,
        currentLevel: 'aal1',
        factors: [{ id: 'factor-1', factorType: 'totp', status: 'verified' }],
      }).status,
    ).toBe('verification-required');
    expect(
      deriveAdminMfaRequirement({
        enabled: true,
        currentLevel: 'aal2',
        factors: [],
      }).status,
    ).toBe('satisfied');
  });
});

describe('Supabase admin MFA store', () => {
  it('returns an unavailable state when Supabase MFA is not configured', async () => {
    const store = createSupabaseAdminMfaStore({
      client: null,
      enabled: false,
    });

    await expect(store.listFactorsAndAal()).resolves.toMatchObject({
      factors: [],
      currentLevel: 'aal1',
      requirement: {
        status: 'unavailable',
      },
    });
    await expect(store.startTotpEnrollment()).rejects.toThrow('Supabase MFA is not configured.');
  });

  it('lists TOTP factors and derives a verification requirement', async () => {
    const { client } = createMfaClient({
      factors: [
        {
          id: 'factor-1',
          factor_type: 'totp',
          status: 'verified',
          friendly_name: 'Admin phone',
          created_at: '2026-05-13T12:00:00Z',
        },
        {
          id: 'phone-1',
          factor_type: 'phone',
          status: 'verified',
        },
      ],
    });
    const store = createSupabaseAdminMfaStore({ client, enabled: true });

    await expect(store.listFactorsAndAal()).resolves.toMatchObject({
      factors: [
        {
          id: 'factor-1',
          factorType: 'totp',
          status: 'verified',
          friendlyName: 'Admin phone',
        },
      ],
      preferredFactor: {
        id: 'factor-1',
      },
      requirement: {
        status: 'verification-required',
      },
    });
  });

  it('starts TOTP enrollment with QR code, secret, and URI fields', async () => {
    const { client, enrollCalls } = createMfaClient();
    const store = createSupabaseAdminMfaStore({ client, enabled: true });

    await expect(store.startTotpEnrollment(' Admin account ')).resolves.toEqual({
      factorId: 'factor-new',
      qrCode: 'svg-or-data-url',
      secret: 'SECRET123',
      uri: 'otpauth://totp/StudyPrecalc:admin',
    });
    expect(enrollCalls).toEqual([
      {
        factorType: 'totp',
        friendlyName: 'Admin account',
      },
    ]);
  });

  it('verifies enrollment and existing factors through challengeAndVerify', async () => {
    const { client, verifyCalls } = createMfaClient();
    const store = createSupabaseAdminMfaStore({ client, enabled: true });

    await expect(store.verifyTotpEnrollment(' factor-new ', '123 456')).resolves.toBeUndefined();
    await expect(store.verifyTotpFactor('factor-existing', '654-321')).resolves.toBeUndefined();

    expect(verifyCalls).toEqual([
      {
        factorId: 'factor-new',
        code: '123456',
      },
      {
        factorId: 'factor-existing',
        code: '654321',
      },
    ]);
  });

  it('rejects malformed MFA codes before calling Supabase', async () => {
    const { client, verifyCalls } = createMfaClient();
    const store = createSupabaseAdminMfaStore({ client, enabled: true });

    await expect(store.verifyTotpFactor('factor-existing', '12')).rejects.toThrow(
      'Enter the 6-digit MFA code.',
    );
    expect(verifyCalls).toEqual([]);
  });
});
