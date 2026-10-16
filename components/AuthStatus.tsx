"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthStatus({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      try {
        const supabase = createClient();
        const {data:listener} = supabase.auth.onAuthStateChange((_event,session) => {
          if (!cancelled) {setEmail(session?.user.email || null);setReady(true);}
        });
        unsubscribe = () => listener.subscription.unsubscribe();
        const {data} = await supabase.auth.getUser();
        if (!cancelled) {setEmail(data.user?.email || null);setReady(true);}
      } catch {if(!cancelled) setReady(true);}
    }
    void initialize();
    return () => {cancelled=true;unsubscribe?.();};
  }, []);

  if (!ready) return <span className="auth-status-placeholder">Checking account…</span>;
  if (email) return <Link className={compact ? "text-button" : "button small secondary"} href="/account">Account</Link>;
  return <Link className={compact ? "text-button" : "button small secondary"} href="/login">Beta login</Link>;
}
