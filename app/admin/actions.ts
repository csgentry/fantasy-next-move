"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

export type InviteActionState = {
  status: "idle" | "success" | "error";
  message: string;
  code: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createInvite(
  _previousState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      status: "error",
      message: "Your admin session expired. Sign in again.",
      code: ""
    };
  }

  const email = value(formData, "email").toLowerCase();
  const expiresInDays = Number(value(formData, "expiresInDays") || "14");

  if (!looksLikeEmail(email) || email.length > 254) {
    return {
      status: "error",
      message: "Enter a valid email address for the beta tester.",
      code: ""
    };
  }

  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
    return {
      status: "error",
      message: "Expiration must be between 1 and 90 days.",
      code: ""
    };
  }


  const code = `FNM-${randomBytes(18).toString("base64url")}`;
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("beta_invites").insert({
      code_hash: codeHash,
      email,
      active: true,
      max_uses: 1,
      uses: 0,
      expires_at: expiresAt
    });

    if (error) {
      return {
        status: "error",
        message: error.message,
        code: ""
      };
    }

    revalidatePath("/admin");

    return {
      status: "success",
      message: `Invite created for ${email}. Copy it now—the plaintext code is not stored.`,
      code
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create the invite.",
      code: ""
    };
  }
}

export async function expireInvite(formData: FormData) {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized.");

  const inviteId = value(formData, "inviteId");
  if (!inviteId) throw new Error("Invite ID is required.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("beta_invites")
    .update({ active: false })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
