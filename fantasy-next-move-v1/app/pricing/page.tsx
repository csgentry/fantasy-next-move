import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const plans = [
  { name: "Free", price: "$0", note: "Try the core experience", features: ["1 connected league", "Current-season dashboard", "Basic record book", "5 Trade Lab checks monthly"], button: "Start free" },
  { name: "Pro", price: "$7.99", note: "For serious fantasy managers", features: ["Unlimited connected leagues", "Full multi-season history", "Unlimited Trade Lab", "Weekly Next Moves", "Advanced manager tendencies"], button: "Choose Pro", featured: true },
  { name: "Commissioner", price: "$12.99", note: "For league builders", features: ["Everything in Pro", "Shareable league record book", "Commissioner announcements", "Custom rivalry and award tracking", "League export tools"], button: "Choose Commissioner" }
];

export default function PricingPage() {
  return (
    <AppShell>
      <div className="page-heading centered"><div><span className="eyebrow">Simple monthly pricing</span><h1>Pay for better decisions.</h1><p>Pricing is an MVP recommendation and can be changed before Stripe is activated.</p></div></div>
      <div className="pricing-grid">
        {plans.map((plan) => <article className={`price-card ${plan.featured ? "featured" : ""}`} key={plan.name}>{plan.featured && <span className="popular">Most popular</span>}<h2>{plan.name}</h2><strong>{plan.price}<small>/month</small></strong><p>{plan.note}</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className={`button ${plan.featured ? "" : "secondary"}`} href="/connect">{plan.button}</Link></article>)}
      </div>
    </AppShell>
  );
}
