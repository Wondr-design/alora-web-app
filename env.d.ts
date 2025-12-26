declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_BASE_URL?: string;
    NEXT_PUBLIC_LIVEKIT_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    DATABASE_URL?: string;
  }
}
