import { signOutSupabaseAccount } from '../../src/data/supabase/accountStore';

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
