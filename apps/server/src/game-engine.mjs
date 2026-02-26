import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULESET_DIR = path.resolve(__dirname, '../../../packages/rulesets/war-classic-02000');
const constants = JSON.parse(fs.readFileSync(path.join(RULESET_DIR, 'constants.json'), 'utf8'));
const mapData = JSON.parse(fs.readFileSync(path.join(RULESET_DIR, 'map.json'), 'utf8'));
const objectivesData = JSON.parse(fs.readFileSync(path.join(RULESET_DIR, 'objectives.json'), 'utf8'));

const TERRITORIES_BY_ID = new Map(mapData.territories.map((territory) => [territory.id, territory]));
const CONTINENTS_BY_ID = new Map(mapData.continents.map((continent) => [continent.id, continent]));
const OBJECTIVES_BY_ID = new Map(objectivesData.objectives.map((objective) => [objective.id, objective]));

const PLAYER_COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE'];
const INACTIVE_ROOM_TTL_MS = 15 * 60 * 1000;

function randomId(prefix = '') {
  return `${prefix}${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeRoomId(roomId) {
  const normalized = String(roomId ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length < 3 || normalized.length > 12) {
    throw new Error('Room code must be 3-12 letters/numbers.');
  }
  return normalized;
}

function normalizePlayerName(name) {
  const normalized = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 24) {
    throw new Error('Player name must be 2-24 characters.');
  }
  return normalized;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function rollDice(count) {
  const rolls = [];
  for (let i = 0; i < count; i += 1) {
    rolls.push(1 + Math.floor(Math.random() * 6));
  }
  return rolls.sort((a, b) => b - a);
}

function countTerritoriesOwned(game, playerId) {
  let total = 0;
  for (const state of Object.values(game.territories)) {
    if (state.ownerId === playerId) {
      total += 1;
    }
  }
  return total;
}

function ownedTerritoryIds(game, playerId) {
  return Object.entries(game.territories)
    .filter(([, state]) => state.ownerId === playerId)
    .map(([territoryId]) => territoryId);
}

function calculateContinentBonus(game, playerId) {
  let bonus = 0;
  for (const continent of mapData.continents) {
    const controlsContinent = continent.territoryIds.every(
      (territoryId) => game.territories[territoryId].ownerId === playerId
    );
    if (controlsContinent) {
      bonus += constants.reinforcement.continentBonus[continent.id] ?? 0;
    }
  }
  return bonus;
}

function calculateReinforcement(game, playerId) {
  const owned = countTerritoriesOwned(game, playerId);
  const base = Math.max(3, Math.floor(owned / 2));
  return base + calculateContinentBonus(game, playerId);
}

function indexOfPlayer(game, playerId) {
  return game.players.findIndex((player) => player.id === playerId);
}

function findNextAlivePlayer(game, currentPlayerId) {
  const currentIndex = indexOfPlayer(game, currentPlayerId);
  if (currentIndex < 0) {
    return null;
  }

  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (currentIndex + offset) % game.players.length;
    const candidate = game.players[index];
    if (candidate.alive) {
      return candidate;
    }
  }
  return null;
}

function updatePlayerAliveStatus(game) {
  const playerById = new Map(game.players.map((player) => [player.id, player]));
  const territoryCounts = new Map(game.players.map((player) => [player.id, 0]));

  for (const territoryState of Object.values(game.territories)) {
    territoryCounts.set(
      territoryState.ownerId,
      (territoryCounts.get(territoryState.ownerId) ?? 0) + 1
    );
  }

  for (const [playerId, count] of territoryCounts.entries()) {
    const player = playerById.get(playerId);
    if (!player) {
      continue;
    }

    if (count < 1 && player.alive) {
      player.alive = false;
      player.reserveArmies = 0;
      if (!player.eliminatedAt) {
        player.eliminatedAt = new Date().toISOString();
      }
    }
  }
}

function addLog(game, text) {
  game.logs.unshift({
    id: randomId('log_'),
    at: new Date().toISOString(),
    text
  });
  if (game.logs.length > 80) {
    game.logs.length = 80;
  }
}

function requiredForSelfTargetRedraw(objectiveId, playerColor) {
  const objective = OBJECTIVES_BY_ID.get(objectiveId);
  if (!objective || objective.predicate.kind !== 'ELIMINATE_COLOR') {
    return false;
  }
  return objective.predicate.color === playerColor;
}

function assignObjectives(players) {
  const deck = shuffle(objectivesData.objectives.map((objective) => objective.id));

  return players.map((player) => {
    let objectiveId = deck.shift();
    let safety = 0;

    while (
      objectiveId &&
      requiredForSelfTargetRedraw(objectiveId, player.color) &&
      safety < objectivesData.objectives.length * 2
    ) {
      deck.push(objectiveId);
      objectiveId = deck.shift();
      safety += 1;
    }

    if (!objectiveId) {
      objectiveId = 'OBJ_07';
    }

    if (requiredForSelfTargetRedraw(objectiveId, player.color)) {
      objectiveId = 'OBJ_07';
    }

    return { ...player, objectiveId };
  });
}

function resolveFallbackObjective(predicate) {
  const fallbackObjective = OBJECTIVES_BY_ID.get(predicate.fallbackObjectiveId);
  if (!fallbackObjective) {
    return null;
  }
  return fallbackObjective.predicate;
}

function evaluateObjectivePredicate(game, player, predicate) {
  if (!predicate) {
    return false;
  }

  if (predicate.kind === 'CONTROL_CONTINENTS') {
    return predicate.continentIds.every((continentId) => {
      const continent = CONTINENTS_BY_ID.get(continentId);
      if (!continent) {
        return false;
      }
      return continent.territoryIds.every(
        (territoryId) => game.territories[territoryId].ownerId === player.id
      );
    });
  }

  if (predicate.kind === 'CONTROL_CONTINENTS_PLUS_ANY') {
    const requiredOk = predicate.required.every((continentId) => {
      const continent = CONTINENTS_BY_ID.get(continentId);
      if (!continent) {
        return false;
      }
      return continent.territoryIds.every(
        (territoryId) => game.territories[territoryId].ownerId === player.id
      );
    });

    if (!requiredOk) {
      return false;
    }

    const ownedContinents = mapData.continents.filter((continent) =>
      continent.territoryIds.every((territoryId) => game.territories[territoryId].ownerId === player.id)
    ).length;

    return ownedContinents >= predicate.required.length + predicate.additionalCount;
  }

  if (predicate.kind === 'CONTROL_TERRITORIES') {
    const qualifyingTerritories = Object.values(game.territories).filter(
      (territoryState) =>
        territoryState.ownerId === player.id && territoryState.armies >= predicate.minArmiesEach
    ).length;

    return qualifyingTerritories >= predicate.count;
  }

  if (predicate.kind === 'ELIMINATE_COLOR') {
    const target = game.players.find((candidate) => candidate.color === predicate.color);

    if (!target) {
      return evaluateObjectivePredicate(game, player, resolveFallbackObjective(predicate));
    }

    if (target.id === player.id) {
      return evaluateObjectivePredicate(game, player, resolveFallbackObjective(predicate));
    }

    if (target.alive) {
      return false;
    }

    if (target.eliminatedByPlayerId === player.id) {
      return true;
    }

    return evaluateObjectivePredicate(game, player, resolveFallbackObjective(predicate));
  }

  return false;
}

function checkWinner(game) {
  if (game.status !== 'IN_PROGRESS') {
    return;
  }

  const alivePlayers = game.players.filter((player) => player.alive);
  if (alivePlayers.length === 1) {
    game.status = 'FINISHED';
    game.winnerPlayerId = alivePlayers[0].id;
    addLog(game, `${alivePlayers[0].name} venceu por dominacao total.`);
    return;
  }

  for (const player of alivePlayers) {
    const objective = OBJECTIVES_BY_ID.get(player.objectiveId);
    if (!objective) {
      continue;
    }

    const done = evaluateObjectivePredicate(game, player, objective.predicate);
    if (done) {
      game.status = 'FINISHED';
      game.winnerPlayerId = player.id;
      addLog(game, `${player.name} completou o objetivo e venceu.`);
      return;
    }
  }
}

function autoAllocateInitialReserves(game, startingArmiesByCount) {
  const startingTotal = startingArmiesByCount[String(game.players.length)] ?? 20;

  for (const player of game.players) {
    const owned = ownedTerritoryIds(game, player.id);
    const remaining = Math.max(0, startingTotal - owned.length);
    player.reserveArmies = 0;

    for (let i = 0; i < remaining; i += 1) {
      const territoryId = owned[Math.floor(Math.random() * owned.length)];
      game.territories[territoryId].armies += 1;
    }
  }
}

function buildInitialGame(players) {
  const shuffledColors = shuffle(PLAYER_COLORS).slice(0, players.length);
  const shuffledPlayers = players.map((player, index) => ({
    id: player.id,
    name: player.name,
    connected: true,
    color: shuffledColors[index],
    alive: true,
    reserveArmies: 0,
    objectiveId: null,
    eliminatedByPlayerId: null,
    eliminatedAt: null
  }));

  const playersWithObjectives = assignObjectives(shuffledPlayers);
  const turnOrderPlayers = shuffle(playersWithObjectives);
  const territories = {};
  for (const territory of mapData.territories) {
    territories[territory.id] = { ownerId: '', armies: 0 };
  }

  const shuffledTerritoryIds = shuffle(mapData.territories.map((territory) => territory.id));
  for (let index = 0; index < shuffledTerritoryIds.length; index += 1) {
    const territoryId = shuffledTerritoryIds[index];
    const owner = turnOrderPlayers[index % turnOrderPlayers.length];
    territories[territoryId] = {
      ownerId: owner.id,
      armies: 1
    };
  }

  const firstPlayer = turnOrderPlayers[0];
  const game = {
    id: randomId('game_'),
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: turnOrderPlayers,
    territories,
    turn: {
      round: 1,
      currentPlayerId: firstPlayer.id,
      phase: 'REINFORCE',
      conqueredThisTurn: false,
      fortifiedThisTurn: false
    },
    winnerPlayerId: null,
    logs: []
  };

  autoAllocateInitialReserves(game, constants.players.startingArmiesByPlayerCount);
  firstPlayer.reserveArmies = calculateReinforcement(game, firstPlayer.id);
  addLog(game, `${firstPlayer.name} inicia a partida.`);

  return game;
}

function validateCurrentTurn(game, playerId) {
  if (game.status !== 'IN_PROGRESS') {
    throw new Error('The game is not in progress.');
  }

  if (game.turn.currentPlayerId !== playerId) {
    throw new Error('Not your turn.');
  }

  const player = game.players.find((entry) => entry.id === playerId);
  if (!player || !player.alive) {
    throw new Error('This player is not active.');
  }

  return player;
}

function ensureTerritoryExists(territoryId) {
  const territory = TERRITORIES_BY_ID.get(territoryId);
  if (!territory) {
    throw new Error(`Unknown territory: ${territoryId}`);
  }
  return territory;
}

function placeReinforcement(game, playerId, payload) {
  const player = validateCurrentTurn(game, playerId);
  if (game.turn.phase !== 'REINFORCE') {
    throw new Error('Reinforcement is only allowed during REINFORCE phase.');
  }

  if (player.reserveArmies < 1) {
    throw new Error('No reserve armies left.');
  }

  ensureTerritoryExists(payload.territoryId);
  const territoryState = game.territories[payload.territoryId];

  if (territoryState.ownerId !== player.id) {
    throw new Error('You can only reinforce your own territories.');
  }

  territoryState.armies += 1;
  player.reserveArmies -= 1;

  addLog(game, `${player.name} reforcou ${payload.territoryId} (+1).`);

  if (player.reserveArmies === 0) {
    game.turn.phase = 'ATTACK';
    addLog(game, `${player.name} entrou na fase de ataque.`);
  }
}

function resolveEliminations(game, defeatedPlayerId, attackerId) {
  const defeatedOwned = countTerritoriesOwned(game, defeatedPlayerId);
  if (defeatedOwned > 0) {
    return;
  }

  const defeatedPlayer = game.players.find((player) => player.id === defeatedPlayerId);
  if (!defeatedPlayer || !defeatedPlayer.alive) {
    return;
  }

  defeatedPlayer.alive = false;
  defeatedPlayer.eliminatedByPlayerId = attackerId;
  defeatedPlayer.eliminatedAt = new Date().toISOString();
  defeatedPlayer.reserveArmies = 0;

  addLog(game, `${defeatedPlayer.name} foi eliminado.`);
}

function attackTerritory(game, playerId, payload) {
  const player = validateCurrentTurn(game, playerId);

  if (game.turn.phase !== 'ATTACK') {
    throw new Error('Attack is only allowed during ATTACK phase.');
  }

  ensureTerritoryExists(payload.fromTerritoryId);
  ensureTerritoryExists(payload.toTerritoryId);

  const fromTerritory = game.territories[payload.fromTerritoryId];
  const toTerritory = game.territories[payload.toTerritoryId];
  const fromMap = TERRITORIES_BY_ID.get(payload.fromTerritoryId);

  if (fromTerritory.ownerId !== player.id) {
    throw new Error('Attack origin must be owned by current player.');
  }

  if (toTerritory.ownerId === player.id) {
    throw new Error('Attack target must be enemy territory.');
  }

  if (!fromMap.neighbors.includes(payload.toTerritoryId)) {
    throw new Error('Territories are not adjacent.');
  }

  if (fromTerritory.armies < 2) {
    throw new Error('Need at least 2 armies to attack.');
  }

  const maxAttackDice = Math.min(constants.combat.attackDiceMax, fromTerritory.armies - 1);
  const attackDice = Math.max(1, Math.min(maxAttackDice, Number(payload.attackDice ?? 1)));
  const defenseDice = Math.min(constants.combat.defenseDiceMax, toTerritory.armies);

  const attackRolls = rollDice(attackDice);
  const defenseRolls = rollDice(defenseDice);
  const comparisons = Math.min(attackRolls.length, defenseRolls.length);

  let attackerLosses = 0;
  let defenderLosses = 0;

  for (let i = 0; i < comparisons; i += 1) {
    if (attackRolls[i] > defenseRolls[i]) {
      defenderLosses += 1;
    } else {
      attackerLosses += 1;
    }
  }

  fromTerritory.armies -= attackerLosses;
  toTerritory.armies -= defenderLosses;

  let conquered = false;
  let movedArmies = 0;
  const previousOwnerId = toTerritory.ownerId;

  if (toTerritory.armies <= 0) {
    conquered = true;
    movedArmies = Math.min(attackDice, fromTerritory.armies - 1);
    movedArmies = Math.max(1, movedArmies);

    toTerritory.ownerId = player.id;
    toTerritory.armies = movedArmies;
    fromTerritory.armies -= movedArmies;

    game.turn.conqueredThisTurn = true;
    addLog(game, `${player.name} conquistou ${payload.toTerritoryId}.`);

    resolveEliminations(game, previousOwnerId, player.id);
  }

  addLog(
    game,
    `${player.name} atacou ${payload.toTerritoryId} de ${payload.fromTerritoryId} (A:${attackRolls.join(',')} vs D:${defenseRolls.join(',')}).`
  );

  return {
    fromTerritoryId: payload.fromTerritoryId,
    toTerritoryId: payload.toTerritoryId,
    attackRolls,
    defenseRolls,
    attackerLosses,
    defenderLosses,
    conquered,
    movedArmies
  };
}

function endAttackPhase(game, playerId) {
  const player = validateCurrentTurn(game, playerId);
  if (game.turn.phase !== 'ATTACK') {
    throw new Error('Cannot end attack phase from current phase.');
  }

  game.turn.phase = 'FORTIFY';
  game.turn.fortifiedThisTurn = false;
  addLog(game, `${player.name} entrou na fase de deslocamento.`);
}

function fortify(game, playerId, payload) {
  const player = validateCurrentTurn(game, playerId);
  if (game.turn.phase !== 'FORTIFY') {
    throw new Error('Fortify is only allowed during FORTIFY phase.');
  }

  if (game.turn.fortifiedThisTurn) {
    throw new Error('Only one fortify move is allowed per turn.');
  }

  ensureTerritoryExists(payload.fromTerritoryId);
  ensureTerritoryExists(payload.toTerritoryId);

  const fromTerritory = game.territories[payload.fromTerritoryId];
  const toTerritory = game.territories[payload.toTerritoryId];

  if (fromTerritory.ownerId !== player.id || toTerritory.ownerId !== player.id) {
    throw new Error('Fortify can only move armies between your territories.');
  }

  const fromMap = TERRITORIES_BY_ID.get(payload.fromTerritoryId);
  if (!fromMap.neighbors.includes(payload.toTerritoryId)) {
    throw new Error('Fortify territories must be adjacent.');
  }

  const armies = Number(payload.armies ?? 0);
  if (!Number.isInteger(armies) || armies < 1) {
    throw new Error('Fortify armies must be a positive integer.');
  }

  if (fromTerritory.armies <= armies) {
    throw new Error('You must leave at least one army behind.');
  }

  fromTerritory.armies -= armies;
  toTerritory.armies += armies;
  game.turn.fortifiedThisTurn = true;

  addLog(game, `${player.name} deslocou ${armies} de ${payload.fromTerritoryId} para ${payload.toTerritoryId}.`);
}

function endTurn(game, playerId) {
  const player = validateCurrentTurn(game, playerId);

  if (game.turn.phase === 'REINFORCE' && player.reserveArmies > 0) {
    throw new Error('Place all reinforcement armies before ending turn.');
  }

  const nextPlayer = findNextAlivePlayer(game, player.id);
  if (!nextPlayer) {
    throw new Error('No next player available.');
  }

  const currentIndex = indexOfPlayer(game, player.id);
  const nextIndex = indexOfPlayer(game, nextPlayer.id);
  if (currentIndex < 0 || nextIndex < 0) {
    throw new Error('Turn order is inconsistent.');
  }

  if (nextIndex <= currentIndex) {
    game.turn.round += 1;
  }

  game.turn.currentPlayerId = nextPlayer.id;
  game.turn.phase = 'REINFORCE';
  game.turn.conqueredThisTurn = false;
  game.turn.fortifiedThisTurn = false;

  nextPlayer.reserveArmies = calculateReinforcement(game, nextPlayer.id);
  addLog(game, `Turno de ${nextPlayer.name}. Recebeu ${nextPlayer.reserveArmies} exercitos.`);
}

function applyAction(game, playerId, action) {
  if (!action || typeof action.type !== 'string') {
    throw new Error('Invalid action payload.');
  }

  let battleResult = null;

  if (action.type === 'PLACE_REINFORCEMENT') {
    placeReinforcement(game, playerId, action.payload ?? {});
  } else if (action.type === 'ATTACK') {
    battleResult = attackTerritory(game, playerId, action.payload ?? {});
  } else if (action.type === 'END_ATTACK_PHASE') {
    endAttackPhase(game, playerId);
  } else if (action.type === 'FORTIFY') {
    fortify(game, playerId, action.payload ?? {});
  } else if (action.type === 'END_TURN') {
    endTurn(game, playerId);
  } else {
    throw new Error(`Unknown action type: ${action.type}`);
  }

  updatePlayerAliveStatus(game);
  checkWinner(game);
  game.updatedAt = new Date().toISOString();

  return {
    battleResult
  };
}

function buildPublicPlayerViewBase(room, game) {
  const roomPlayerById = new Map(room.players.map((player) => [player.id, player]));
  const territoryCountByPlayer = new Map(game.players.map((player) => [player.id, 0]));
  for (const territoryState of Object.values(game.territories)) {
    territoryCountByPlayer.set(
      territoryState.ownerId,
      (territoryCountByPlayer.get(territoryState.ownerId) ?? 0) + 1
    );
  }

  const objectiveTextByPlayerId = new Map();
  const players = game.players.map((player) => {
    const objective = OBJECTIVES_BY_ID.get(player.objectiveId);
    objectiveTextByPlayerId.set(player.id, objective?.textPt ?? '');

    return {
      id: player.id,
      name: player.name,
      color: player.color,
      connected: roomPlayerById.get(player.id)?.connected ?? false,
      alive: player.alive,
      reserveArmies: player.reserveArmies,
      territoryCount: territoryCountByPlayer.get(player.id) ?? 0,
      isCurrentTurn: game.turn.currentPlayerId === player.id,
      objectiveText: null
    };
  });

  return { players, objectiveTextByPlayerId };
}

function buildSnapshotTemplate(room, lastActionResult = null) {
  if (room.status === 'LOBBY') {
    return {
      baseSnapshot: {
        roomId: room.id,
        status: room.status,
        hostPlayerId: room.hostPlayerId,
        players: room.players.map((player) => ({
          id: player.id,
          name: player.name,
          connected: player.connected
        })),
        map: {
          rulesetId: mapData.rulesetId,
          territories: mapData.territories
        }
      },
      objectiveTextByPlayerId: null
    };
  }

  const game = room.game;
  const { players, objectiveTextByPlayerId } = buildPublicPlayerViewBase(room, game);

  return {
    baseSnapshot: {
      roomId: room.id,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      players,
      map: {
        rulesetId: mapData.rulesetId,
        territories: mapData.territories,
        continents: mapData.continents
      },
      game: {
        id: game.id,
        status: game.status,
        round: game.turn.round,
        phase: game.turn.phase,
        currentPlayerId: game.turn.currentPlayerId,
        winnerPlayerId: game.winnerPlayerId,
        territories: clone(game.territories),
        logs: clone(game.logs),
        lastActionResult
      }
    },
    objectiveTextByPlayerId
  };
}

function snapshotForPlayerFromTemplate(baseSnapshot, objectiveTextByPlayerId, viewerPlayerId) {
  if (baseSnapshot.status === 'LOBBY') {
    return {
      ...baseSnapshot,
      youPlayerId: viewerPlayerId
    };
  }

  const viewerObjectiveText = objectiveTextByPlayerId?.get(viewerPlayerId) ?? '';
  const players = baseSnapshot.players.map((player) => {
    if (player.id !== viewerPlayerId) {
      return player;
    }
    return {
      ...player,
      objectiveText: viewerObjectiveText
    };
  });

  return {
    ...baseSnapshot,
    youPlayerId: viewerPlayerId,
    players
  };
}

class BriskEngine {
  constructor(options = {}) {
    this.rooms = new Map();
    const candidateTtl = Number(options.inactiveRoomTtlMs);
    this.inactiveRoomTtlMs =
      Number.isFinite(candidateTtl) && candidateTtl > 0 ? Math.floor(candidateTtl) : INACTIVE_ROOM_TTL_MS;
  }

  pruneInactiveRooms(nowMs = Date.now()) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.status === 'LOBBY') {
        continue;
      }
      if (!Number.isFinite(room.inactiveSince)) {
        continue;
      }
      if (nowMs - room.inactiveSince >= this.inactiveRoomTtlMs) {
        this.rooms.delete(roomId);
      }
    }
  }

  roomFullyDisconnected(room) {
    return room.players.every((player) => !player.connected || !player.socketId);
  }

  getSocketRoom(socketId) {
    this.pruneInactiveRooms();

    for (const room of this.rooms.values()) {
      const player = room.players.find((entry) => entry.socketId === socketId && entry.connected);
      if (player) {
        return { room, player };
      }
    }
    return null;
  }

  getRoom(roomId) {
    this.pruneInactiveRooms();
    return this.rooms.get(roomId);
  }

  getRuleset() {
    return {
      constants,
      map: mapData,
      objectives: objectivesData
    };
  }

  createOrJoinRoom({ roomId, playerName, socketId, playerId }) {
    this.pruneInactiveRooms();

    const normalizedRoomId = normalizeRoomId(roomId);
    const normalizedPlayerName = normalizePlayerName(playerName);
    const normalizedPlayerId = typeof playerId === 'string' ? playerId.trim() : '';

    const socketMembership = this.getSocketRoom(socketId);
    if (socketMembership) {
      if (socketMembership.room.id === normalizedRoomId) {
        throw new Error(
          `This tab is already in room ${socketMembership.room.id} as ${socketMembership.player.name}.`
        );
      }
      throw new Error(
        `This tab is already in room ${socketMembership.room.id}. Open another tab for another player.`
      );
    }

    const existingRoom = this.rooms.get(normalizedRoomId);
    if (!existingRoom) {
      const player = {
        id: randomId('player_'),
        name: normalizedPlayerName,
        socketId,
        connected: true
      };

      const newRoom = {
        id: normalizedRoomId,
        createdAt: new Date().toISOString(),
        status: 'LOBBY',
        hostPlayerId: player.id,
        players: [player],
        game: null,
        inactiveSince: null
      };

      this.rooms.set(normalizedRoomId, newRoom);

      return {
        room: newRoom,
        player,
        created: true
      };
    }

    if (existingRoom.status !== 'LOBBY') {
      let reconnectPlayer = null;

      if (normalizedPlayerId) {
        reconnectPlayer = existingRoom.players.find((player) => player.id === normalizedPlayerId) ?? null;
        if (reconnectPlayer && reconnectPlayer.name.toLowerCase() !== normalizedPlayerName.toLowerCase()) {
          throw new Error('Player identity does not match this room.');
        }
      }

      if (!reconnectPlayer) {
        reconnectPlayer = existingRoom.players.find(
          (player) => player.name.toLowerCase() === normalizedPlayerName.toLowerCase()
        ) ?? null;
      }

      if (!reconnectPlayer) {
        throw new Error('Game already started in this room.');
      }

      if (
        reconnectPlayer.connected &&
        reconnectPlayer.socketId &&
        reconnectPlayer.socketId !== socketId &&
        reconnectPlayer.id !== normalizedPlayerId
      ) {
        throw new Error('This player is already connected from another tab.');
      }

      reconnectPlayer.connected = true;
      reconnectPlayer.socketId = socketId;
      existingRoom.inactiveSince = null;

      return {
        room: existingRoom,
        player: reconnectPlayer,
        created: false,
        reconnected: true
      };
    }

    if (existingRoom.players.length >= constants.players.max) {
      throw new Error('Room is full.');
    }

    const nameTaken = existingRoom.players.some(
      (player) => player.name.toLowerCase() === normalizedPlayerName.toLowerCase()
    );
    if (nameTaken) {
      throw new Error('Player name already exists in this room.');
    }

    const player = {
      id: randomId('player_'),
      name: normalizedPlayerName,
      socketId,
      connected: true
    };

    existingRoom.players.push(player);
    existingRoom.inactiveSince = null;

    return {
      room: existingRoom,
      player,
      created: false
    };
  }

  removeSocket(socketId) {
    this.pruneInactiveRooms();

    for (const room of this.rooms.values()) {
      const player = room.players.find((entry) => entry.socketId === socketId);
      if (!player) {
        continue;
      }

      if (room.status === 'LOBBY') {
        room.players = room.players.filter((entry) => entry.id !== player.id);

        if (room.players.length < 1) {
          this.rooms.delete(room.id);
          return { room: null, roomDeleted: true };
        }

        if (room.hostPlayerId === player.id) {
          room.hostPlayerId = room.players[0].id;
        }

        return { room, roomDeleted: false };
      }

      player.connected = false;
      player.socketId = null;

      if (!this.roomFullyDisconnected(room)) {
        room.inactiveSince = null;
        return { room, roomDeleted: false };
      }

      if (room.status === 'FINISHED') {
        this.rooms.delete(room.id);
        return { room: null, roomDeleted: true };
      }

      room.inactiveSince = room.inactiveSince ?? Date.now();
      return { room, roomDeleted: false };
    }

    return { room: null, roomDeleted: false };
  }

  startGame({ roomId, playerId }) {
    this.pruneInactiveRooms();

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found.');
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game already started.');
    }

    if (room.hostPlayerId !== playerId) {
      throw new Error('Only the host can start the game.');
    }

    if (room.players.length < constants.players.min) {
      throw new Error(`Need at least ${constants.players.min} players to start.`);
    }

    room.game = buildInitialGame(room.players);
    room.status = 'IN_PROGRESS';
    room.inactiveSince = null;

    for (const gamePlayer of room.game.players) {
      const lobbyPlayer = room.players.find((entry) => entry.id === gamePlayer.id);
      if (!lobbyPlayer) {
        continue;
      }
      lobbyPlayer.color = gamePlayer.color;
      lobbyPlayer.alive = gamePlayer.alive;
    }

    return room;
  }

  applyGameAction({ roomId, playerId, action }) {
    this.pruneInactiveRooms();

    const room = this.rooms.get(roomId);
    if (!room || room.status === 'LOBBY' || !room.game) {
      throw new Error('Game room not found or not started.');
    }

    const result = applyAction(room.game, playerId, action);

    if (room.game.status === 'FINISHED') {
      room.status = 'FINISHED';
    }

    return {
      room,
      actionResult: result
    };
  }

  isActiveSocketForPlayer({ roomId, playerId, socketId }) {
    this.pruneInactiveRooms();

    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const player = room.players.find((entry) => entry.id === playerId);
    if (!player) {
      return false;
    }

    return player.connected && player.socketId === socketId;
  }

  snapshot(roomId, viewerPlayerId, actionResult = null) {
    this.pruneInactiveRooms();

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found.');
    }

    const { baseSnapshot, objectiveTextByPlayerId } = buildSnapshotTemplate(room, actionResult);
    return snapshotForPlayerFromTemplate(baseSnapshot, objectiveTextByPlayerId, viewerPlayerId);
  }

  snapshotsByPlayer(roomId, actionResult = null) {
    this.pruneInactiveRooms();

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found.');
    }

    const { baseSnapshot, objectiveTextByPlayerId } = buildSnapshotTemplate(room, actionResult);
    const snapshots = new Map();

    for (const player of room.players) {
      snapshots.set(
        player.id,
        snapshotForPlayerFromTemplate(baseSnapshot, objectiveTextByPlayerId, player.id)
      );
    }

    return snapshots;
  }
}

export { BriskEngine };
