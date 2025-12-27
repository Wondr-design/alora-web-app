import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM_EMAIL

if (!resendApiKey) {
  console.warn("RESEND_API_KEY is not set. Email sending will fail.")
}

export type ScheduleEmailType = "confirmation" | "reminder"

export interface ScheduleEmailPayload {
  to: string
  scheduledAt: Date
  timezone: string
  sessionId: string
  durationMinutes?: number | null
  autoStart: boolean
  type: ScheduleEmailType
}

const resend = resendApiKey ? new Resend(resendApiKey) : null

function formatScheduleDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function buildInterviewLink(sessionId: string) {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "")
  if (!baseUrl) return `interview/${sessionId}`
  return `${baseUrl}/interview/${sessionId}`
}

function buildScheduleEmail({
  to,
  scheduledAt,
  timezone,
  sessionId,
  durationMinutes,
  autoStart,
  type,
}: ScheduleEmailPayload) {
  const formatted = formatScheduleDate(scheduledAt, timezone)
  const link = buildInterviewLink(sessionId)
  const subject =
    type === "confirmation"
      ? "Your interview is scheduled"
      : "Interview reminder (10 minutes)"

  const durationLine = durationMinutes
    ? `<p><strong>Duration:</strong> ${durationMinutes} minutes</p>`
    : ""

  const autoStartLine = autoStart
    ? "<p>Auto-start is enabled. If the app is open, the interview will begin automatically.</p>"
    : "<p>Auto-start is off. Open the app and press the green button to begin.</p>"

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">${subject}</h2>
      <p>Hi${to ? "" : ""},</p>
      <p>Your interview is set for <strong>${formatted}</strong> (${timezone}).</p>
      ${durationLine}
      <p><strong>Join link:</strong> <a href="${link}">${link}</a></p>
      ${autoStartLine}
      <p style="margin-top: 24px; font-size: 12px; color: #666;">If you didn’t schedule this, you can ignore this email.</p>
    </div>
  `

  return { subject, html }
}

export async function sendScheduleEmail(payload: ScheduleEmailPayload) {
  if (!resend || !resendFrom) {
    throw new Error("Resend is not configured")
  }

  const { subject, html } = buildScheduleEmail(payload)

  await resend.emails.send({
    from: resendFrom,
    to: payload.to,
    subject,
    html,
  })
}
