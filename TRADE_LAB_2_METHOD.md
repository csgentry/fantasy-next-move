# Trade Lab 2.0 methodology

Trade Lab 2.0 is not a simple sum of two player lists.

## Market anchor

When available, FantasyNextMove requests a permitted Tradyr composite market signal. Tradyr permits commercial API use with attribution. The app shows that attribution in Trade Lab. The external composite is blended with FantasyNextMove's independent player model rather than displayed unchanged.

When the market endpoint is unavailable, the calculator falls back to its independent model so a temporary third-party outage does not break Trade Lab.

## League adjustments

Every player is recalculated for the selected connected league using:

- Redraft, Keeper, or Dynasty format
- One-quarterback or Superflex lineup structure
- League size
- Reception and tight-end-premium scoring
- Starting lineup requirements
- Current league-scored projections
- Player status, age, experience, and roster role
- Draft-pick ownership and known pick slots

## Trade structure

The final trade verdict also applies:

- Elite-asset consolidation premium
- Quantity discount for large packages
- Position and roster-fit changes
- Replacement-level consequences
- Fair-market tolerance based on trade size

## Value presentation

- Player and pick values: 1–9,995
- Fantasy points: two decimal places
- Power indexes: one decimal place
- Value range: wider when data confidence is lower
- Rankings: global market rank when supplied, otherwise a calculated fallback rank

## Limitations

No calculator can establish an objectively correct trade. Values change with news, market behavior, manager preference, league settings, and roster goals. FantasyNextMove should explain the reason for a result instead of presenting the number as guaranteed truth.
