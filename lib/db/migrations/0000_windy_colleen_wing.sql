CREATE TYPE "public"."document_type" AS ENUM('cv', 'resume', 'job_description', 'other');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('scheduled', 'in_progress', 'completed', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"interview_id" uuid,
	"document_type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"status" "interview_status" NOT NULL,
	"title" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"interval" "plan_interval" NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"user_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"interviews_used" integer DEFAULT 0 NOT NULL,
	"minutes_used" integer DEFAULT 0 NOT NULL,
	"uploads_used" integer DEFAULT 0 NOT NULL,
	"storage_bytes_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_counters_user_id_period_start_pk" PRIMARY KEY("user_id","period_start")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_interview_id_idx" ON "documents" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interviews_user_id_idx" ON "interviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interviews_status_idx" ON "interviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plans_code_idx" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "profiles_created_at_idx" ON "profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");