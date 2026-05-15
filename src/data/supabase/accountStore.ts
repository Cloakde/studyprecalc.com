import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import type { AccountRole, LoginInput, PublicAccount, SignupInput } from '../localAccountStore';
import { isSupabaseConfigured, supabase } from './client';

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: AccountRole | null;
  created_at: string;
  updated_at?: string | null;
};

export type SupabaseSignupResult = {
  account: PublicAccount | null;
  requiresEmailConfirmation: boolean;
  verificationEmail?: string;
};

export type EmailVerificationInput = {
  email: string;
  code: string;
};

type SupabaseSignOutScope = 'global' | 'local' | 'others';

type SupabaseSignOutAuth = {
  signOut: (options?: {
    scope: SupabaseSignOutScope;
  }) => Promise<{ error: { message: string } | null }>;
};

type SupabaseEmailVerificationAuth = {
  verifyOtp: (input: {
    email: string;
    token: string;
    type: 'email';
  }) => Promise<{ data: { user: User | null }; error: { message: string } | null }>;
  resend: (input: {
    type: 'signup';
    email: string;
  }) => Promise<{ error: { message: string } | null }>;
};

export type SupabaseSignOutResult = {
  signedOut: boolean;
  errorMessage: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateSignupInput(input: SignupInput): SignupInput {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const inviteCode = input.inviteCode?.trim().toUpperCase();

  if (!displayName) {
    throw new Error('Enter a name for this account.');
  }

  if (!email.includes('@') || email.length < 5) {
    throw new Error('Enter a valid email address.');
  }

  if (input.password.length < 6) {
    throw new Error('Use at least 6 characters for the password.');
  }

  return {
    displayName,
    email,
    password: input.password,
    ...(inviteCode ? { inviteCode } : {}),
  };
}

function validateLoginInput(input: LoginInput): LoginInput {
  const email = normalizeEmail(input.email);

  if (!email || !input.password) {
    throw new Error('Enter an email and password.');
  }

  return {
    email,
    password: input.password,
  };
}

function validateEmailVerificationInput(input: EmailVerificationInput): EmailVerificationInput {
  const email = normalizeEmail(input.email);
  const code = input.code.trim().replace(/[\s-]+/g, '');

  if (!email || !email.includes('@')) {
    throw new Error('Enter the email address used for signup.');
  }

  if (!/^\d{6}$/.test(code)) {
    throw new Error('Enter the 6-digit email verification code.');
  }

  return {
    email,
    code,
  };
}

function accountFromUser(user: User, profile?: ProfileRow | null): PublicAccount {
  const displayName =
    profile?.display_name ??
    (typeof user.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : undefined) ??
    user.email?.split('@')[0] ??
    'Student';

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? '',
    displayName,
    role: profile?.role ?? 'student',
    createdAt: profile?.created_at ?? user.created_at,
    ...(profile?.updated_at ? { lastLoginAt: profile.updated_at } : {}),
  };
}

async function loadProfileAccount(user: User): Promise<PublicAccount> {
  if (!supabase) {
    return accountFromUser(user);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,display_name,role,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    return accountFromUser(user);
  }

  return accountFromUser(user, data);
}

async function callSupabaseSignOut(
  auth: SupabaseSignOutAuth,
  options?: { scope: SupabaseSignOutScope },
): Promise<string> {
  try {
    const { error } = await auth.signOut(options);

    return error?.message ?? '';
  } catch (error) {
    return error instanceof Error ? error.message : 'Unable to sign out.';
  }
}

export async function signOutSupabaseAccount(
  auth: SupabaseSignOutAuth | undefined = supabase?.auth,
): Promise<SupabaseSignOutResult> {
  if (!auth) {
    return {
      signedOut: true,
      errorMessage: '',
    };
  }

  const globalErrorMessage = await callSupabaseSignOut(auth);

  if (!globalErrorMessage) {
    return {
      signedOut: true,
      errorMessage: '',
    };
  }

  const localErrorMessage = await callSupabaseSignOut(auth, { scope: 'local' });

  if (!localErrorMessage) {
    return {
      signedOut: true,
      errorMessage:
        'Signed out on this device, but Supabase could not revoke the session everywhere.',
    };
  }

  return {
    signedOut: false,
    errorMessage: globalErrorMessage,
  };
}

export async function verifySupabaseEmailCode(
  input: EmailVerificationInput,
  auth: SupabaseEmailVerificationAuth | undefined = supabase?.auth,
): Promise<User> {
  if (!auth) {
    throw new Error('Supabase is not configured.');
  }

  const verificationInput = validateEmailVerificationInput(input);
  const { data, error } = await auth.verifyOtp({
    email: verificationInput.email,
    token: verificationInput.code,
    type: 'email',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Unable to verify this email code.');
  }

  return data.user;
}

export async function resendSupabaseSignupVerificationCode(
  email: string,
  auth: SupabaseEmailVerificationAuth | undefined = supabase?.auth,
): Promise<void> {
  if (!auth) {
    throw new Error('Supabase is not configured.');
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter the email address used for signup.');
  }

  const { error } = await auth.resend({
    type: 'signup',
    email: normalizedEmail,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function useSupabaseAccountStore() {
  const [currentAccount, setCurrentAccount] = useState<PublicAccount | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [lastError, setLastError] = useState('');

  const refreshCurrentAccount = useCallback(async () => {
    if (!supabase) {
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    setCurrentAccount(await loadProfileAccount(data.user));
    setIsLoading(false);
  }, []);

  const signup = useCallback(async (input: SignupInput): Promise<SupabaseSignupResult> => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    setLastError('');
    const signupInput = validateSignupInput(input);
    const { data, error } = await supabase.auth.signUp({
      email: signupInput.email,
      password: signupInput.password,
      options: {
        data: {
          display_name: signupInput.displayName,
          invite_code: signupInput.inviteCode,
        },
      },
    });

    if (error) {
      setLastError(error.message);
      throw new Error(error.message);
    }

    if (!data.user) {
      return {
        account: null,
        requiresEmailConfirmation: true,
        verificationEmail: signupInput.email,
      };
    }

    const account = await loadProfileAccount(data.user);

    if (data.session) {
      setCurrentAccount(account);
    }

    return {
      account,
      requiresEmailConfirmation: !data.session,
      ...(!data.session ? { verificationEmail: signupInput.email } : {}),
    };
  }, []);

  const verifyEmailCode = useCallback(async (input: EmailVerificationInput) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    setLastError('');

    try {
      const user = await verifySupabaseEmailCode(input);
      const account = await loadProfileAccount(user);
      setCurrentAccount(account);
      return account;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify email code.';
      setLastError(message);
      throw new Error(message);
    }
  }, []);

  const resendEmailCode = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    setLastError('');

    try {
      await resendSupabaseSignupVerificationCode(email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to resend email verification code.';
      setLastError(message);
      throw new Error(message);
    }
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    setLastError('');
    const loginInput = validateLoginInput(input);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginInput.email,
      password: loginInput.password,
    });

    if (error) {
      setLastError(error.message);
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Unable to load account.');
    }

    const account = await loadProfileAccount(data.user);
    setCurrentAccount(account);
    return account;
  }, []);

  const logout = useCallback(async () => {
    setLastError('');
    const result = await signOutSupabaseAccount();

    if (!result.signedOut) {
      setLastError(result.errorMessage);
      return;
    }

    setCurrentAccount(null);
    setLastError(result.errorMessage);
  }, []);

  useEffect(() => {
    void refreshCurrentAccount();
  }, [refreshCurrentAccount]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentAccount(null);
        setIsLoading(false);
        return;
      }

      void loadProfileAccount(session.user).then((account) => {
        setCurrentAccount(account);
        setIsLoading(false);
      });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    accounts: currentAccount ? [currentAccount] : [],
    currentAccount,
    isEnabled: isSupabaseConfigured,
    isLoading,
    lastError,
    login,
    logout,
    resendEmailCode,
    signup,
    verifyEmailCode,
  };
}
