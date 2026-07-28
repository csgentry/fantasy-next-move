"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthStatus({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        setEmail(data.user?.email || null);
        setReady(true);
      }).catch(() => setReady(true));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user.email || null);
        setReady(true);
      });
      return () => listener.subscription.unsubscribe();
    } catch {
      setReady(true);
    }
  }, []);

  if (!ready) return <span className="auth-status-placeholder">Checking account…</span>;
  if (email) return <Link className={compact ? "text-button" : "button small secondary"} href="/account">Account</Link>;
  return <Link className={compact ? "text-button" : "button small secondary"} href="/login">Beta login</Link>;
}
