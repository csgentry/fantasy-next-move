# Power Rankings Engine methodology

FantasyNextMove 1.3B separates league-wide analysis from private, personalized advice.

## League-wide data shown for every team

- Overall power rank and score
- Contender rank
- Dynasty rank for keeper and dynasty leagues
- Starter strength
- Bench depth
- QB, RB, WR, and TE grades
- All-play record
- Expected wins
- Schedule luck
- Movement since the previous completed week
- Plain-language explanations for the ranking

## Model structure

### Contender score

- 50% optimized starter strength
- 14% bench depth
- 26% season performance
- 10% positional balance

Season performance combines league-relative points, all-play percentage, and actual results. Before weekly matchup data exists, the model shifts toward roster construction and season totals.

### Dynasty score

- 58% age-adjusted starter strength
- 22% age-adjusted bench depth
- 20% owned draft capital

Draft capital accounts for round, projected early/mid/late range, exact slot when available, league size, and distance from the current season.

### Overall score

- Redraft: contender score
- Keeper: 78% contender and 22% dynasty
- Dynasty: 62% contender and 38% dynasty

Scores are indexed against the best roster in the selected league, so the league leader displays 100.

## All-play and luck

Each completed weekly score is compared with every other team in the league. Expected wins convert that all-play percentage into the number of games on the team's official record. Luck is actual result wins minus expected wins.

Positive luck means the team has more wins than its schedule-neutral scoring profile would predict. Negative luck means the team has fewer wins than expected.

## Ranking movement

Movement compares the current ranking with the model calculated through the previous completed week. Current roster quality is held constant because Sleeper does not provide a complete historical roster snapshot for every prior week through the standard league endpoints.

## Data confidence

The dashboard reports High, Medium, or Limited confidence based on player-profile coverage and the number of completed matchup weeks available. The app does not claim expert-consensus projection precision until a licensed or independently built projection source is integrated.
