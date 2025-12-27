CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "title" text,
  "message" text,
  "payload" jsonb,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");

CREATE TABLE "user_presence" (
  "user_id" uuid PRIMARY KEY REFERENCES "profiles"("id") ON DELETE cascade,
  "session_id" text,
  "status" text,
  "last_seen" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "user_presence_last_seen_idx" ON "user_presence" USING btree ("last_seen");

CREATE TABLE "session_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
  "session_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "session_events_user_id_idx" ON "session_events" USING btree ("user_id");
CREATE INDEX "session_events_session_id_idx" ON "session_events" USING btree ("session_id");
CREATE INDEX "session_events_event_type_idx" ON "session_events" USING btree ("event_type");
CREATE INDEX "session_events_created_at_idx" ON "session_events" USING btree ("created_at");
