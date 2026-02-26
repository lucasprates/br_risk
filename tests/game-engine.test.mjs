import assert from 'node:assert/strict';
import test from 'node:test';
import { BriskEngine } from '../apps/server/src/game-engine.mjs';

function startThreePlayerGame(engine, roomId) {
  const host = engine.createOrJoinRoom({
    roomId,
    playerName: 'Alice',
    socketId: `${roomId}_s1`
  });
  const second = engine.createOrJoinRoom({
    roomId,
    playerName: 'Bruno',
    socketId: `${roomId}_s2`
  });
  const third = engine.createOrJoinRoom({
    roomId,
    playerName: 'Carla',
    socketId: `${roomId}_s3`
  });

  const room = engine.startGame({ roomId, playerId: host.player.id });
  return { room, host, second, third };
}

test('reconnects an existing player into in-progress room', () => {
  const engine = new BriskEngine();
  const roomId = 'TREC01';
  const { host } = startThreePlayerGame(engine, roomId);

  engine.removeSocket(`${roomId}_s1`);

  const rejoin = engine.createOrJoinRoom({
    roomId,
    playerName: 'Alice',
    playerId: host.player.id,
    socketId: `${roomId}_s1_rejoin`
  });

  assert.equal(rejoin.reconnected, true);
  assert.equal(rejoin.player.id, host.player.id);
  assert.equal(rejoin.player.connected, true);
  assert.equal(rejoin.player.socketId, `${roomId}_s1_rejoin`);
  assert.equal(
    engine.isActiveSocketForPlayer({
      roomId,
      playerId: host.player.id,
      socketId: `${roomId}_s1_rejoin`
    }),
    true
  );
  assert.equal(
    engine.isActiveSocketForPlayer({
      roomId,
      playerId: host.player.id,
      socketId: `${roomId}_s1`
    }),
    false
  );

  assert.throws(
    () => engine.createOrJoinRoom({ roomId, playerName: 'Diana', socketId: `${roomId}_s4` }),
    /Game already started in this room\./
  );
});

test('increments round on wrap even if first player in order was eliminated', () => {
  const engine = new BriskEngine();
  const roomId = 'TROUND';
  const { room } = startThreePlayerGame(engine, roomId);
  const [firstPlayer, secondPlayer, thirdPlayer] = room.game.players;

  firstPlayer.alive = false;
  room.game.turn.currentPlayerId = thirdPlayer.id;
  room.game.turn.phase = 'ATTACK';

  const beforeRound = room.game.turn.round;
  engine.applyGameAction({
    roomId,
    playerId: thirdPlayer.id,
    action: { type: 'END_TURN' }
  });

  assert.equal(room.game.turn.round, beforeRound + 1);
  assert.equal(room.game.turn.currentPlayerId, secondPlayer.id);
});

test('starting player is not fixed to host across many game starts', () => {
  let hostStarts = 0;
  const rounds = 24;

  for (let index = 0; index < rounds; index += 1) {
    const engine = new BriskEngine();
    const roomId = `TRAND${index}`;
    const { room, host } = startThreePlayerGame(engine, roomId);
    if (room.game.turn.currentPlayerId === host.player.id) {
      hostStarts += 1;
    }
  }

  assert.notEqual(hostStarts, rounds);
});

test('deletes finished room once everyone disconnects', () => {
  const engine = new BriskEngine();
  const roomId = 'TCLEAN1';
  const { room } = startThreePlayerGame(engine, roomId);

  room.status = 'FINISHED';
  room.game.status = 'FINISHED';

  engine.removeSocket(`${roomId}_s1`);
  engine.removeSocket(`${roomId}_s2`);
  engine.removeSocket(`${roomId}_s3`);

  assert.equal(engine.getRoom(roomId), undefined);
});

test('keeps in-progress room while partially connected', () => {
  const engine = new BriskEngine();
  const roomId = 'TCLEAN2';
  startThreePlayerGame(engine, roomId);

  engine.removeSocket(`${roomId}_s2`);
  engine.removeSocket(`${roomId}_s3`);

  const room = engine.getRoom(roomId);
  assert.ok(room);
  assert.equal(room.inactiveSince, null);
  assert.equal(room.players.filter((player) => player.connected).length, 1);
});

test('marks fully disconnected in-progress room inactive and prunes by ttl', async () => {
  const engine = new BriskEngine({ inactiveRoomTtlMs: 5 });
  const roomId = 'TCLEAN3';
  startThreePlayerGame(engine, roomId);

  engine.removeSocket(`${roomId}_s1`);
  engine.removeSocket(`${roomId}_s2`);
  engine.removeSocket(`${roomId}_s3`);

  const inactiveRoom = engine.getRoom(roomId);
  assert.ok(inactiveRoom);
  assert.equal(typeof inactiveRoom.inactiveSince, 'number');

  await new Promise((resolve) => setTimeout(resolve, 12));

  // Any engine entrypoint triggers pruning.
  engine.getRoom('NO_ROOM');
  assert.equal(engine.getRoom(roomId), undefined);
});

test('generates per-player snapshots with private objectives and shared heavy game payload', () => {
  const engine = new BriskEngine();
  const roomId = 'TSNAP1';
  const { room } = startThreePlayerGame(engine, roomId);

  const snapshots = engine.snapshotsByPlayer(roomId, { battleResult: null });
  const [playerA, playerB] = room.game.players;
  const snapshotA = snapshots.get(playerA.id);
  const snapshotB = snapshots.get(playerB.id);

  assert.ok(snapshotA);
  assert.ok(snapshotB);
  assert.equal(snapshots.size, room.players.length);

  const objectiveAForA = snapshotA.players.find((player) => player.id === playerA.id)?.objectiveText;
  const objectiveBForA = snapshotA.players.find((player) => player.id === playerB.id)?.objectiveText;
  const objectiveAForB = snapshotB.players.find((player) => player.id === playerA.id)?.objectiveText;

  assert.equal(typeof objectiveAForA, 'string');
  assert.notEqual(objectiveAForA.length, 0);
  assert.equal(objectiveBForA, null);
  assert.equal(objectiveAForB, null);

  assert.equal(snapshotA.game.territories, snapshotB.game.territories);
  assert.equal(snapshotA.game.logs, snapshotB.game.logs);
});
