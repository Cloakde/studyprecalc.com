import type { User } from '@supabase/supabase-js';

import {
  resendSupabaseSignupVerificationCode,
  signOutSupabaseAccount,
  verifySupabaseEmailCode,
} from '../../src/data/supabase/accountStore';

function createAuthMock(results: Array<string | null | Error>) {
  const calls: Array<{ scope?: 'global' | 'local' | 'others' } | undefined> = [];

  return {
    calls,
    auth: {
      async signOut(options?: { scope: 'global' | 'local' | 'others' }) {
        calls.push(options);
        const result = results.shift();

        if (result instanceof Error) {
          throw result;
        }

        return {
          error: result ? { message: result } : null,
        };
      },
    },
  };
}

function createEmailVerificationAuthMock(options: {
  verifyError?: string;
  resendError?: string;
  user?: Partial<User> | null;
}) {
  const verifyCalls: unknown[] = [];
  const resendCalls: unknown[] = [];
  const user = options.user === undefined ? ({ id: 'user-1' } as User) : options.user;

  return {
    verifyCalls,
    resendCalls,
    auth: {
      async verifyOtp(input: { email: string; token: string; type: 'email' }) {
        verifyCalls.push(input);

        return {
          data: {
            user: user as User | null,
          },
          error: options.verifyError ? { message: options.verifyError } : null,
        };
      },
      async resend(input: { type: 'signup'; email: string }) {
        resendCalls.push(input);

        return {
          error: options.resendError ? { message: options.resendError } : null,
        };
      },
    },
  };
}

describe('supabase account logout', () => {
  it('awaits the normal Supabase sign out path', async () => {
    const { auth, calls } = createAuthMock([null]);

    await expect(signOutSupabaseAccount(auth)).resolves.toEqual({
      signedOut: true,
      errorMessage: '',
    });
    expect(calls).toEqual([undefined]);
  });

  it('falls back to local sign out when global sign out fails', async () => {
    const { auth, calls } = createAuthMock(['Network unavailable', null]);

    await expect(signOutSupabaseAccount(auth)).resolves.toEqual({
      signedOut: true,
      errorMessage:
        'Signed out on this device, but Supabase could not revoke the session everywhere.',
    });
    expect(calls).toEqual([undefined, { scope: 'local' }]);
  });

  it('reports the sign out failure when Supabase cannot clear the session', async () => {
    const { auth } = createAuthMock(['Network unavailable', 'Network unavailable']);

    await expect(signOutSupabaseAccount(auth)).resolves.toEqual({
      signedOut: false,
      errorMessage: 'Network unavailable',
    });
  });

  it('attempts local sign out after thrown global sign out errors', async () => {
    const { auth, calls } = createAuthMock([new Error('Request failed'), null]);

    await expect(signOutSupabaseAccount(auth)).resolves.toMatchObject({
      signedOut: true,
    });
    expect(calls).toEqual([undefined, { scope: 'local' }]);
  });
});

describe('supabase email verification', () => {
  it('normalizes and verifies the six-digit email code', async () => {
    const { auth, verifyCalls } = createEmailVerificationAuthMock({});

    await expect(
      verifySupabaseEmailCode(
        {
          email: ' Student@Example.com ',
          code: '123 456',
        },
        auth,
      ),
    ).resolves.toMatchObject({ id: 'user-1' });
    expect(verifyCalls).toEqual([
      {
        email: 'student@example.com',
        token: '123456',
        type: 'email',
      },
    ]);
  });

  it('rejects malformed email verification codes before calling Supabase', async () => {
    const { auth, verifyCalls } = createEmailVerificationAuthMock({});

    await expect(
      verifySupabaseEmailCode(
        {
          email: 'student@example.com',
          code: '123',
        },
        auth,
      ),
    ).rejects.toThrow('Enter the 6-digit email verification code.');
    expect(verifyCalls).toEqual([]);
  });

  it('surfaces Supabase email verification errors', async () => {
    const { auth } = createEmailVerificationAuthMock({
      verifyError: 'Token has expired',
    });

    await expect(
      verifySupabaseEmailCode(
        {
          email: 'student@example.com',
          code: '123456',
        },
        auth,
      ),
    ).rejects.toThrow('Token has expired');
  });

  it('resends signup verification codes to the normalized email', async () => {
    const { auth, resendCalls } = createEmailVerificationAuthMock({});

    await expect(
      resendSupabaseSignupVerificationCode(' Student@Example.com ', auth),
    ).resolves.toBeUndefined();
    expect(resendCalls).toEqual([
      {
        type: 'signup',
        email: 'student@example.com',
      },
    ]);
  });
});
