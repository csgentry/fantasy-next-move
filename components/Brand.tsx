import Link from "next/link";

// Text fallback until the authentic approved logo artwork is supplied.
// Do not substitute an approximate or traced monogram for the original.
export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="brand fnm-brand" aria-label="FantasyNextMove home">
      <span className="fnm-wordmark">
        FANTASY<span>NEXT</span>MOVE
        <small>YOUR FANTASY TEAM. YOUR NEXT MOVE.</small>
      </span>
    </Link>
  );
}
