import type {PlayerProfile} from "@/lib/types";

// Original typographic fallback, without unlicensed photos or NFL marks.
export function PlayerAvatar({profile,large=false}:{profile:PlayerProfile;large?:boolean}) {
  const initials=profile.fullName.trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('');
  const position=['QB','RB','WR','TE','K','DEF'].includes(profile.position)?profile.position:'OTHER';
  return <span className={`player-portrait ${large?'player-portrait-large':''}`} data-position={position} aria-hidden="true"><span>{initials||'?'}</span><small>{profile.position}</small></span>;
}
