import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

export type SmokeEnvInput = Partial<Record<string, string | undefined>>;

export type SmokeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  invalidInviteCode: string;
  writeEnabled: boolean;
  adminCredentials?: {
    email: string;
    password: string;
  };
};

export type SmokeEnvIssue = {
  variable: string;
  message: string;
};

export type SmokeResultStatus = 'pass' | 'fail' | 'skip';

export type SmokeResult = {
  name: string;
  status: SmokeResultStatus;
  message: string;
};

type ValidateInviteRow = {
  is_valid: boolean;
  reason: string | null;
};

const currentFile = fileURLToPath(import.meta.url);
const defaultInvalidInviteCode = 'SMOKE-KNOWN-INVALID-CODE-2026';

function readEnvValue(env: SmokeEnvInput, name: string): string {
  return env[name]?.trim() ?? '';
}

function isHttpUrl(candidate: string): boolean {
  try {
    const parsedUrl = new URL(candidate);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseSupabaseSmokeEnv(env: SmokeEnvInput): {
  config?: SmokeConfig;
  issues: SmokeEnvIssue[];
} {
  const supabaseUrl = readEnvValue(env, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue(env, 'VITE_SUPABASE_ANON_KEY');
  const adminEmail = readEnvValue(env, 'SMOKE_ADMIN_EMAIL');
  const adminPassword = readEnvValue(env, 'SMOKE_ADMIN_PASSWORD');
  const issues: SmokeEnvIssue[] = [];

  if (!supabaseUrl) {
    issues.push({
      variable: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL is required.',
    });
  } else if (!isHttpUrl(supabaseUrl)) {
    issues.push({
      variable: 'VITE_SUPABASE_URL',
      message: 'VITE_SUPABASE_URL must be a valid http(s) URL.',
    });
  }

  if (!supabaseAnonKey) {
    issues.push({
      variable: 'VITE_SUPABASE_ANON_KEY',
      message: 'VITE_SUPABASE_ANON_KEY is required.',
    });
  }

  if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
    issues.push({
      variable: adminEmail ? 'SMOKE_ADMIN_PASSWORD' : 'SMOKE_ADMIN_EMAIL',
      message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD must be provided together.',
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    config: {
      supabaseUrl,
      supabaseAnonKey,
      invalidInviteCode: readEnvValue(env, 'SMOKE_INVALID_INVITE_CODE') || defaultInvalidInviteCode,
      writeEnabled: readEnvValue(env, 'SMOKE_WRITE') === '1',
      ...(adminEmail && adminPassword
        ? {
            adminCredentials: {
              email: adminEmail,
              password: adminPassword,
            },
          }
        : {}),
    },
    issues,
  };
}

export function formatSmokeResults(results: SmokeResult[]): string {
  return results
    .map((result) => {
      const label = result.status.toUpperCase().padEnd(4, ' ');
      return `[${label}] ${result.name}: ${result.message}`;
    })
    .join('\n');
}

export function getSmokeExitCode(results: SmokeResult[]): number {
  return results.some((result) => result.status === 'fail') ? 1 : 0;
}

async function checkInviteRpc(
  client: SupabaseClient,
  invalidInviteCode: string,
): Promise<SmokeResult> {
  const { data, error } = await client.rpc('validate_invite', {
    p_code: invalidInviteCode,
    p_email: 'smoke-invalid@example.com',
  });

  if (error) {
    return {
      name: 'validate_invite RPC',
      status: 'fail',
      message: error.message,
    };
  }

  const row = Array.isArray(data) ? (data[0] as ValidateInviteRow | undefined) : undefined;

  if (!row) {
    return {
      name: 'validate_invite RPC',
      status: 'fail',
      message: 'RPC returned no rows for a known-invalid invite code.',
    };
  }

  if (row.is_valid === false && row.reason === 'not-found') {
    return {
      name: 'validate_invite RPC',
      status: 'pass',
      message: 'Known-invalid invite code returned not-found.',
    };
  }

  return {
    name: 'validate_invite RPC',
    status: 'fail',
    message: `Expected not-found for invalid code, received ${JSON.stringify(row)}.`,
  };
}

async function checkAnonUnpublishedAccess(client: SupabaseClient): Promise<SmokeResult> {
  const { data, error } = await client
    .from('questions')
    .select('id,status,is_published')
    .neq('status', 'published')
    .limit(1);

  if (error) {
    const isPermissionBlocked =
      error.code === '42501' || error.message.toLowerCase().includes('permission denied');

    if (!isPermissionBlocked) {
      return {
        name: 'anon unpublished content access',
        status: 'fail',
        message: error.message,
      };
    }

    return {
      name: 'anon unpublished content access',
      status: 'pass',
      message: `Anon read was blocked by Supabase: ${error.message}`,
    };
  }

  if ((data ?? []).length === 0) {
    return {
      name: 'anon unpublished content access',
      status: 'pass',
      message: 'Anon client returned no unpublished question rows.',
    };
  }

  return {
    name: 'anon unpublished content access',
    status: 'fail',
    message: `Anon client can read unpublished question row ${(data as { id?: string }[])[0]?.id ?? '(unknown)'}.`,
  };
}

async function checkAdminLogin(
  config: SmokeConfig,
  adminClient: SupabaseClient,
): Promise<SmokeResult> {
  if (!config.adminCredentials) {
    return {
      name: 'admin login',
      status: 'skip',
      message: 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD were not provided.',
    };
  }

  const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
    email: config.adminCredentials.email,
    password: config.adminCredentials.password,
  });

  if (signInError || !signInData.user) {
    return {
      name: 'admin login',
      status: 'fail',
      message: signInError?.message ?? 'Supabase Auth did not return a user.',
    };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', signInData.user.id)
    .maybeSingle();

  await adminClient.auth.signOut();

  if (profileError) {
    return {
      name: 'admin login',
      status: 'fail',
      message: profileError.message,
    };
  }

  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return {
      name: 'admin login',
      status: 'fail',
      message: 'Authenticated user profile is not marked admin.',
    };
  }

  return {
    name: 'admin login',
    status: 'pass',
    message: 'Admin credentials authenticated and profile role is admin.',
  };
}

export async function runSupabaseSmoke(config: SmokeConfig): Promise<SmokeResult[]> {
  const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const adminClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return [
    {
      name: 'write safety',
      status: 'skip',
      message: config.writeEnabled
        ? 'SMOKE_WRITE=1 was provided, but this smoke script implements no write checks.'
        : 'No writes are performed. Set SMOKE_WRITE=1 only when future write checks exist.',
    },
    await checkInviteRpc(anonClient, config.invalidInviteCode),
    await checkAnonUnpublishedAccess(anonClient),
    await checkAdminLogin(config, adminClient),
  ];
}

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

async function main() {
  const viteEnv = loadEnv(process.env.MODE ?? 'production', process.cwd(), '');
  const { config, issues } = parseSupabaseSmokeEnv({
    ...viteEnv,
    ...process.env,
  });

  if (!config) {
    for (const issue of issues) {
      console.error(`[FAIL] ${issue.variable}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const results = await runSupabaseSmoke(config);
  const output = formatSmokeResults(results);

  if (output) {
    console.log(output);
  }

  process.exitCode = getSmokeExitCode(results);
}

if (isCliEntryPoint()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
