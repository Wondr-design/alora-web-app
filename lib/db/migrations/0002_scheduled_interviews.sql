ALTER TABLE "interviews" ADD COLUMN "scheduled_at" timestamp with time zone;
ALTER TABLE "interviews" ADD COLUMN "scheduled_timezone" text;
ALTER TABLE "interviews" ADD COLUMN "auto_start" boolean DEFAULT false NOT NULL;
ALTER TABLE "interviews" ADD COLUMN "target_duration_seconds" integer;
CREATE INDEX "interviews_scheduled_at_idx" ON "interviews" USING btree ("scheduled_at");
