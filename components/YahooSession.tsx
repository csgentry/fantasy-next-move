"use client";
import {createContext, useCallback, useContext, useEffect, useState, type ReactNode} from "react";
import {createClient} from "@/lib/supabase/client";
import {setFantasyAnalyticsSuppressed} from "@/lib/transient-provider-state";
import type {ImportedLeague} from "@/lib/types";
type Selection = {ownerId: string; league: ImportedLeague};
const Context = createContext<{selection: Selection | null; select: (value: Selection | null) => void}>({selection: null, select: () => {}});
export function YahooSession({children}: {children: ReactNode}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const select = useCallback((value: Selection | null) => {setFantasyAnalyticsSuppressed(Boolean(value)); setSelection(value);}, []);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    const {data} = createClient().auth.onAuthStateChange((_event, session) => {
      setSelection(current => {if (current && current.ownerId !== session?.user.id) {setFantasyAnalyticsSuppressed(false); return null;} return current;});
    });
    const clear = () => select(null);
    window.addEventListener("pagehide", clear);
    return () => {data.subscription.unsubscribe(); window.removeEventListener("pagehide", clear); setFantasyAnalyticsSuppressed(false);};
  }, [select]);
  return <Context.Provider value={{selection, select}}>{children}</Context.Provider>;
}
export function useYahooSession() {return useContext(Context);}
