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

## Ports

- App listens on `3000`.

## Local via Compose

```bash
docker compose up --build
```

Make sure the needed variables exist in your shell or a `.env` file in the project root.
