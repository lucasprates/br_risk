import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULESET_DIR = path.resolve(__dirname, '../packages/rulesets/war-classic-02000');

const EXPECTED_RULESET_ID = 'war-classic-02000';
const EXPECTED_PHASES = ['REINFORCE', 'ATTACK', 'FORTIFY', 'END_TURN'];
const CARD_SYMBOLS = new Set(['CIRCULO', 'TRIANGULO', 'QUADRADO']);
const PLAYER_COLORS = new Set(['BLUE', 'YELLOW', 'RED', 'BLACK', 'WHITE', 'GREEN']);
const PREDICATE_KINDS = new Set([
  'CONTROL_CONTINENTS',
  'CONTROL_CONTINENTS_PLUS_ANY',
  'CONTROL_TERRITORIES',
  'ELIMINATE_COLOR'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

class Validator {
  constructor() {
    this.errors = [];
  }

  add(pathLabel, message) {
    this.errors.push(`${pathLabel}: ${message}`);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

async function readJson(filename) {
  const fullPath = path.join(RULESET_DIR, filename);
  const raw = await fs.readFile(fullPath, 'utf8');
  return JSON.parse(raw);
}

function ensureString(v, validator, pathLabel) {
  if (typeof v !== 'string' || v.trim() === '') {
    validator.add(pathLabel, 'must be a non-empty string');
    return false;
  }
  return true;
}

function ensurePositiveInteger(v, validator, pathLabel) {
  if (!Number.isInteger(v) || v <= 0) {
    validator.add(pathLabel, 'must be a positive integer');
    return false;
  }
  return true;
}

function validateConstants(constants, mapData, validator) {
  if (!isObject(constants)) {
    validator.add('constants', 'must be an object');
    return;
  }

  if (constants.rulesetId !== EXPECTED_RULESET_ID) {
    validator.add('constants.rulesetId', `must equal ${EXPECTED_RULESET_ID}`);
  }

  if (!isObject(constants.players)) {
    validator.add('constants.players', 'must be an object');
  } else {
    const { min, max, startingArmiesByPlayerCount } = constants.players;
    if (min !== 3) validator.add('constants.players.min', 'must be 3 for classic WAR');
    if (max !== 6) validator.add('constants.players.max', 'must be 6 for classic WAR');

    if (!isObject(startingArmiesByPlayerCount)) {
      validator.add('constants.players.startingArmiesByPlayerCount', 'must be an object');
    } else {
      for (const key of ['3', '4', '5', '6']) {
        ensurePositiveInteger(
          startingArmiesByPlayerCount[key],
          validator,
          `constants.players.startingArmiesByPlayerCount.${key}`
        );
      }
    }
  }

  if (!isObject(constants.turn)) {
    validator.add('constants.turn', 'must be an object');
  } else {
    if (!Array.isArray(constants.turn.phases)) {
      validator.add('constants.turn.phases', 'must be an array');
    } else if (JSON.stringify(constants.turn.phases) !== JSON.stringify(EXPECTED_PHASES)) {
      validator.add('constants.turn.phases', `must be exactly ${EXPECTED_PHASES.join(' -> ')}`);
    }

    if (typeof constants.turn.drawTerritoryCardIfConqueredAtLeastOne !== 'boolean') {
      validator.add('constants.turn.drawTerritoryCardIfConqueredAtLeastOne', 'must be boolean');
    }
  }

  if (!isObject(constants.reinforcement)) {
    validator.add('constants.reinforcement', 'must be an object');
  } else {
    ensureString(constants.reinforcement.baseFormula, validator, 'constants.reinforcement.baseFormula');

    if (!isObject(constants.reinforcement.continentBonus)) {
      validator.add('constants.reinforcement.continentBonus', 'must be an object');
    } else if (mapData && Array.isArray(mapData.continents)) {
      const expected = new Set(mapData.continents.map((c) => c.id));
      const actual = new Set(Object.keys(constants.reinforcement.continentBonus));

      for (const id of expected) {
        if (!actual.has(id)) {
          validator.add('constants.reinforcement.continentBonus', `missing continent bonus for ${id}`);
        }
      }
      for (const id of actual) {
        if (!expected.has(id)) {
          validator.add('constants.reinforcement.continentBonus', `unknown continent bonus key ${id}`);
        }
      }

      for (const [id, value] of Object.entries(constants.reinforcement.continentBonus)) {
        ensurePositiveInteger(value, validator, `constants.reinforcement.continentBonus.${id}`);
      }
    }
  }

  if (!isObject(constants.combat)) {
    validator.add('constants.combat', 'must be an object');
  } else {
    if (constants.combat.attackDiceMax !== 3) {
      validator.add('constants.combat.attackDiceMax', 'must be 3');
    }
    if (constants.combat.defenseDiceMax !== 3) {
      validator.add('constants.combat.defenseDiceMax', 'must be 3');
    }
    if (constants.combat.defenseWinsTies !== true) {
      validator.add('constants.combat.defenseWinsTies', 'must be true');
    }
  }

  if (!isObject(constants.territoryCards)) {
    validator.add('constants.territoryCards', 'must be an object');
  } else {
    const cards = constants.territoryCards;
    ensurePositiveInteger(cards.total, validator, 'constants.territoryCards.total');
    ensurePositiveInteger(cards.territoryCards, validator, 'constants.territoryCards.territoryCards');

    if (!Number.isInteger(cards.jokers) || cards.jokers < 0) {
      validator.add('constants.territoryCards.jokers', 'must be an integer >= 0');
    }

    if (cards.total !== cards.territoryCards + cards.jokers) {
      validator.add('constants.territoryCards.total', 'must equal territoryCards + jokers');
    }

    if (!Array.isArray(cards.symbols) || cards.symbols.length !== 3) {
      validator.add('constants.territoryCards.symbols', 'must be an array with 3 symbols');
    } else {
      for (const symbol of cards.symbols) {
        if (!CARD_SYMBOLS.has(symbol)) {
          validator.add('constants.territoryCards.symbols', `unknown symbol ${symbol}`);
        }
      }
    }

    if (!Array.isArray(cards.validTradeSets) || cards.validTradeSets.length < 1) {
      validator.add('constants.territoryCards.validTradeSets', 'must be a non-empty array');
    }

    if (!isObject(cards.tradeValue)) {
      validator.add('constants.territoryCards.tradeValue', 'must be an object');
    } else {
      if (!Array.isArray(cards.tradeValue.values) || cards.tradeValue.values.length < 1) {
        validator.add('constants.territoryCards.tradeValue.values', 'must be a non-empty array');
      } else {
        for (let i = 0; i < cards.tradeValue.values.length; i += 1) {
          const value = cards.tradeValue.values[i];
          ensurePositiveInteger(value, validator, `constants.territoryCards.tradeValue.values[${i}]`);
          if (i > 0 && value <= cards.tradeValue.values[i - 1]) {
            validator.add('constants.territoryCards.tradeValue.values', 'must be strictly ascending');
          }
        }
      }

      if (!isObject(cards.tradeValue.afterEnd)) {
        validator.add('constants.territoryCards.tradeValue.afterEnd', 'must be an object');
      } else {
        if (cards.tradeValue.afterEnd.mode !== 'INCREMENT') {
          validator.add('constants.territoryCards.tradeValue.afterEnd.mode', 'must be INCREMENT');
        }
        ensurePositiveInteger(
          cards.tradeValue.afterEnd.step,
          validator,
          'constants.territoryCards.tradeValue.afterEnd.step'
        );
      }
    }
  }
}

function validateMap(mapData, validator) {
  if (!isObject(mapData)) {
    validator.add('map', 'must be an object');
    return { continentIds: new Set(), territoryIds: new Set(), territoriesById: new Map() };
  }

  if (mapData.rulesetId !== EXPECTED_RULESET_ID) {
    validator.add('map.rulesetId', `must equal ${EXPECTED_RULESET_ID}`);
  }

  if (!Array.isArray(mapData.continents)) {
    validator.add('map.continents', 'must be an array');
    return { continentIds: new Set(), territoryIds: new Set(), territoriesById: new Map() };
  }

  if (!Array.isArray(mapData.territories)) {
    validator.add('map.territories', 'must be an array');
    return { continentIds: new Set(), territoryIds: new Set(), territoriesById: new Map() };
  }

  if (mapData.continents.length !== 6) {
    validator.add('map.continents', 'must contain 6 continents');
  }

  if (mapData.territories.length !== 42) {
    validator.add('map.territories', 'must contain 42 territories');
  }

  const continentIds = new Set();
  const continentTerritoryDeclared = new Map();
  for (let i = 0; i < mapData.continents.length; i += 1) {
    const continent = mapData.continents[i];
    const pathLabel = `map.continents[${i}]`;
    if (!isObject(continent)) {
      validator.add(pathLabel, 'must be an object');
      continue;
    }

    if (!ensureString(continent.id, validator, `${pathLabel}.id`)) continue;
    if (continentIds.has(continent.id)) {
      validator.add(`${pathLabel}.id`, `duplicate continent id ${continent.id}`);
      continue;
    }
    continentIds.add(continent.id);

    ensureString(continent.namePt, validator, `${pathLabel}.namePt`);
    ensureString(continent.nameEn, validator, `${pathLabel}.nameEn`);
    ensurePositiveInteger(continent.bonus, validator, `${pathLabel}.bonus`);

    if (!Array.isArray(continent.territoryIds) || continent.territoryIds.length < 1) {
      validator.add(`${pathLabel}.territoryIds`, 'must be a non-empty array');
      continue;
    }

    const idsSet = new Set();
    for (let j = 0; j < continent.territoryIds.length; j += 1) {
      const id = continent.territoryIds[j];
      if (!ensureString(id, validator, `${pathLabel}.territoryIds[${j}]`)) continue;
      if (idsSet.has(id)) {
        validator.add(`${pathLabel}.territoryIds`, `duplicate territory id ${id}`);
      }
      idsSet.add(id);
    }
    continentTerritoryDeclared.set(continent.id, idsSet);
  }

  const territoryIds = new Set();
  const territoriesById = new Map();
  const territoryIdsByContinent = new Map();

  for (let i = 0; i < mapData.territories.length; i += 1) {
    const territory = mapData.territories[i];
    const pathLabel = `map.territories[${i}]`;
    if (!isObject(territory)) {
      validator.add(pathLabel, 'must be an object');
      continue;
    }

    if (!ensureString(territory.id, validator, `${pathLabel}.id`)) continue;
    if (territoryIds.has(territory.id)) {
      validator.add(`${pathLabel}.id`, `duplicate territory id ${territory.id}`);
      continue;
    }

    territoryIds.add(territory.id);
    territoriesById.set(territory.id, territory);

    ensureString(territory.namePt, validator, `${pathLabel}.namePt`);
    ensureString(territory.nameEn, validator, `${pathLabel}.nameEn`);

    if (!ensureString(territory.continentId, validator, `${pathLabel}.continentId`)) continue;
    if (!continentIds.has(territory.continentId)) {
      validator.add(`${pathLabel}.continentId`, `unknown continent id ${territory.continentId}`);
    } else {
      if (!territoryIdsByContinent.has(territory.continentId)) {
        territoryIdsByContinent.set(territory.continentId, new Set());
      }
      territoryIdsByContinent.get(territory.continentId).add(territory.id);
    }

    if (!CARD_SYMBOLS.has(territory.cardSymbol)) {
      validator.add(`${pathLabel}.cardSymbol`, `must be one of ${Array.from(CARD_SYMBOLS).join(', ')}`);
    }

    if (!Array.isArray(territory.neighbors) || territory.neighbors.length < 1) {
      validator.add(`${pathLabel}.neighbors`, 'must be a non-empty array');
      continue;
    }

    const neighborSet = new Set();
    for (let j = 0; j < territory.neighbors.length; j += 1) {
      const neighbor = territory.neighbors[j];
      if (!ensureString(neighbor, validator, `${pathLabel}.neighbors[${j}]`)) continue;
      if (neighbor === territory.id) {
        validator.add(`${pathLabel}.neighbors[${j}]`, 'territory cannot neighbor itself');
      }
      if (neighborSet.has(neighbor)) {
        validator.add(`${pathLabel}.neighbors`, `duplicate neighbor ${neighbor}`);
      }
      neighborSet.add(neighbor);
    }
  }

  for (const [territoryId, territory] of territoriesById.entries()) {
    for (const neighborId of territory.neighbors) {
      const neighbor = territoriesById.get(neighborId);
      if (!neighbor) {
        validator.add(`map.territories.${territoryId}.neighbors`, `unknown neighbor ${neighborId}`);
        continue;
      }
      if (!neighbor.neighbors.includes(territoryId)) {
        validator.add(
          `map.territories.${territoryId}.neighbors`,
          `adjacency must be symmetric: ${territoryId} -> ${neighborId} without reverse edge`
        );
      }
    }
  }

  for (const continentId of continentIds) {
    const declared = continentTerritoryDeclared.get(continentId) ?? new Set();
    const actual = territoryIdsByContinent.get(continentId) ?? new Set();

    for (const territoryId of declared) {
      if (!territoryIds.has(territoryId)) {
        validator.add(`map.continents.${continentId}.territoryIds`, `unknown territory id ${territoryId}`);
      }
      if (!actual.has(territoryId)) {
        validator.add(
          `map.continents.${continentId}.territoryIds`,
          `declares ${territoryId} but territory has different continentId`
        );
      }
    }

    for (const territoryId of actual) {
      if (!declared.has(territoryId)) {
        validator.add(
          `map.continents.${continentId}.territoryIds`,
          `missing declared territory ${territoryId}`
        );
      }
    }
  }

  return { continentIds, territoryIds, territoriesById };
}

function validateObjectives(objectivesData, mapSummary, validator) {
  if (!isObject(objectivesData)) {
    validator.add('objectives', 'must be an object');
    return;
  }

  if (objectivesData.rulesetId !== EXPECTED_RULESET_ID) {
    validator.add('objectives.rulesetId', `must equal ${EXPECTED_RULESET_ID}`);
  }

  if (!Array.isArray(objectivesData.objectives)) {
    validator.add('objectives.objectives', 'must be an array');
    return;
  }

  if (objectivesData.objectives.length !== 14) {
    validator.add('objectives.objectives', 'must contain 14 objective cards');
  }

  const objectiveIds = new Set();
  const eliminationColors = new Set();

  for (let i = 0; i < objectivesData.objectives.length; i += 1) {
    const objective = objectivesData.objectives[i];
    const pathLabel = `objectives.objectives[${i}]`;

    if (!isObject(objective)) {
      validator.add(pathLabel, 'must be an object');
      continue;
    }

    if (!ensureString(objective.id, validator, `${pathLabel}.id`)) continue;
    if (objectiveIds.has(objective.id)) {
      validator.add(`${pathLabel}.id`, `duplicate objective id ${objective.id}`);
      continue;
    }
    objectiveIds.add(objective.id);

    ensureString(objective.textPt, validator, `${pathLabel}.textPt`);
    ensureString(objective.textEn, validator, `${pathLabel}.textEn`);

    if (!isObject(objective.predicate)) {
      validator.add(`${pathLabel}.predicate`, 'must be an object');
      continue;
    }

    const { kind } = objective.predicate;
    if (!PREDICATE_KINDS.has(kind)) {
      validator.add(`${pathLabel}.predicate.kind`, `unknown predicate kind ${kind}`);
      continue;
    }

    if (kind === 'CONTROL_CONTINENTS') {
      if (!Array.isArray(objective.predicate.continentIds) || objective.predicate.continentIds.length < 1) {
        validator.add(`${pathLabel}.predicate.continentIds`, 'must be a non-empty array');
      } else {
        for (const id of objective.predicate.continentIds) {
          if (!mapSummary.continentIds.has(id)) {
            validator.add(`${pathLabel}.predicate.continentIds`, `unknown continent id ${id}`);
          }
        }
      }
    }

    if (kind === 'CONTROL_CONTINENTS_PLUS_ANY') {
      if (!Array.isArray(objective.predicate.required) || objective.predicate.required.length < 1) {
        validator.add(`${pathLabel}.predicate.required`, 'must be a non-empty array');
      } else {
        for (const id of objective.predicate.required) {
          if (!mapSummary.continentIds.has(id)) {
            validator.add(`${pathLabel}.predicate.required`, `unknown continent id ${id}`);
          }
        }
      }

      ensurePositiveInteger(
        objective.predicate.additionalCount,
        validator,
        `${pathLabel}.predicate.additionalCount`
      );
    }

    if (kind === 'CONTROL_TERRITORIES') {
      ensurePositiveInteger(objective.predicate.count, validator, `${pathLabel}.predicate.count`);
      ensurePositiveInteger(
        objective.predicate.minArmiesEach,
        validator,
        `${pathLabel}.predicate.minArmiesEach`
      );
    }

    if (kind === 'ELIMINATE_COLOR') {
      if (!PLAYER_COLORS.has(objective.predicate.color)) {
        validator.add(`${pathLabel}.predicate.color`, 'must be a valid player color');
      } else {
        eliminationColors.add(objective.predicate.color);
      }

      ensureString(
        objective.predicate.fallbackObjectiveId,
        validator,
        `${pathLabel}.predicate.fallbackObjectiveId`
      );

      const handling = objective.predicate.selfTargetHandling;
      if (handling !== 'REDRAW_OBJECTIVE') {
        validator.add(`${pathLabel}.predicate.selfTargetHandling`, 'must be REDRAW_OBJECTIVE');
      }
    }
  }

  for (let i = 0; i < objectivesData.objectives.length; i += 1) {
    const objective = objectivesData.objectives[i];
    if (!isObject(objective) || !isObject(objective.predicate)) continue;
    if (objective.predicate.kind !== 'ELIMINATE_COLOR') continue;

    if (!objectiveIds.has(objective.predicate.fallbackObjectiveId)) {
      validator.add(
        `objectives.objectives[${i}].predicate.fallbackObjectiveId`,
        `unknown objective id ${objective.predicate.fallbackObjectiveId}`
      );
    }
  }

  for (const color of PLAYER_COLORS) {
    if (!eliminationColors.has(color)) {
      validator.add('objectives.eliminationSet', `missing eliminate-color objective for ${color}`);
    }
  }
}

function runCrossChecks(constants, mapSummary, validator) {
  if (
    isObject(constants) &&
    isObject(constants.territoryCards) &&
    Number.isInteger(constants.territoryCards.territoryCards) &&
    mapSummary.territoryIds.size > 0 &&
    constants.territoryCards.territoryCards !== mapSummary.territoryIds.size
  ) {
    validator.add(
      'cross.territoryCount',
      `constants territoryCards count (${constants.territoryCards.territoryCards}) must equal map territory count (${mapSummary.territoryIds.size})`
    );
  }
}

async function main() {
  const validator = new Validator();

  const [constants, mapData, objectives] = await Promise.all([
    readJson('constants.json'),
    readJson('map.json'),
    readJson('objectives.json')
  ]);

  const mapSummary = validateMap(mapData, validator);
  validateConstants(constants, mapData, validator);
  validateObjectives(objectives, mapSummary, validator);
  runCrossChecks(constants, mapSummary, validator);

  if (validator.hasErrors()) {
    console.error('Ruleset validation failed.');
    for (const error of validator.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Ruleset validation passed.');
  console.log(`- Ruleset ID: ${EXPECTED_RULESET_ID}`);
  console.log(`- Continents: ${mapData.continents.length}`);
  console.log(`- Territories: ${mapData.territories.length}`);
  console.log(`- Objectives: ${objectives.objectives.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
