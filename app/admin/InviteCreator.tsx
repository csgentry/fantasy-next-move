"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createInvite, type InviteActionState } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";

const initialState: InviteActionState = {
  status: "idle",
  message: "",
  code: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Creating invite…" : "Create beta invite"}
    </button>
  );
}

export function InviteCreator() {
  const [state, formAction] = useActionState(createInvite, initialState);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [state.code]);

  async function copyCode() {
    if (!state.code) return;

    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={`panel ${styles.creator}`}>
      <div className={styles.sectionHeading}>
        <div>
          <span className="eyebrow">Create access</span>
          <h2>New beta invite</h2>
        </div>
        <span className={styles.secureBadge}>Server generated</span>
      </div>

      <form action={formAction} className={styles.form}>
        <label>
          Tester email
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tester@example.com"
            required
          />
          <small>The invite will work only for this email address.</small>
        </label>

        <label>
          Expires in
          <select name="expiresInDays" defaultValue="14">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
          <small>Every invite is single-use and tied to the tester email.</small>
        </label>

        <SubmitButton />
      </form>

      {state.message && (
        <div
          className={`${styles.actionMessage} ${
            state.status === "error" ? styles.actionError : styles.actionSuccess
          }`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && state.code && (
        <div className={styles.codeCard}>
          <div>
            <span>Invite code</span>
            <code>{state.code}</code>
          </div>
          <button
            className="button secondary small"
            type="button"
            onClick={copyCode}
          >
            {copied ? "Copied" : "Copy code"}
          </button>
          <p>
            This is the only time the full code can be viewed. Send it privately
            to the invited tester.
          </p>
        </div>
      )}
    </section>
  );
}
