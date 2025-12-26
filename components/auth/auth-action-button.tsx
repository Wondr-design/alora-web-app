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
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false)
      setIsInitialized(true)
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setIsAuthenticated(Boolean(data.session))
      setIsInitialized(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setIsAuthenticated(Boolean(session))
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
