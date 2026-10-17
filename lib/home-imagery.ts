import type { ImportedLeague } from './types';
import {sleeperAvatarUrl} from './sleeper-avatar';

// A selected team can differ from the connected customer. Never use its team
// branding as a profile image, or its owner's avatar as the customer's profile.
export function customerSleeperAvatar(league:ImportedLeague):string|null {
 if(league.provider!=='sleeper'||league.userRosterId==null)return null;
 const customer=league.teams.find(t=>t.rosterId===league.userRosterId);
 return sleeperAvatarUrl(customer?.ownerAvatarUrl);
}
