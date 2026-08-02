import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessLevel } from "./config";

export type UserEntitlement = {
  accessLevel: AccessLevel;
  accessSource: "stripe" | "complimentary" | "beta" | "admin" | "none";
  tradeLabAccess: boolean;
  allAccess: boolean;
  maxConnectedLeagues: number;
  validUntil: string | null;
  foundingMember: boolean;
};

export const NO_ENTITLEMENT: UserEntitlement = {
  accessLevel: "none",
  accessSource: "none",
  tradeLabAccess: false,
  allAccess: false,
  maxConnectedLeagues: 0,
  validUntil: null,
  foundingMember: false
};

export async function getUserEntitlement(supabase: SupabaseClient, userId: string): Promise<UserEntitlement> {
  const [{ data: profile }, entitlementResult] = await Promise.all([
    supabase.from("profiles").select("beta_access").eq("id", userId).maybeSingle(),
    supabase.from("entitlements")
      .select("access_level,access_source,trade_lab_access,all_access,max_connected_leagues,valid_until,founding_member")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (entitlementResult.data) {
    const row = entitlementResult.data;
    const expired = Boolean(row.valid_until && new Date(row.valid_until).getTime() <= Date.now());
    if (!expired && (row.trade_lab_access || row.all_access || row.access_level === "admin")) {
      return {
        accessLevel: row.access_level as AccessLevel,
        accessSource: row.access_source,
        tradeLabAccess: Boolean(row.trade_lab_access),
        allAccess: Boolean(row.all_access),
        maxConnectedLeagues: Number(row.max_connected_leagues || 0),
        validUntil: row.valid_until,
        foundingMember: Boolean(row.founding_member)
      };
    }
  }

  if (profile?.beta_access) {
    return {
      accessLevel: "all_access",
      accessSource: "beta",
      tradeLabAccess: true,
      allAccess: true,
      maxConnectedLeagues: 10,
      validUntil: null,
      foundingMember: false
    };
  }
  return NO_ENTITLEMENT;
}

export function entitlementAllows(entitlement: UserEntitlement, required: "trade_lab" | "all_access") {
  return required === "trade_lab" ? entitlement.tradeLabAccess || entitlement.allAccess : entitlement.allAccess;
}
