"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function AuthActionButton({
  className,
  loginLabel = "Login",
  logoutLabel = "Logout",
  onSignedOut,
}: AuthActionButtonProps) {
  const supabase = getSupabaseBrowserClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(() => !supabase)

  useEffect(() => {
    if (!supabase) return

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      const isAnonymous = Boolean(data.session?.user?.is_anonymous)
      setIsAuthenticated(Boolean(data.session && !isAnonymous))
      setIsInitialized(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const isAnonymous = Boolean(session?.user?.is_anonymous)
      setIsAuthenticated(Boolean(session && !isAnonymous))
      setIsInitialized(true)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    if (onSignedOut) onSignedOut()
  }

  if (!isInitialized)
    return (
      <Link href="/auth" className={className}>
        {loginLabel}
      </Link>
    )

  if (!isAuthenticated)
    return (
      <Link href="/auth" className={className}>
        {loginLabel}
      </Link>
    )

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {logoutLabel}
    </button>
  )
}

interface AuthActionButtonProps {
  className?: string
  loginLabel?: string
  logoutLabel?: string
  onSignedOut?: () => void
}
