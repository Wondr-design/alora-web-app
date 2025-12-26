"use client"

import { useRef, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function AuthScreen() {
  const supabase = getSupabaseBrowserClient()
  const passwordActionRef = useRef<PasswordAction>("sign-in")
  const [statusMessage, setStatusMessage] = useState("")
  const [statusError, setStatusError] = useState("")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isMagicLoading, setIsMagicLoading] = useState(false)

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const magicForm = useForm<MagicFormValues>({
    resolver: zodResolver(magicSchema),
    defaultValues: {
      email: "",
    },
  })

  if (!supabase)
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Alora
            </p>
            <h1 className="text-3xl font-semibold">Sign in</h1>
            <p className="text-sm text-white/60">
              Auth is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.
            </p>
          </div>
        </div>
      </div>
    )

  function setStatus({ message, error }: StatusPayload) {
    setStatusMessage(message ?? "")
    setStatusError(error ?? "")
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setStatus({ error: "Auth is not configured." })
      return
    }

    setIsGoogleLoading(true)
    setStatus({ message: "", error: "" })

    const redirectTo = getRedirectUrl({ origin: window.location.origin })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })

    if (error) setStatus({ error: error.message })
    setIsGoogleLoading(false)
  }

  async function handlePasswordSubmit(values: PasswordFormValues) {
    if (!supabase) {
      setStatus({ error: "Auth is not configured." })
      return
    }

    setIsPasswordLoading(true)
    setStatus({ message: "", error: "" })

    const isSignUp = passwordActionRef.current === "sign-up"
    const result = isSignUp
      ? await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        })
      : await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

    if (result.error) {
      setStatus({ error: result.error.message })
      setIsPasswordLoading(false)
      return
    }

    setStatus({
      message: isSignUp
        ? "Check your email to confirm your account."
        : "Signed in successfully.",
    })
    setIsPasswordLoading(false)
  }

  async function handleMagicSubmit(values: MagicFormValues) {
    if (!supabase) {
      setStatus({ error: "Auth is not configured." })
      return
    }

    setIsMagicLoading(true)
    setStatus({ message: "", error: "" })

    const redirectTo = getRedirectUrl({ origin: window.location.origin })
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      setStatus({ error: error.message })
      setIsMagicLoading(false)
      return
    }

    setStatus({ message: "Check your email for a sign-in link." })
    setIsMagicLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Alora
          </p>
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="text-sm text-white/60">
            Use Google, email/password, or a magic link.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full rounded-full"
          >
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Email + password
            </p>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...passwordForm.register("email")}
                />
                {passwordForm.formState.errors.email?.message && (
                  <p className="text-xs text-rose-300">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="current-password"
                  {...passwordForm.register("password")}
                />
                {passwordForm.formState.errors.password?.message && (
                  <p className="text-xs text-rose-300">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  onClick={() => {
                    passwordActionRef.current = "sign-in"
                  }}
                  disabled={isPasswordLoading}
                  className="flex-1 rounded-full"
                >
                  {isPasswordLoading ? "Signing in..." : "Sign in"}
                </Button>
                <Button
                  type="submit"
                  onClick={() => {
                    passwordActionRef.current = "sign-up"
                  }}
                  disabled={isPasswordLoading}
                  variant="secondary"
                  className="flex-1 rounded-full"
                >
                  Create account
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Magic link
            </p>
            <form
              className="space-y-4"
              onSubmit={magicForm.handleSubmit(handleMagicSubmit)}
            >
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...magicForm.register("email")}
                />
                {magicForm.formState.errors.email?.message && (
                  <p className="text-xs text-rose-300">
                    {magicForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isMagicLoading}
                className="w-full rounded-full"
                variant="secondary"
              >
                {isMagicLoading ? "Sending link..." : "Send magic link"}
              </Button>
            </form>
          </div>

          {(statusMessage || statusError) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                statusError
                  ? "border-rose-400/30 text-rose-200"
                  : "border-emerald-400/30 text-emerald-200"
              }`}
            >
              {statusError || statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getRedirectUrl({ origin }: { origin: string }) {
  return `${origin}/auth/callback`
}

const passwordSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

const magicSchema = z.object({
  email: z.string().email("Enter a valid email."),
})

interface PasswordFormValues {
  email: string
  password: string
}

interface MagicFormValues {
  email: string
}

type PasswordAction = "sign-in" | "sign-up"

interface StatusPayload {
  message?: string
  error?: string
}
