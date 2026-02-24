# BRisk

Brazilian version of Risk game (classic WAR ruleset first).

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
