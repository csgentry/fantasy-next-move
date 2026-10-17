import Link from "next/link";
import Image from "next/image";

// Text fallback until the authentic approved logo artwork is supplied.
// Do not substitute an approximate or traced monogram for the original.
export function Brand({ href = "/dashboard", artwork = false }: { href?: string; artwork?: boolean }) {
  return (
    <Link href={href} className="brand fnm-brand" aria-label="FantasyNextMove home">
      {artwork ? <Image className="approved-brand-art" src="/brand/approved-header.svg" width={4210} height={1324} alt="FantasyNextMove. Your fantasy team. Your next move." priority unoptimized/> : <span className="fnm-wordmark">
        FANTASY<span>NEXT</span>MOVE
        <small>YOUR FANTASY TEAM. YOUR NEXT MOVE.</small>
      </span>}
    </Link>
  );
}
