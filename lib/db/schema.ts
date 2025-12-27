import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

const authSchema = pgSchema("auth")

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
})

export const documentTypeEnum = pgEnum("document_type", [
  "cv",
  "resume",
  "job_description",
  "other",
])

export const interviewStatusEnum = pgEnum("interview_status", [
  "scheduled",
  "in_progress",
  "completed",
  "canceled",
  "failed",
])

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
])

export const planIntervalEnum = pgEnum("plan_interval", ["month", "year"])
export const messageRoleEnum = pgEnum("message_role", ["agent", "user"])

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    createdAtIndex: index("profiles_created_at_idx").on(table.createdAt),
  })
)

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    status: interviewStatusEnum("status").notNull(),
    title: text("title"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    scheduledTimezone: text("scheduled_timezone"),
    autoStart: boolean("auto_start").default(false).notNull(),
    targetDurationSeconds: integer("target_duration_seconds"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIndex: index("interviews_user_id_idx").on(table.userId),
    statusIndex: index("interviews_status_idx").on(table.status),
    scheduledAtIndex: index("interviews_scheduled_at_idx").on(table.scheduledAt),
  })
)

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    interviewId: uuid("interview_id").references(() => interviews.id, {
      onDelete: "set null",
    }),
    documentType: documentTypeEnum("document_type").notNull(),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type"),
    fileSizeBytes: integer("file_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIndex: index("documents_user_id_idx").on(table.userId),
    interviewIdIndex: index("documents_interview_id_idx").on(table.interviewId),
  })
)

export const interviewMessages = pgTable(
  "interview_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    interviewIdIndex: index("interview_messages_interview_id_idx").on(
      table.interviewId
    ),
  })
)

export const interviewSummaries = pgTable(
  "interview_summaries",
  {
    interviewId: uuid("interview_id")
      .primaryKey()
      .references(() => interviews.id, { onDelete: "cascade" }),
    summary: jsonb("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    interviewIdIndex: index("interview_summaries_interview_id_idx").on(
      table.interviewId
    ),
  })
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title"),
    message: text("message"),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIndex: index("notifications_user_id_idx").on(table.userId),
    createdAtIndex: index("notifications_created_at_idx").on(table.createdAt),
  })
)

export const userPresence = pgTable(
  "user_presence",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    status: text("status"),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    lastSeenIndex: index("user_presence_last_seen_idx").on(table.lastSeen),
  })
)

export const sessionEvents = pgTable(
  "session_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIndex: index("session_events_user_id_idx").on(table.userId),
    sessionIdIndex: index("session_events_session_id_idx").on(table.sessionId),
    eventTypeIndex: index("session_events_event_type_idx").on(table.eventType),
    createdAtIndex: index("session_events_created_at_idx").on(table.createdAt),
  })
)

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    interval: planIntervalEnum("interval").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").default("usd").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    limits: jsonb("limits").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIndex: index("plans_code_idx").on(table.code),
  })
)

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => plans.id, {
      onDelete: "set null",
    }),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .default(false)
      .notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIndex: index("subscriptions_user_id_idx").on(table.userId),
  })
)

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    interviewsUsed: integer("interviews_used").default(0).notNull(),
    minutesUsed: integer("minutes_used").default(0).notNull(),
    uploadsUsed: integer("uploads_used").default(0).notNull(),
    storageBytesUsed: integer("storage_bytes_used").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.periodStart] }),
  })
)
