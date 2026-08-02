import { AppShell } from "@/components/AppShell";
import { ActivationStatus } from "@/components/billing/ActivationStatus";

export default function BillingSuccessPage() {
  return (
    <AppShell>
      <section className="panel billing-success-panel">
        <span className="eyebrow">Secure checkout complete</span>
        <h1>Welcome to FantasyNextMove.</h1>
        <p>Access is granted only after the verified Stripe webhook confirms the subscription.</p>
        <ActivationStatus />
      </section>
    </AppShell>
  );
}
