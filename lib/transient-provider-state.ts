// Browser-memory flag only. Never stores provider payloads.
let suppressed = false;
export function setFantasyAnalyticsSuppressed(value: boolean) { suppressed = value; }
export function fantasyAnalyticsSuppressed() { return suppressed; }
