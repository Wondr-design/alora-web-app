interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required. Please check your .env.local file and restart the dev server.`);
  }
  return value.trim();
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url?.trim() && anonKey?.trim());
}
