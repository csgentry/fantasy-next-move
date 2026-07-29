import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InviteCreator } from "@/app/admin/InviteCreator";
import { expireInvite } from "@/app/admin/actions";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

type InviteRow = {
  id: string;
  email: string | null;
  active: boolean;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
};

type InviteStatus = "Active" | "Used" | "Expired" | "Revoked";

function statusFor(invite: InviteRow): InviteStatus {
  if (invite.uses >= invite.max_uses) return "Used";
  if (!invite.active) return "Revoked";
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    return "Expired";
  }
  return "Active";
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login?next=/admin");
  if (!isAdminEmail(data.user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: inviteData, error } = await admin
    .from("beta_invites")
    .select("id,email,active,max_uses,uses,expires_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const invites = (inviteData || []) as InviteRow[];
  const activeCount = invites.filter((invite) => statusFor(invite) === "Active").length;
  const usedCount = invites.filter((invite) => statusFor(invite) === "Used").length;
  const inactiveCount = invites.length - activeCount - usedCount;

  return (
    <AppShell showAdmin>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Private controls</span>
          <h1>Beta Admin</h1>
          <p>Create, copy, expire, and review FantasyNextMove beta invitations.</p>
        </div>
        <span className={styles.adminIdentity}>{data.user.email}</span>
      </div>

      <section className="stats-grid three">
        <article className="stat-card">
          <span>Total invites</span>
          <strong>{invites.length}</strong>
          <small>Newest 100 shown</small>
        </article>
        <article className="stat-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
          <small>Available to redeem</small>
        </article>
        <article className="stat-card">
          <span>Used</span>
          <strong>{usedCount}</strong>
          <small>Successfully claimed</small>
        </article>
      </section>

      <div className={styles.adminGrid}>
        <InviteCreator />

        <section className={`panel ${styles.guidance}`}>
          <span className="eyebrow">Safe workflow</span>
          <h2>One tester, one code</h2>
          <p>
            Assign every invite to a specific email, keep normal invites at one
            use, and expire anything you no longer intend to send.
          </p>
          <div className={styles.guidanceStat}>
            <span>Expired or revoked</span>
            <strong>{inactiveCount}</strong>
          </div>
          <div className={styles.guidanceNote}>
            Invite codes are stored only as SHA-256 hashes. A full code cannot be
            recovered after you leave the creation result.
          </div>
        </section>
      </div>

      <section className={`panel ${styles.invitePanel}`}>
        <div className={styles.sectionHeading}>
          <div>
            <span className="eyebrow">Invite history</span>
            <h2>Recent beta invitations</h2>
          </div>
          <span className={styles.countLabel}>{invites.length} records</span>
        </div>

        {error ? (
          <div className={styles.empty}>Unable to load invites: {error.message}</div>
        ) : invites.length === 0 ? (
          <div className={styles.empty}>No beta invites have been created yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={`${styles.inviteRow} ${styles.tableHead}`}>
              <span>Email</span>
              <span>Status</span>
              <span>Uses</span>
              <span>Expires</span>
              <span>Created</span>
              <span>Action</span>
            </div>

            {invites.map((invite) => {
              const status = statusFor(invite);
              const canExpire = status === "Active";

              return (
                <div className={styles.inviteRow} key={invite.id}>
                  <div className={styles.emailCell}>
                    <strong>{invite.email || "Any email"}</strong>
                    <small>{invite.id.slice(0, 8)}</small>
                  </div>
                  <span
                    className={`${styles.status} ${
                      styles[`status${status}` as keyof typeof styles]
                    }`}
                  >
                    {status}
                  </span>
                  <span>
                    {invite.uses}/{invite.max_uses}
                  </span>
                  <span>{formatDate(invite.expires_at)}</span>
                  <span>{formatDate(invite.created_at)}</span>
                  <div>
                    {canExpire ? (
                      <form action={expireInvite}>
                        <input name="inviteId" type="hidden" value={invite.id} />
                        <button className="button secondary small" type="submit">
                          Expire
                        </button>
                      </form>
                    ) : (
                      <span className={styles.noAction}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
