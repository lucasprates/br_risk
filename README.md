# BRisk

Brazilian version of Risk game (classic WAR ruleset first).

## Run the game

```bash
npm install
npm start
```

Open: `http://localhost:3000`

Note: one browser tab equals one player. To add more players locally, open additional tabs/windows.

## Current gameplay (v0)

- Multiplayer room lobby (`3-6` players)
- Host starts match
- 42-territory board with visible 2D territories + curved adjacency connections
- Turn phases:
  - `REINFORCE` (click your territory to place armies)
  - `ATTACK` (select origin + enemy neighbor, then click `Attack`)
  - `FORTIFY` (select origin + friendly neighbor, then click `Fortify`)
  - `END_TURN`
- Server-authoritative combat (`3` max dice for attack/defense, defense wins ties)
- Reinforcement formula + continent bonuses
- Objective assignment and win detection

## Ruleset data

- `packages/rulesets/war-classic-02000/constants.json`
- `packages/rulesets/war-classic-02000/map.json`
- `packages/rulesets/war-classic-02000/objectives.json`

## Validation

Run:

```bash
npm run validate:ruleset
```

The validator checks structure and cross-file integrity, including:

- required fields and enum values
- 6 continents and 42 territories
- bidirectional adjacency graph
- continent territory ownership consistency
- objective predicate validity and fallback references
- territory card count alignment with map size
