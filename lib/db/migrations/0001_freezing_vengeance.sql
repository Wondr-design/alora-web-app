CREATE TYPE "public"."message_role" AS ENUM('agent', 'user');--> statement-breakpoint
CREATE TABLE "interview_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_summaries" (
	"interview_id" uuid PRIMARY KEY NOT NULL,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_summaries" ADD CONSTRAINT "interview_summaries_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_messages_interview_id_idx" ON "interview_messages" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_summaries_interview_id_idx" ON "interview_summaries" USING btree ("interview_id");