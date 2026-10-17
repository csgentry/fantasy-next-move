import {Brand} from "./Brand";
import Link from "next/link";
export function MarketingHeader(){return <header className="landing-nav"><Brand/><nav className="nav-actions" aria-label="Website navigation"><Link href="/#product">Product</Link><Link href="/#trade-lab">Trade Lab</Link><Link href="/pricing">Pricing</Link><Link href="/#how-it-works">How It Works</Link><Link href="/login">Sign In</Link><Link className="button small" href="/connect">Connect Your League</Link></nav></header>}
