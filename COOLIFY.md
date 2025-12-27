# Coolify Deploy Notes

This project ships a Dockerfile and a `docker-compose.yml`. Coolify should build the image and run the container with the correct build args and runtime envs.

## Build Args (required)

These must be provided at build time so the Next.js frontend can bake them into the bundle:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`

## Runtime Env (required)

These are server-only and should be provided at runtime:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `REDIS_URL`
- `REDIS_PREFIX`
- `INTERVIEW_CACHE_TTL_SECONDS`
- `INTERVIEW_CACHE_STALE_SECONDS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_BASE_URL`
- `CRON_SECRET`

## Ports

- App listens on `3000`.

## Cron

Trigger schedule reminders by calling:

```
POST /api/cron/schedules
Header: x-cron-secret: <CRON_SECRET>
```

## Local via Compose

```bash
docker compose up --build
```

Make sure the needed variables exist in your shell or a `.env` file in the project root.
