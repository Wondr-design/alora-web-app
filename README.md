This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Tools for logs/metrics/observability

Agent + LLM behavior

LiveKit Agents metrics hooks (built-in metrics in the agent SDK).
Langfuse or Helicone for LLM tracing, prompts, latency, token usage.
OpenTelemetry + OTLP exporter for unified traces (to Grafana Tempo/Datadog/etc).
Backend/API monitoring

Sentry for errors and performance traces.
Prometheus + Grafana for request metrics + custom counters.
Loki/OpenSearch/ELK for structured logs.
Frontend/product analytics

PostHog (events + session replay) or Amplitude/Mixpanel for product analytics.
Vercel Analytics/Speed Insights for web performance.
User tracking (who/where/how long)

PostHog/Amplitude for user activity + cohorts.
Store server‑side events (session start/end, duration, uploads) in your DB for accuracy.
If you need geo, resolve IP at the edge and store a coarse region.

## Scheduling + Redis

Required server env vars:

- `REDIS_URL` (Coolify internal Redis URL, or Supabase Cache URL)
- `SUPABASE_REDIS_URL` (optional fallback if you want to keep Supabase’s variable name)
- `REDIS_PREFIX` (optional key prefix, defaults to `alora`)
- `INTERVIEW_CACHE_TTL_SECONDS` (fresh cache window, seconds)
- `INTERVIEW_CACHE_STALE_SECONDS` (serve stale while revalidating, seconds)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_BASE_URL` (used in schedule emails)
- `CRON_SECRET` (protects reminder cron endpoint)

Schedule reminders are queued in Redis and sent by a cron call to:

```
POST /api/cron/schedules
Header: x-cron-secret: <CRON_SECRET>
```

Store schedule timestamps as UTC; the UI renders in the viewer’s local time.
Interview list/detail endpoints use Redis caching with stale-while-revalidate for fast loads.
The app also exposes tRPC at `/api/trpc` for typed, batched calls (file uploads still use REST).
Legacy REST endpoints under `/api/*` remain available for external callers or fallback usage, but the UI now uses tRPC for interviews, schedules, notifications, presence, and events.

Legacy REST endpoints (kept for external callers):
- `GET /api/interviews`
- `GET /api/interviews/[interviewId]`
- `POST /api/interviews/start`
- `POST /api/interviews/complete`
- `POST /api/schedules`
- `GET /api/notifications`
- `POST /api/notifications`
- `GET /api/presence`
- `POST /api/presence`
- `GET /api/events`
- `POST /api/events`

tRPC equivalents:
- `trpc.interviews.list` → `GET /api/interviews`
- `trpc.interviews.detail` → `GET /api/interviews/[interviewId]`
- `trpc.interviews.start` → `POST /api/interviews/start`
- `trpc.interviews.complete` → `POST /api/interviews/complete`
- `trpc.schedules.create` → `POST /api/schedules`
- `trpc.notifications.list` → `GET /api/notifications`
- `trpc.notifications.read` → `POST /api/notifications`
- `trpc.presence.get` → `GET /api/presence`
- `trpc.presence.ping` → `POST /api/presence`
- `trpc.events.list` → `GET /api/events`
- `trpc.events.log` → `POST /api/events`

Keep REST (do not move to tRPC):
- File uploads (`/documents/upload`, `/documents/text`) for multipart payloads.
- Python AI endpoints (`/session/*`, `/token`) for cross-service calls and non-Next consumers.

### Realtime updates (WebSocket)

Interview list updates use Supabase Realtime. Enable it for the `interviews` table:

```sql
alter table public.interviews replica identity full;
alter table public.interview_summaries replica identity full;
alter table public.interview_messages replica identity full;
alter table public.notifications replica identity full;
alter table public.user_presence replica identity full;
alter table public.session_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'interviews'
  ) then
    alter publication supabase_realtime add table public.interviews;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'interview_summaries'
  ) then
    alter publication supabase_realtime add table public.interview_summaries;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'interview_messages'
  ) then
    alter publication supabase_realtime add table public.interview_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_presence'
  ) then
    alter publication supabase_realtime add table public.user_presence;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_events'
  ) then
    alter publication supabase_realtime add table public.session_events;
  end if;
end $$;
```
# alora-web-app
