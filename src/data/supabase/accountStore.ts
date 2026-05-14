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
      };
    }

    const account = await loadProfileAccount(data.user);

    if (data.session) {
      setCurrentAccount(account);
    }

    return {
      account,
      requiresEmailConfirmation: !data.session,
    };
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

  const logout = useCallback(() => {
    setCurrentAccount(null);
    void supabase?.auth.signOut();
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
    signup,
  };
}
