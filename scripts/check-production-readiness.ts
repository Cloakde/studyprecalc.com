import dns from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

export type ProductionReadinessEnv = Partial<Record<string, string | undefined>>;

export type ProductionReadinessStatus = 'pass' | 'fail' | 'skip';

export type ProductionReadinessResult = {
  name: string;
  status: ProductionReadinessStatus;
  message: string;
  ownerAction?: string;
};

export type ProductionReadinessConfig = {
  supabaseUrl: string;
  supabaseAnonKeyShape: 'jwt' | 'publishable';
  apexDomain: string;
  wwwDomain?: string;
};

export type ProductionReadinessParseResult = {
  config?: ProductionReadinessConfig;
  results: ProductionReadinessResult[];
};

export type DnsClient = {
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
  resolveCname(domain: string): Promise<string[]>;
  lookup?(domain: string, options: { all: true }): Promise<unknown[]>;
};

export type HttpClient = (url: string) => Promise<{ status: number }>;

export type ProductionReadinessClients = {
  dns?: DnsClient;
  http?: HttpClient;
};

const currentFile = fileURLToPath(import.meta.url);
const defaultApexDomain = 'studyprecalc.com';
const httpTimeoutMs = 10_000;

function readEnvValue(env: ProductionReadinessEnv, name: string): string {
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

function isDomainName(candidate: string): boolean {
  if (!candidate || candidate.length > 253 || candidate.includes('://')) {
    return false;
  }

  return candidate
    .split('.')
    .every(
      (label) =>
        /^[a-z0-9-]+$/i.test(label) &&
        label.length > 0 &&
        label.length <= 63 &&
        !label.startsWith('-') &&
        !label.endsWith('-'),
    );
}

function getSupabaseAnonKeyShape(value: string): ProductionReadinessConfig['supabaseAnonKeyShape'] {
  if (value.startsWith('sb_publishable_')) {
    return 'publishable';
  }

  if (value.split('.').length === 3 && value.startsWith('eyJ')) {
    return 'jwt';
  }

  throw new Error(
    'VITE_SUPABASE_ANON_KEY must look like a Supabase publishable key or legacy anon JWT.',
  );
}

export function parseProductionReadinessEnv(
  env: ProductionReadinessEnv,
): ProductionReadinessParseResult {
  const results: ProductionReadinessResult[] = [];
  const supabaseUrl = readEnvValue(env, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue(env, 'VITE_SUPABASE_ANON_KEY');
  const apexDomain = readEnvValue(env, 'READINESS_APEX_DOMAIN') || defaultApexDomain;
  const wwwDomain = readEnvValue(env, 'READINESS_WWW_DOMAIN');
  let supabaseAnonKeyShape: ProductionReadinessConfig['supabaseAnonKeyShape'] | undefined;

  if (!supabaseUrl) {
    results.push({
      name: 'env VITE_SUPABASE_URL',
      status: 'fail',
      message: 'Required production Supabase URL is missing.',
      ownerAction: 'Set VITE_SUPABASE_URL in the production environment.',
    });
  } else if (!isHttpUrl(supabaseUrl)) {
    results.push({
      name: 'env VITE_SUPABASE_URL',
      status: 'fail',
      message: 'Value must be a valid http(s) URL.',
      ownerAction: 'Update VITE_SUPABASE_URL to the production Supabase project URL.',
    });
  } else {
    results.push({
      name: 'env VITE_SUPABASE_URL',
      status: 'pass',
      message: 'Present with valid http(s) URL shape.',
    });
  }

  if (!supabaseAnonKey) {
    results.push({
      name: 'env VITE_SUPABASE_ANON_KEY',
      status: 'fail',
      message: 'Required browser-safe Supabase public key is missing.',
      ownerAction: 'Set VITE_SUPABASE_ANON_KEY to the Supabase publishable or anon public key.',
    });
  } else {
    try {
      supabaseAnonKeyShape = getSupabaseAnonKeyShape(supabaseAnonKey);
      results.push({
        name: 'env VITE_SUPABASE_ANON_KEY',
        status: 'pass',
        message: `Present with ${supabaseAnonKeyShape} public key shape.`,
      });
    } catch (error) {
      results.push({
        name: 'env VITE_SUPABASE_ANON_KEY',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Invalid public key shape.',
        ownerAction:
          'Use the Supabase publishable key or legacy anon public key, not a service key.',
      });
    }
  }

  if (!isDomainName(apexDomain)) {
    results.push({
      name: 'env READINESS_APEX_DOMAIN',
      status: 'fail',
      message: 'Apex domain must be a bare domain name such as studyprecalc.com.',
      ownerAction: 'Set READINESS_APEX_DOMAIN to the production apex domain.',
    });
  } else {
    results.push({
      name: 'env READINESS_APEX_DOMAIN',
      status: 'pass',
      message: `Using apex domain ${apexDomain}.`,
    });
  }

  if (!wwwDomain) {
    results.push({
      name: 'env READINESS_WWW_DOMAIN',
      status: 'skip',
      message: 'Optional www domain check is disabled.',
      ownerAction:
        'Set READINESS_WWW_DOMAIN=www.studyprecalc.com if the www hostname should be live.',
    });
  } else if (!isDomainName(wwwDomain)) {
    results.push({
      name: 'env READINESS_WWW_DOMAIN',
      status: 'fail',
      message: 'Optional www domain must be a domain name such as www.studyprecalc.com.',
      ownerAction: 'Set READINESS_WWW_DOMAIN to the optional production www hostname.',
    });
  } else {
    results.push({
      name: 'env READINESS_WWW_DOMAIN',
      status: 'pass',
      message: `Using optional www domain ${wwwDomain}.`,
    });
  }

  if (
    results.some(
      (result) =>
        result.status === 'fail' &&
        (result.name.startsWith('env VITE_') || result.name === 'env READINESS_APEX_DOMAIN'),
    ) ||
    !supabaseAnonKeyShape
  ) {
    return { results };
  }

  return {
    config: {
      supabaseUrl,
      supabaseAnonKeyShape,
      apexDomain,
      ...(wwwDomain && isDomainName(wwwDomain) ? { wwwDomain } : {}),
    },
    results,
  };
}

async function defaultHttpClient(url: string): Promise<{ status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), httpTimeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return { status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDns(domain: string, dnsClient: DnsClient): Promise<ProductionReadinessResult> {
  const lookups = await Promise.allSettled([
    dnsClient.resolve4(domain),
    dnsClient.resolve6(domain),
    dnsClient.resolveCname(domain),
  ]);
  let records: unknown[] = lookups.flatMap((lookup) =>
    lookup.status === 'fulfilled' ? lookup.value : [],
  );

  if (records.length === 0 && dnsClient.lookup) {
    try {
      records = await dnsClient.lookup(domain, { all: true });
    } catch {
      records = [];
    }
  }

  if (records.length === 0) {
    return {
      name: `dns ${domain}`,
      status: 'fail',
      message: 'No A, AAAA, or CNAME records resolved.',
      ownerAction: `Configure DNS for ${domain} in the domain registrar and Vercel.`,
    };
  }

  return {
    name: `dns ${domain}`,
    status: 'pass',
    message: `Resolved ${records.length} DNS record(s).`,
  };
}

async function checkHttp(
  domain: string,
  httpClient: HttpClient,
): Promise<ProductionReadinessResult> {
  const url = `https://${domain}/`;

  try {
    const response = await httpClient(url);

    if (response.status >= 200 && response.status < 400) {
      return {
        name: `http ${domain}`,
        status: 'pass',
        message: `HTTPS returned ${response.status}.`,
      };
    }

    return {
      name: `http ${domain}`,
      status: 'fail',
      message: `HTTPS returned ${response.status}; expected a 2xx or 3xx response.`,
      ownerAction: `Check the Vercel deployment and domain assignment for ${domain}.`,
    };
  } catch (error) {
    return {
      name: `http ${domain}`,
      status: 'fail',
      message: error instanceof Error ? error.message : 'HTTPS request failed.',
      ownerAction: `Check the Vercel deployment, TLS certificate, and DNS for ${domain}.`,
    };
  }
}

export async function runProductionReadinessChecks(
  config: ProductionReadinessConfig,
  clients: ProductionReadinessClients = {},
): Promise<ProductionReadinessResult[]> {
  const dnsClient = clients.dns ?? dns;
  const httpClient = clients.http ?? defaultHttpClient;
  const results: ProductionReadinessResult[] = [];

  for (const domain of [config.apexDomain, config.wwwDomain].filter(Boolean) as string[]) {
    results.push(await checkDns(domain, dnsClient));
    results.push(await checkHttp(domain, httpClient));
  }

  return results;
}

export function formatProductionReadinessResults(results: ProductionReadinessResult[]): string {
  return results
    .map((result) => {
      const label = result.status.toUpperCase().padEnd(4, ' ');
      return `[${label}] ${result.name}: ${result.message}`;
    })
    .join('\n');
}

export function formatProductionReadinessNextActions(results: ProductionReadinessResult[]): string {
  const actions = results
    .map((result) => result.ownerAction)
    .filter((action): action is string => Boolean(action))
    .filter((action, index, allActions) => allActions.indexOf(action) === index);

  if (actions.length === 0) {
    return '';
  }

  return ['Owner next action(s):', ...actions.map((action) => `- ${action}`)].join('\n');
}

export function getProductionReadinessExitCode(results: ProductionReadinessResult[]): number {
  return results.some((result) => result.status === 'fail') ? 1 : 0;
}

const isCliEntryPoint = () =>
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile;

async function main() {
  const viteEnv = loadEnv(process.env.MODE ?? 'production', process.cwd(), '');
  const parseResult = parseProductionReadinessEnv({
    ...viteEnv,
    ...process.env,
  });
  const networkResults = parseResult.config
    ? await runProductionReadinessChecks(parseResult.config)
    : [];
  const results = [...parseResult.results, ...networkResults];
  const output = [
    formatProductionReadinessResults(results),
    formatProductionReadinessNextActions(results),
  ]
    .filter(Boolean)
    .join('\n\n');

  if (output) {
    console.log(output);
  }

  process.exitCode = getProductionReadinessExitCode(results);
}

if (isCliEntryPoint()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
