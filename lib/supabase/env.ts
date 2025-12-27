export interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let warnedMissing = false;

function readEnv(): SupabaseEnv | null {
  const url = process.env[URL_VAR]?.trim();
  const anonKey = process.env[ANON_KEY_VAR]?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function hasSupabaseEnv() {
  return Boolean(readEnv());
}

export function getSupabaseEnvOptional(context?: string): SupabaseEnv | null {
  const env = readEnv();
  if (!env && !warnedMissing) {
    warnedMissing = true;
    const suffix = context ? ` while ${context}` : "";
    console.warn(
      `[Supabase] Missing ${URL_VAR}/${ANON_KEY_VAR}${suffix}. Set them in your deployment env vars (or .env.local for dev) and redeploy.`
    );
  }
  return env;
}

export function getSupabaseEnv(context?: string): SupabaseEnv {
  const env = readEnv();
  if (!env) {
    const suffix = context ? ` [context: ${context}]` : "";
    throw new Error(
      `${URL_VAR} and ${ANON_KEY_VAR} are required. Set them in your deployment env vars (or .env.local for dev) and redeploy/restart.${suffix}`
    );
  }
  return env;
}
