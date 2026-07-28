import type { ImportedLeague } from "./types";

export const demoLeague: ImportedLeague = {
  provider: "demo",
  leagueId: "sample-league-2026",
  name: "Sunday League Sample",
  season: "2026",
  status: "pre_draft",
  totalRosters: 10,
  scoringSettings: { rec: 0.5, pass_td: 4, rush_td: 6, rec_td: 6 },
  rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "IR"],
  previousLeagueId: "sample-league-2025",
  userRosterId: 1,
  teams: [
    { rosterId: 1, ownerId: "sample-1", ownerName: "Alex Carter", teamName: "Fourth & Goal", wins: 10, losses: 4, ties: 0, pointsFor: 1587.4, pointsAgainst: 1430.1, players: ["Josh Allen", "Bijan Robinson", "Breece Hall", "Amon-Ra St. Brown", "Puka Nacua", "Trey McBride", "De'Von Achane"], starters: ["Josh Allen", "Bijan Robinson", "Breece Hall", "Amon-Ra St. Brown", "Puka Nacua", "Trey McBride"] },
    { rosterId: 2, ownerId: "sample-2", ownerName: "Jordan Lee", teamName: "Gridiron Atlas", wins: 9, losses: 5, ties: 0, pointsFor: 1512.8, pointsAgainst: 1468.9, players: ["Jalen Hurts", "Jahmyr Gibbs", "Jonathan Taylor", "CeeDee Lamb", "Drake London", "Sam LaPorta"], starters: ["Jalen Hurts", "Jahmyr Gibbs", "Jonathan Taylor", "CeeDee Lamb", "Drake London", "Sam LaPorta"] },
    { rosterId: 3, ownerId: "sample-3", ownerName: "Taylor Brooks", teamName: "Red Zone Rally", wins: 8, losses: 6, ties: 0, pointsFor: 1489.6, pointsAgainst: 1450.7, players: ["Lamar Jackson", "Saquon Barkley", "Kyren Williams", "Justin Jefferson", "Nico Collins", "George Kittle"], starters: ["Lamar Jackson", "Saquon Barkley", "Kyren Williams", "Justin Jefferson", "Nico Collins", "George Kittle"] },
    { rosterId: 4, ownerId: "sample-4", ownerName: "Morgan Reed", teamName: "Two-Minute Drill", wins: 7, losses: 7, ties: 0, pointsFor: 1458.3, pointsAgainst: 1461.2, players: ["Joe Burrow", "Christian McCaffrey", "James Cook", "Ja'Marr Chase", "Tee Higgins", "Brock Bowers"], starters: ["Joe Burrow", "Christian McCaffrey", "James Cook", "Ja'Marr Chase", "Tee Higgins", "Brock Bowers"] },
    { rosterId: 5, ownerId: "sample-5", ownerName: "Casey Parker", teamName: "Goal Line Stand", wins: 7, losses: 7, ties: 0, pointsFor: 1436.1, pointsAgainst: 1448.5, players: ["Jayden Daniels", "Derrick Henry", "Kenneth Walker", "Malik Nabers", "Mike Evans", "Mark Andrews"], starters: ["Jayden Daniels", "Derrick Henry", "Kenneth Walker", "Malik Nabers", "Mike Evans", "Mark Andrews"] },
    { rosterId: 6, ownerId: "sample-6", ownerName: "Riley Bennett", teamName: "Sunday Surge", wins: 6, losses: 8, ties: 0, pointsFor: 1399.4, pointsAgainst: 1480.2, players: ["Patrick Mahomes", "Josh Jacobs", "David Montgomery", "A.J. Brown", "DK Metcalf", "T.J. Hockenson"], starters: ["Patrick Mahomes", "Josh Jacobs", "David Montgomery", "A.J. Brown", "DK Metcalf", "T.J. Hockenson"] },
    { rosterId: 7, ownerId: "sample-7", ownerName: "Drew Collins", teamName: "End Zone Echo", wins: 6, losses: 8, ties: 0, pointsFor: 1375.7, pointsAgainst: 1501.4, players: ["C.J. Stroud", "Alvin Kamara", "Rachaad White", "Garrett Wilson", "Marvin Harrison Jr.", "Dalton Kincaid"], starters: ["C.J. Stroud", "Alvin Kamara", "Rachaad White", "Garrett Wilson", "Marvin Harrison Jr.", "Dalton Kincaid"] },
    { rosterId: 8, ownerId: "sample-8", ownerName: "Sam Rivera", teamName: "Waiver Wire", wins: 5, losses: 9, ties: 0, pointsFor: 1328.2, pointsAgainst: 1510.6, players: ["Brock Purdy", "Tony Pollard", "D'Andre Swift", "Tyreek Hill", "Deebo Samuel", "Kyle Pitts"], starters: ["Brock Purdy", "Tony Pollard", "D'Andre Swift", "Tyreek Hill", "Deebo Samuel", "Kyle Pitts"] },
    { rosterId: 9, ownerId: "sample-9", ownerName: "Jamie Foster", teamName: "Hail Mary Club", wins: 4, losses: 10, ties: 0, pointsFor: 1288.9, pointsAgainst: 1522.3, players: ["Dak Prescott", "Aaron Jones", "Najee Harris", "Davante Adams", "Chris Olave", "Evan Engram"], starters: ["Dak Prescott", "Aaron Jones", "Najee Harris", "Davante Adams", "Chris Olave", "Evan Engram"] },
    { rosterId: 10, ownerId: "sample-10", ownerName: "Avery Grant", teamName: "Clock Managers", wins: 4, losses: 10, ties: 0, pointsFor: 1256.5, pointsAgainst: 1518.2, players: ["Jordan Love", "Isiah Pacheco", "Brian Robinson", "Zay Flowers", "Xavier Worthy", "David Njoku"], starters: ["Jordan Love", "Isiah Pacheco", "Brian Robinson", "Zay Flowers", "Xavier Worthy", "David Njoku"] }
  ]
};

export const tradePlayers = [
  { name: "Josh Allen", position: "QB", value: 48 },
  { name: "Jalen Hurts", position: "QB", value: 44 },
  { name: "Lamar Jackson", position: "QB", value: 43 },
  { name: "Bijan Robinson", position: "RB", value: 59 },
  { name: "Jahmyr Gibbs", position: "RB", value: 57 },
  { name: "Breece Hall", position: "RB", value: 46 },
  { name: "Saquon Barkley", position: "RB", value: 45 },
  { name: "Amon-Ra St. Brown", position: "WR", value: 55 },
  { name: "CeeDee Lamb", position: "WR", value: 54 },
  { name: "Justin Jefferson", position: "WR", value: 54 },
  { name: "Puka Nacua", position: "WR", value: 49 },
  { name: "Malik Nabers", position: "WR", value: 47 },
  { name: "Trey McBride", position: "TE", value: 42 },
  { name: "Brock Bowers", position: "TE", value: 41 },
  { name: "Sam LaPorta", position: "TE", value: 35 }
];

export const historicalSeasons = [
  { season: 2025, champion: "Alex Carter", team: "Fourth & Goal", runnerUp: "Jordan Lee", points: 164.7 },
  { season: 2024, champion: "Morgan Reed", team: "Two-Minute Drill", runnerUp: "Riley Bennett", points: 151.2 },
  { season: 2023, champion: "Casey Parker", team: "Goal Line Stand", runnerUp: "Taylor Brooks", points: 168.6 },
  { season: 2022, champion: "Riley Bennett", team: "Sunday Surge", runnerUp: "Sam Rivera", points: 147.9 }
];

export const demoPlayerPositions: Record<string, string> = {
  "Josh Allen": "QB", "Bijan Robinson": "RB", "Breece Hall": "RB", "Amon-Ra St. Brown": "WR", "Puka Nacua": "WR", "Trey McBride": "TE", "De'Von Achane": "RB",
  "Jalen Hurts": "QB", "Jahmyr Gibbs": "RB", "Jonathan Taylor": "RB", "CeeDee Lamb": "WR", "Drake London": "WR", "Sam LaPorta": "TE",
  "Lamar Jackson": "QB", "Saquon Barkley": "RB", "Kyren Williams": "RB", "Justin Jefferson": "WR", "Nico Collins": "WR", "George Kittle": "TE",
  "Joe Burrow": "QB", "Christian McCaffrey": "RB", "James Cook": "RB", "Ja'Marr Chase": "WR", "Tee Higgins": "WR", "Brock Bowers": "TE",
  "Jayden Daniels": "QB", "Derrick Henry": "RB", "Kenneth Walker": "RB", "Malik Nabers": "WR", "Mike Evans": "WR", "Mark Andrews": "TE",
  "Patrick Mahomes": "QB", "Josh Jacobs": "RB", "David Montgomery": "RB", "A.J. Brown": "WR", "DK Metcalf": "WR", "T.J. Hockenson": "TE",
  "C.J. Stroud": "QB", "Alvin Kamara": "RB", "Rachaad White": "RB", "Garrett Wilson": "WR", "Marvin Harrison Jr.": "WR", "Dalton Kincaid": "TE",
  "Brock Purdy": "QB", "Tony Pollard": "RB", "D'Andre Swift": "RB", "Tyreek Hill": "WR", "Deebo Samuel": "WR", "Kyle Pitts": "TE",
  "Dak Prescott": "QB", "Aaron Jones": "RB", "Najee Harris": "RB", "Davante Adams": "WR", "Chris Olave": "WR", "Evan Engram": "TE",
  "Jordan Love": "QB", "Isiah Pacheco": "RB", "Brian Robinson": "RB", "Zay Flowers": "WR", "Xavier Worthy": "WR", "David Njoku": "TE"
};
