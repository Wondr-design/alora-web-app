declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_BASE_URL?: string;
    NEXT_PUBLIC_LIVEKIT_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    DATABASE_URL?: string;
    REDIS_URL?: string;
    REDIS_PREFIX?: string;
    INTERVIEW_CACHE_TTL_SECONDS?: string;
    INTERVIEW_CACHE_STALE_SECONDS?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    APP_BASE_URL?: string;
    CRON_SECRET?: string;
  }
}
