"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function withMessage(path: string, key: "error" | "message", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

async function appOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const requestedNext = value(formData, "next");
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";
  if (!email || !password) redirect(withMessage("/login", "error", "Enter your email and password."));
  if (email.length > 254 || password.length > 256) redirect(withMessage("/login", "error", "The sign-in details are too long."));

  let failure = "";
  let destination = next;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      failure = error?.message || "Unable to sign in.";
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : "Unable to sign in.";
  }
  if (failure) redirect(withMessage("/login", "error", failure));
  redirect(destination);
}

export async function signUp(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  const inviteCode = value(formData, "inviteCode");
  if (!email || !password) redirect(withMessage("/signup", "error", "Email and password are required."));
  if (email.length > 254 || password.length > 256 || inviteCode.length > 200) redirect(withMessage("/signup", "error", "One or more signup fields are too long."));
  if (password.length < 8) redirect(withMessage("/signup", "error", "Use a password with at least 8 characters."));
  if (password !== confirmPassword) redirect(withMessage("/signup", "error", "The passwords do not match."));

  let failure = "";
  try {
    const admin = createAdminClient();
    let inviteHash = "";
    if (inviteCode) {
      if (inviteCode.length < 12) redirect(withMessage("/signup", "error", "That complimentary-access code is not valid."));
      inviteHash = createHash("sha256").update(inviteCode).digest("hex");
      const { data: invite, error: inviteError } = await admin.from("beta_invites")
        .select("active,max_uses,uses,expires_at,email")
        .eq("code_hash", inviteHash)
        .maybeSingle();
      const inviteExpired = Boolean(invite?.expires_at && new Date(invite.expires_at).getTime() <= Date.now());
      const wrongEmail = Boolean(invite?.email && String(invite.email).toLowerCase() !== email);
      if (inviteError || !invite || !invite.active || invite.uses >= invite.max_uses || inviteExpired || wrongEmail) {
        failure = "That complimentary-access code is invalid, expired, already used, or assigned to another email.";
      }
    }

    if (!failure) {
      const supabase = await createClient();
      const origin = await appOrigin();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/confirm?next=${inviteCode ? "/dashboard" : "/pricing"}` }
      });
      if (error || !data.user || data.user.identities?.length === 0) {
        failure = error?.message || "An account with that email may already exist. Try signing in instead.";
      } else if (inviteCode) {
        const { data: redeemed, error: redeemError } = await admin.rpc("redeem_beta_invite", {
          invite_hash: inviteHash,
          invite_email: email,
          invited_user_id: data.user.id
        });
        if (redeemError || redeemed !== true) {
          await admin.auth.admin.deleteUser(data.user.id);
          failure = "That complimentary-access code was claimed before signup completed. Ask for a new code.";
        }
      }
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : "Unable to create the account.";
  }
  if (failure) redirect(withMessage("/signup", "error", failure));
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function sendPasswordReset(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  if (!email) redirect(withMessage("/forgot-password", "error", "Enter your email address."));
  if (email.length > 254) redirect(withMessage("/forgot-password", "error", "The email address is too long."));
  let failure = "";
  try {
    const supabase = await createClient();
    const origin = await appOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/update-password` });
    if (error) failure = error.message;
  } catch (error) {
    failure = error instanceof Error ? error.message : "Unable to send the reset email.";
  }
  if (failure) redirect(withMessage("/forgot-password", "error", failure));
  redirect(withMessage("/forgot-password", "message", "Check your email for a password-reset link."));
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (password.length < 8) redirect(withMessage("/update-password", "error", "Use a password with at least 8 characters."));
  if (password.length > 256) redirect(withMessage("/update-password", "error", "The password is too long."));
  if (password !== confirmPassword) redirect(withMessage("/update-password", "error", "The passwords do not match."));
  let failure = "";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) failure = error.message;
  } catch (error) {
    failure = error instanceof Error ? error.message : "Unable to update the password.";
  }
  if (failure) redirect(withMessage("/update-password", "error", failure));
  redirect(withMessage("/account", "message", "Password updated."));
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Redirect even if the local session was already cleared.
  }
  redirect("/");
}

export async function deleteAccount(formData: FormData) {
  if (value(formData, "confirmation") !== "DELETE") redirect(withMessage("/account", "error", "Type DELETE to confirm account deletion."));
  let failure = "";
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      failure = "Your session expired. Sign in again before deleting the account.";
    } else {
      const admin = createAdminClient();
      const { data: activeSubscription } = await admin.from("subscriptions")
        .select("status")
        .eq("user_id", data.user.id)
        .in("status", ["active", "trialing", "past_due", "incomplete"])
        .limit(1)
        .maybeSingle();
      if (activeSubscription) {
        failure = "Cancel your active subscription in Manage Billing before deleting the account.";
      } else {
        const { error } = await admin.auth.admin.deleteUser(data.user.id);
        if (error) failure = error.message;
        else await supabase.auth.signOut();
      }
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : "Unable to delete the account.";
  }
  if (failure) redirect(withMessage("/account", "error", failure));
  redirect(withMessage("/", "message", "Your FantasyNextMove account and stored beta data were deleted."));
}
