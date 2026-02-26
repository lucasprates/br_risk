import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { BriskEngine } from './game-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const RULESETS_DIR = path.resolve(ROOT_DIR, 'packages/rulesets');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const engine = new BriskEngine();

app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/rulesets', express.static(RULESETS_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'BRisk-server' });
});

app.get('/api/ruleset/classic', (_req, res) => {
  res.json(engine.getRuleset());
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

function emitRoomState(roomId, actionResult = null) {
  const room = engine.getRoom(roomId);
  if (!room) {
    return;
  }

  let snapshots = null;
  try {
    snapshots = engine.snapshotsByPlayer(roomId, actionResult);
  } catch {
    return;
  }

  for (const player of room.players) {
    if (!player.socketId || !player.connected) {
      continue;
    }

    try {
      const snapshot = snapshots.get(player.id);
      if (!snapshot) {
        continue;
      }
      io.to(player.socketId).emit('state:update', snapshot);
    } catch (error) {
      io.to(player.socketId).emit('app:error', {
        message: error instanceof Error ? error.message : 'Failed to build room snapshot.'
      });
    }
  }
}

function withAck(ack, payload) {
  if (typeof ack === 'function') {
    ack(payload);
  }
}

io.on('connection', (socket) => {
  socket.on('lobby:join', (payload, ack) => {
    try {
      const { room, player } = engine.createOrJoinRoom({
        roomId: payload?.roomId,
        playerName: payload?.playerName,
        playerId: payload?.playerId,
        socketId: socket.id
      });

      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      socket.join(room.id);

      emitRoomState(room.id);

      withAck(ack, {
        ok: true,
        roomId: room.id,
        playerId: player.id,
        hostPlayerId: room.hostPlayerId
      });
    } catch (error) {
      withAck(ack, {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to join lobby.'
      });
    }
  });

  socket.on('game:start', (_payload, ack) => {
    try {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) {
        throw new Error('You must join a room first.');
      }
      if (!engine.isActiveSocketForPlayer({ roomId, playerId, socketId: socket.id })) {
        throw new Error('This tab is no longer the active session for this player.');
      }

      const room = engine.startGame({ roomId, playerId });
      emitRoomState(room.id);

      withAck(ack, { ok: true });
    } catch (error) {
      withAck(ack, {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to start game.'
      });
    }
  });

  socket.on('game:action', (payload, ack) => {
    try {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) {
        throw new Error('You must join a room first.');
      }
      if (!engine.isActiveSocketForPlayer({ roomId, playerId, socketId: socket.id })) {
        throw new Error('This tab is no longer the active session for this player.');
      }

      const { room, actionResult } = engine.applyGameAction({
        roomId,
        playerId,
        action: payload
      });

      emitRoomState(room.id, actionResult);
      withAck(ack, { ok: true, actionResult });
    } catch (error) {
      withAck(ack, {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to apply game action.'
      });
    }
  });

  socket.on('disconnect', () => {
    const result = engine.removeSocket(socket.id);
    if (!result.room || result.roomDeleted) {
      return;
    }
    emitRoomState(result.room.id);
  });
});

const PORT = Number(process.env.PORT ?? 3000);

server.listen(PORT, () => {
  console.log(`BRisk server listening on http://localhost:${PORT}`);
});
