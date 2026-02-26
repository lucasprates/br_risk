const SVG_NS = 'http://www.w3.org/2000/svg';

const OWNER_COLORS = {
  RED: '#d54f4f',
  BLUE: '#4e7ccf',
  GREEN: '#3ea266',
  YELLOW: '#d6ae3f',
  BLACK: '#495159',
  WHITE: '#ece9df'
};

const CONTINENT_OVERLAYS = {
  AMERICA_DO_NORTE: { cx: 340, cy: 220, rx: 320, ry: 200, color: '#8ecae6' },
  AMERICA_DO_SUL: { cx: 480, cy: 610, rx: 170, ry: 200, color: '#90be6d' },
  EUROPA: { cx: 910, cy: 210, rx: 210, ry: 150, color: '#f6bd60' },
  AFRICA: { cx: 980, cy: 560, rx: 210, ry: 210, color: '#f28482' },
  ASIA: { cx: 1340, cy: 320, rx: 360, ry: 250, color: '#84a59d' },
  OCEANIA: { cx: 1430, cy: 720, rx: 170, ry: 120, color: '#b8c0ff' }
};

const TERRITORY_LAYOUT = {
  ALASKA: { x: 130, y: 170, rx: 70, ry: 42, shortName: 'Alaska' },
  MACKENZIE: { x: 265, y: 120, rx: 68, ry: 40, shortName: 'Mackenzie' },
  VANCOUVER: { x: 240, y: 240, rx: 68, ry: 40, shortName: 'Vancouver' },
  OTTAWA: { x: 385, y: 185, rx: 68, ry: 40, shortName: 'Ottawa' },
  LABRADOR: { x: 520, y: 145, rx: 64, ry: 38, shortName: 'Labrador' },
  GROENLANDIA: { x: 635, y: 75, rx: 72, ry: 44, shortName: 'Groenlandia' },
  NOVA_YORK: { x: 450, y: 280, rx: 66, ry: 38, shortName: 'Nova York' },
  CALIFORNIA: { x: 300, y: 330, rx: 64, ry: 38, shortName: 'California' },
  MEXICO: { x: 390, y: 405, rx: 62, ry: 36, shortName: 'Mexico' },

  VENEZUELA: { x: 455, y: 500, rx: 62, ry: 36, shortName: 'Venezuela' },
  BRASIL: { x: 560, y: 585, rx: 68, ry: 42, shortName: 'Brasil' },
  BOLIVIA: { x: 460, y: 640, rx: 62, ry: 36, shortName: 'Bolivia' },
  ARGENTINA: { x: 500, y: 760, rx: 66, ry: 40, shortName: 'Argentina' },

  ISLANDIA: { x: 760, y: 120, rx: 54, ry: 32, shortName: 'Islandia' },
  INGLATERRA: { x: 840, y: 180, rx: 56, ry: 34, shortName: 'Inglaterra' },
  SUECIA: { x: 940, y: 125, rx: 56, ry: 34, shortName: 'Suecia' },
  ALEMANHA: { x: 930, y: 235, rx: 58, ry: 34, shortName: 'Alemanha' },
  POLONIA: { x: 1030, y: 270, rx: 58, ry: 34, shortName: 'Polonia' },
  FRANCA: { x: 845, y: 290, rx: 58, ry: 34, shortName: 'Franca' },
  MOSCOU: { x: 1135, y: 185, rx: 60, ry: 36, shortName: 'Moscou' },

  ARGELIA: { x: 870, y: 430, rx: 58, ry: 34, shortName: 'Argelia' },
  EGITO: { x: 990, y: 440, rx: 56, ry: 34, shortName: 'Egito' },
  SUDAO: { x: 1040, y: 545, rx: 56, ry: 34, shortName: 'Sudao' },
  CONGO: { x: 900, y: 580, rx: 56, ry: 34, shortName: 'Congo' },
  MADAGASCAR: { x: 1115, y: 710, rx: 56, ry: 34, shortName: 'Madagascar' },
  AFRICA_DO_SUL: { x: 990, y: 700, rx: 58, ry: 34, shortName: 'Africa Sul' },

  ORIENTE_MEDIO: { x: 1095, y: 360, rx: 62, ry: 36, shortName: 'Oriente Medio' },
  ARAL: { x: 1210, y: 285, rx: 52, ry: 32, shortName: 'Aral' },
  OMSK: { x: 1320, y: 220, rx: 52, ry: 32, shortName: 'Omsk' },
  DUDINKA: { x: 1445, y: 125, rx: 54, ry: 32, shortName: 'Dudinka' },
  SIBERIA: { x: 1435, y: 235, rx: 56, ry: 34, shortName: 'Siberia' },
  TCHITA: { x: 1515, y: 300, rx: 56, ry: 34, shortName: 'Tchita' },
  MONGOLIA: { x: 1480, y: 390, rx: 56, ry: 34, shortName: 'Mongolia' },
  CHINA: { x: 1345, y: 405, rx: 60, ry: 36, shortName: 'China' },
  INDIA: { x: 1215, y: 455, rx: 56, ry: 34, shortName: 'India' },
  VIETNA: { x: 1395, y: 515, rx: 56, ry: 34, shortName: 'Vietna' },
  JAPAO: { x: 1645, y: 365, rx: 52, ry: 32, shortName: 'Japao' },
  VLADIVOSTOK: { x: 1635, y: 250, rx: 60, ry: 36, shortName: 'Vladivostok' },

  BORNEO: { x: 1435, y: 630, rx: 58, ry: 34, shortName: 'Borneo' },
  SUMATRA: { x: 1335, y: 690, rx: 56, ry: 34, shortName: 'Sumatra' },
  NOVA_GUINE: { x: 1520, y: 705, rx: 60, ry: 36, shortName: 'Nova Guine' },
  AUSTRALIA: { x: 1455, y: 805, rx: 78, ry: 46, shortName: 'Australia' }
};

function parseAutoJoinConfig() {
  const params = new URLSearchParams(window.location.search);
  const autoJoin = params.get('autoJoin') === '1';
  if (!autoJoin) {
    return null;
  }

  const playerName = (params.get('playerName') ?? '').trim();
  const roomId = (params.get('roomId') ?? '').trim().toUpperCase();

  if (!playerName || !roomId) {
    return null;
  }

  return {
    playerName,
    roomId,
    isPublic: params.get('publicRoom') === '1',
    autoHostStart: params.get('autoHostStart') === '1'
  };
}

const state = {
  socket: null,
  snapshot: null,
  mapData: null,
  territoryIndex: new Map(),
  joined: false,
  session: null,
  pendingReconnect: false,
  reconnectInFlight: false,
  selection: {
    fromTerritoryId: null,
    toTerritoryId: null
  },
  lastPhase: null,
  statusMessage: 'Connect to a room to start.',
  statusTone: 'info',
  publicRooms: [],
  autoJoinConfig: parseAutoJoinConfig(),
  autoJoinAttempted: false,
  autoHostStartTriggered: false
};

const ui = {
  joinForm: document.getElementById('join-form'),
  playerNameInput: document.getElementById('player-name'),
  roomIdInput: document.getElementById('room-id'),
  roomPublicInput: document.getElementById('room-public'),
  joinButton: document.getElementById('join-button'),
  startButton: document.getElementById('start-button'),
  publicRoomsList: document.getElementById('public-rooms-list'),
  roomsRefreshButton: document.getElementById('rooms-refresh-button'),
  statusLine: document.getElementById('status-line'),
  board: document.getElementById('board'),
  turnSummary: document.getElementById('turn-summary'),
  objectiveText: document.getElementById('objective-text'),
  selectionSummary: document.getElementById('selection-summary'),
  attackDice: document.getElementById('attack-dice'),
  attackButton: document.getElementById('attack-button'),
  fortifyArmies: document.getElementById('fortify-armies'),
  fortifyButton: document.getElementById('fortify-button'),
  endAttackButton: document.getElementById('end-attack-button'),
  endTurnButton: document.getElementById('end-turn-button'),
  playersList: document.getElementById('players-list'),
  logList: document.getElementById('log-list')
};

function setJoinFormLocked(locked) {
  ui.playerNameInput.disabled = locked;
  ui.roomIdInput.disabled = locked;
  ui.roomPublicInput.disabled = locked;
  ui.joinButton.disabled = locked;
  renderPublicRooms();
}

async function joinRoom({
  playerName,
  roomId,
  playerId = null,
  reconnect = false,
  isPublic = undefined,
  mustExist = false
}) {
  return new Promise((resolve) => {
    state.socket.emit('lobby:join', { playerName, roomId, playerId, isPublic, mustExist }, (response) => {
      if (!response?.ok) {
        state.reconnectInFlight = false;
        if (reconnect) {
          state.joined = false;
          state.pendingReconnect = false;
          setJoinFormLocked(false);
        }
        setStatus(response?.error ?? 'Failed to join room.', 'error');
        resolve(false);
        return;
      }

      state.joined = true;
      state.pendingReconnect = false;
      state.reconnectInFlight = false;
      state.session = {
        roomId: response.roomId,
        playerName,
        playerId: response.playerId,
        isPublic: Boolean(response.isPublic)
      };

      setJoinFormLocked(true);
      renderPublicRooms();

      if (reconnect) {
        setStatus(`Reconnected to room ${response.roomId}.`, 'success');
      } else {
        setStatus(`Joined room ${response.roomId}.`, 'success');
      }

      resolve(true);
    });
  });
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function svgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function setStatus(message, tone = 'info') {
  state.statusMessage = message;
  state.statusTone = tone;
  ui.statusLine.textContent = message;

  if (tone === 'error') {
    ui.statusLine.style.borderColor = '#b23a48';
    ui.statusLine.style.color = '#7f1d1d';
  } else if (tone === 'success') {
    ui.statusLine.style.borderColor = '#2f9e44';
    ui.statusLine.style.color = '#1f6f3c';
  } else {
    ui.statusLine.style.borderColor = '#d5c5a3';
    ui.statusLine.style.color = '#3b4252';
  }
}

function normalizePublicRoomList(rooms) {
  if (!Array.isArray(rooms)) {
    return [];
  }

  return rooms
    .filter((entry) => entry && typeof entry.roomId === 'string')
    .map((entry) => ({
      roomId: entry.roomId,
      hostName: typeof entry.hostName === 'string' ? entry.hostName : 'Host',
      playersCount: Number(entry.playersCount ?? 0),
      maxPlayers: Number(entry.maxPlayers ?? 0)
    }));
}

function joinPublicRoom(roomId) {
  if (state.joined) {
    setStatus('Already connected to a room in this tab.', 'info');
    return;
  }

  const playerName = ui.playerNameInput.value.trim();
  if (!playerName) {
    setStatus('Enter your name before joining a listed room.', 'error');
    ui.playerNameInput.focus();
    return;
  }

  ui.roomIdInput.value = roomId;
  void joinRoom({ playerName, roomId, mustExist: true });
}

function renderPublicRooms() {
  ui.publicRoomsList.innerHTML = '';

  if (!state.publicRooms.length) {
    const empty = document.createElement('li');
    empty.className = 'rooms-empty';
    empty.textContent = 'No public waiting rooms right now.';
    ui.publicRoomsList.appendChild(empty);
    return;
  }

  for (const room of state.publicRooms) {
    const item = document.createElement('li');
    item.className = 'public-room-item';
    item.setAttribute('data-room-id', room.roomId);

    const summary = document.createElement('div');
    summary.className = 'public-room-summary';

    const code = document.createElement('strong');
    code.textContent = room.roomId;

    const meta = document.createElement('span');
    meta.className = 'public-room-meta';
    meta.textContent = `${room.playersCount}/${room.maxPlayers} players | Host: ${room.hostName}`;

    summary.append(code, meta);

    const joinButton = document.createElement('button');
    joinButton.type = 'button';
    joinButton.className = 'secondary';
    joinButton.textContent = 'Join';
    joinButton.setAttribute('data-room-id', room.roomId);
    joinButton.disabled = state.joined;
    joinButton.addEventListener('click', () => {
      joinPublicRoom(room.roomId);
    });

    item.append(summary, joinButton);
    ui.publicRoomsList.appendChild(item);
  }
}

async function refreshPublicRooms() {
  try {
    const response = await fetch('/api/rooms/public', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    state.publicRooms = normalizePublicRoomList(payload?.rooms);
    renderPublicRooms();
  } catch {
    // Ignore list polling failures; socket updates can still refresh this panel.
  }
}

function seedJoinFormFromAutoJoin() {
  if (!state.autoJoinConfig) {
    return;
  }

  ui.playerNameInput.value = state.autoJoinConfig.playerName;
  ui.roomIdInput.value = state.autoJoinConfig.roomId;
  ui.roomPublicInput.checked = state.autoJoinConfig.isPublic;
}

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function territoryName(territoryId) {
  const territory = state.territoryIndex.get(territoryId);
  return territory?.namePt ?? toTitleCase(territoryId);
}

function territoryLayout(territoryId, index) {
  const layout = TERRITORY_LAYOUT[territoryId];
  if (layout) {
    return layout;
  }

  const row = Math.floor(index / 8);
  const col = index % 8;
  return {
    x: 220 + col * 170,
    y: 140 + row * 140,
    rx: 56,
    ry: 34,
    shortName: territoryName(territoryId)
  };
}

function createBlobPath(x, y, rx, ry, seed) {
  const points = [];
  const segments = 10;
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    const jitter = 0.82 + ((hashString(`${seed}-${index}`) % 32) / 100);
    points.push({
      x: x + Math.cos(angle) * rx * jitter,
      y: y + Math.sin(angle) * ry * jitter
    });
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} `;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const mx = ((current.x + next.x) / 2).toFixed(1);
    const my = ((current.y + next.y) / 2).toFixed(1);
    d += `Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${mx} ${my} `;
  }
  return `${d}Z`;
}

function mixHex(hex, amount) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean.length === 3
    ? clean.split('').map((char) => `${char}${char}`).join('')
    : clean, 16);

  const clamp = (input) => Math.max(0, Math.min(255, input));
  const r = clamp(((value >> 16) & 0xff) + amount);
  const g = clamp(((value >> 8) & 0xff) + amount);
  const b = clamp((value & 0xff) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function adjacent(territoryA, territoryB) {
  if (!territoryA || !territoryB) {
    return false;
  }
  const from = state.territoryIndex.get(territoryA);
  return Boolean(from?.neighbors.includes(territoryB));
}

function getCurrentGame() {
  if (!state.snapshot || !state.snapshot.game) {
    return null;
  }
  return state.snapshot.game;
}

function getSelfPlayerId() {
  return state.snapshot?.youPlayerId ?? null;
}

function getSelfPlayerView() {
  const selfId = getSelfPlayerId();
  if (!selfId || !state.snapshot?.players) {
    return null;
  }
  return state.snapshot.players.find((player) => player.id === selfId) ?? null;
}

function isMyTurn() {
  const game = getCurrentGame();
  return Boolean(game && game.currentPlayerId === getSelfPlayerId() && game.status === 'IN_PROGRESS');
}

function clearSelection() {
  state.selection.fromTerritoryId = null;
  state.selection.toTerritoryId = null;
}

async function sendGameAction(action) {
  return new Promise((resolve) => {
    state.socket.emit('game:action', action, (response) => {
      if (!response?.ok) {
        setStatus(response?.error ?? 'Action failed.', 'error');
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function territoryStrokeWidth(territoryId) {
  if (territoryId === state.selection.fromTerritoryId || territoryId === state.selection.toTerritoryId) {
    return 4;
  }
  return 2.2;
}

function territoryStrokeColor(territoryId, fill) {
  if (territoryId === state.selection.fromTerritoryId) {
    return '#0e7490';
  }
  if (territoryId === state.selection.toTerritoryId) {
    return '#b23a48';
  }
  return mixHex(fill, -52);
}

function deriveOwnerColor(ownerId) {
  if (!ownerId || !state.snapshot?.players) {
    return '#8c95a0';
  }
  const owner = state.snapshot.players.find((player) => player.id === ownerId);
  if (!owner) {
    return '#8c95a0';
  }
  return OWNER_COLORS[owner.color] ?? '#8c95a0';
}

function drawBoard() {
  ui.board.innerHTML = '';

  const map = state.mapData;
  if (!map?.territories?.length) {
    return;
  }

  const game = getCurrentGame();
  const layoutByTerritoryId = new Map();
  for (let index = 0; index < map.territories.length; index += 1) {
    const territory = map.territories[index];
    layoutByTerritoryId.set(territory.id, territoryLayout(territory.id, index));
  }

  for (const continent of map.continents ?? []) {
    const overlay = CONTINENT_OVERLAYS[continent.id];
    if (!overlay) {
      continue;
    }

    const layer = svgElement('ellipse', {
      cx: overlay.cx,
      cy: overlay.cy,
      rx: overlay.rx,
      ry: overlay.ry,
      fill: overlay.color,
      'fill-opacity': 0.15,
      stroke: mixHex(overlay.color, -30),
      'stroke-opacity': 0.25,
      'stroke-width': 2
    });
    ui.board.appendChild(layer);
  }

  const edgeSeen = new Set();
  for (let index = 0; index < map.territories.length; index += 1) {
    const territory = map.territories[index];
    const fromLayout = layoutByTerritoryId.get(territory.id);
    if (!fromLayout) {
      continue;
    }

    for (const neighborId of territory.neighbors) {
      const edgeKey = [territory.id, neighborId].sort().join('::');
      if (edgeSeen.has(edgeKey)) {
        continue;
      }
      edgeSeen.add(edgeKey);

      const toLayout = layoutByTerritoryId.get(neighborId);
      if (!toLayout) {
        continue;
      }

      const dx = toLayout.x - fromLayout.x;
      const dy = toLayout.y - fromLayout.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const bend = ((hashString(edgeKey) % 2) * 2 - 1) * (14 + (hashString(`${edgeKey}-bend`) % 14));
      const controlX = (fromLayout.x + toLayout.x) / 2 + normalX * bend;
      const controlY = (fromLayout.y + toLayout.y) / 2 + normalY * bend;

      const edge = svgElement('path', {
        d: `M ${fromLayout.x} ${fromLayout.y} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${toLayout.x} ${toLayout.y}`,
        fill: 'none',
        stroke: '#51606f',
        'stroke-opacity': 0.36,
        'stroke-width': 2,
        'stroke-linecap': 'round'
      });

      ui.board.appendChild(edge);
    }
  }

  for (let index = 0; index < map.territories.length; index += 1) {
    const territory = map.territories[index];
    const layout = layoutByTerritoryId.get(territory.id);
    if (!layout) {
      continue;
    }
    const territoryState = game?.territories?.[territory.id] ?? null;
    const ownerColor = deriveOwnerColor(territoryState?.ownerId ?? null);
    const fillColor = mixHex(ownerColor, 14);

    const group = svgElement('g', {
      class: 'territory',
      'data-territory-id': territory.id,
      cursor: 'pointer'
    });

    const shape = svgElement('path', {
      d: createBlobPath(layout.x, layout.y, layout.rx ?? 58, layout.ry ?? 34, territory.id),
      fill: fillColor,
      stroke: territoryStrokeColor(territory.id, fillColor),
      'stroke-width': territoryStrokeWidth(territory.id),
      'stroke-linejoin': 'round',
      filter: 'drop-shadow(0px 3px 3px rgba(27, 39, 51, 0.18))'
    });

    const title = svgElement('title');
    title.textContent = `${territory.namePt} (${territory.id})`;

    const label = svgElement('text', {
      x: layout.x,
      y: layout.y - 2,
      'text-anchor': 'middle',
      'font-size': 12,
      'font-weight': 700,
      fill: '#17212b'
    });
    label.textContent = layout.shortName;

    const armyBadge = svgElement('circle', {
      cx: layout.x + (layout.rx ?? 58) - 12,
      cy: layout.y + (layout.ry ?? 34) - 8,
      r: 14,
      fill: '#1f2a37',
      'fill-opacity': 0.92
    });

    const armies = svgElement('text', {
      x: layout.x + (layout.rx ?? 58) - 12,
      y: layout.y + (layout.ry ?? 34) - 3,
      'text-anchor': 'middle',
      'font-size': 12,
      'font-weight': 800,
      fill: '#fdfefc'
    });
    armies.textContent = String(territoryState?.armies ?? 0);

    group.appendChild(shape);
    group.appendChild(title);
    group.appendChild(label);
    group.appendChild(armyBadge);
    group.appendChild(armies);

    group.addEventListener('click', () => {
      onTerritoryClick(territory.id);
    });

    ui.board.appendChild(group);
  }
}

async function onTerritoryClick(territoryId) {
  const game = getCurrentGame();
  if (!game || game.status !== 'IN_PROGRESS') {
    return;
  }

  const me = getSelfPlayerView();
  const myId = getSelfPlayerId();
  if (!me || !myId) {
    return;
  }

  const territoryState = game.territories[territoryId];
  if (!territoryState) {
    return;
  }

  if (!isMyTurn()) {
    setStatus('Wait for your turn.', 'info');
    return;
  }

  if (game.phase === 'REINFORCE') {
    if (territoryState.ownerId !== myId) {
      setStatus('Reinforce only your own territories.', 'error');
      return;
    }

    if (me.reserveArmies < 1) {
      setStatus('No reserve armies left.', 'error');
      return;
    }

    await sendGameAction({
      type: 'PLACE_REINFORCEMENT',
      payload: { territoryId }
    });
    return;
  }

  if (game.phase === 'ATTACK') {
    if (!state.selection.fromTerritoryId) {
      if (territoryState.ownerId !== myId || territoryState.armies < 2) {
        setStatus('Choose one of your territories with at least 2 armies.', 'error');
        return;
      }
      state.selection.fromTerritoryId = territoryId;
      state.selection.toTerritoryId = null;
      render();
      return;
    }

    if (territoryId === state.selection.fromTerritoryId) {
      clearSelection();
      render();
      return;
    }

    if (territoryState.ownerId === myId) {
      if (territoryState.armies < 2) {
        setStatus('Origin territory must have at least 2 armies.', 'error');
        return;
      }
      state.selection.fromTerritoryId = territoryId;
      state.selection.toTerritoryId = null;
      render();
      return;
    }

    if (!adjacent(state.selection.fromTerritoryId, territoryId)) {
      setStatus('Attack is only allowed between adjacent territories.', 'error');
      return;
    }

    state.selection.toTerritoryId = territoryId;
    render();
    return;
  }

  if (game.phase === 'FORTIFY') {
    if (!state.selection.fromTerritoryId) {
      if (territoryState.ownerId !== myId || territoryState.armies < 2) {
        setStatus('Choose a source territory with at least 2 armies.', 'error');
        return;
      }
      state.selection.fromTerritoryId = territoryId;
      state.selection.toTerritoryId = null;
      render();
      return;
    }

    if (territoryId === state.selection.fromTerritoryId) {
      clearSelection();
      render();
      return;
    }

    if (territoryState.ownerId !== myId) {
      setStatus('Fortify target must be your own territory.', 'error');
      return;
    }

    if (!adjacent(state.selection.fromTerritoryId, territoryId)) {
      setStatus('Fortify move requires adjacent territories.', 'error');
      return;
    }

    state.selection.toTerritoryId = territoryId;
    render();
  }
}

function renderPlayers() {
  ui.playersList.innerHTML = '';

  if (!state.snapshot?.players?.length) {
    return;
  }

  for (const player of state.snapshot.players) {
    const item = document.createElement('li');

    const name = document.createElement('span');
    name.className = 'player-name';

    const dot = document.createElement('span');
    dot.className = 'color-dot';
    dot.style.background = OWNER_COLORS[player.color] ?? '#8c95a0';

    const nameText = document.createElement('span');
    const deadMarker = player.alive === false ? ' (eliminado)' : '';
    const turnMarker = player.isCurrentTurn ? ' *' : '';
    nameText.textContent = `${player.name}${turnMarker}${deadMarker}`;

    name.append(dot, nameText);

    const meta = document.createElement('span');
    meta.className = 'player-meta';
    if (state.snapshot.status === 'LOBBY') {
      meta.textContent = player.connected ? 'ready' : 'offline';
    } else {
      meta.textContent = `T:${player.territoryCount ?? 0} R:${player.reserveArmies ?? 0}`;
    }

    item.append(name, meta);
    ui.playersList.appendChild(item);
  }
}

function renderLogs() {
  ui.logList.innerHTML = '';

  const logs = state.snapshot?.game?.logs ?? [];
  if (!logs.length) {
    const item = document.createElement('li');
    item.textContent = 'No battle logs yet.';
    ui.logList.appendChild(item);
    return;
  }

  for (const entry of logs.slice(0, 20)) {
    const item = document.createElement('li');
    item.textContent = entry.text;
    ui.logList.appendChild(item);
  }
}

function selectionText() {
  const fromName = state.selection.fromTerritoryId ? territoryName(state.selection.fromTerritoryId) : '-';
  const toName = state.selection.toTerritoryId ? territoryName(state.selection.toTerritoryId) : '-';
  return `From: ${fromName} | To: ${toName}`;
}

function renderTurn() {
  if (!state.snapshot) {
    ui.turnSummary.textContent = 'Waiting for state sync...';
    ui.objectiveText.textContent = 'Objective: hidden.';
    return;
  }

  if (state.snapshot.status === 'LOBBY') {
    ui.turnSummary.textContent = `Lobby (${state.snapshot.players.length} players). Need at least 3 to start.`;
    ui.objectiveText.textContent = 'Objective: assigned when game starts.';
    return;
  }

  const game = state.snapshot.game;
  const current = state.snapshot.players.find((player) => player.id === game.currentPlayerId);
  ui.turnSummary.textContent = `Round ${game.round} | ${game.phase} | Current: ${current?.name ?? 'Unknown'}`;

  const me = getSelfPlayerView();
  ui.objectiveText.textContent = me?.objectiveText
    ? `Objective: ${me.objectiveText}`
    : 'Objective: hidden.';

  if (game.status === 'FINISHED') {
    const winner = state.snapshot.players.find((player) => player.id === game.winnerPlayerId);
    setStatus(`Game finished. Winner: ${winner?.name ?? 'Unknown'}.`, 'success');
  }
}

function renderControls() {
  const snapshot = state.snapshot;
  const game = snapshot?.game;
  const me = getSelfPlayerView();
  const myTurn = isMyTurn();

  ui.selectionSummary.textContent = selectionText();

  const inLobby = snapshot?.status === 'LOBBY';
  const playerCount = snapshot?.players?.length ?? 0;
  const isHost = snapshot?.hostPlayerId === snapshot?.youPlayerId;
  const canStart = inLobby && isHost && playerCount >= 3;
  ui.startButton.disabled = !canStart;
  if (!inLobby) {
    ui.startButton.title = 'Game already started.';
  } else if (!isHost) {
    ui.startButton.title = 'Only the room host can start the game.';
  } else if (playerCount < 3) {
    ui.startButton.title = 'At least 3 players are required.';
  } else {
    ui.startButton.title = 'Start game';
  }

  const canAttack =
    Boolean(myTurn && game?.phase === 'ATTACK' && state.selection.fromTerritoryId && state.selection.toTerritoryId);
  ui.attackButton.disabled = !canAttack;

  const canEndAttack = Boolean(myTurn && game?.phase === 'ATTACK');
  ui.endAttackButton.disabled = !canEndAttack;

  const canFortify =
    Boolean(myTurn && game?.phase === 'FORTIFY' && state.selection.fromTerritoryId && state.selection.toTerritoryId);
  ui.fortifyButton.disabled = !canFortify;

  const canEndTurn =
    Boolean(
      myTurn &&
      game &&
      game.status === 'IN_PROGRESS' &&
      (game.phase === 'ATTACK' || game.phase === 'FORTIFY' || (game.phase === 'REINFORCE' && (me?.reserveArmies ?? 0) < 1))
    );
  ui.endTurnButton.disabled = !canEndTurn;
}

function render() {
  const currentPhase = state.snapshot?.game?.phase ?? null;
  if (currentPhase !== state.lastPhase) {
    clearSelection();
    state.lastPhase = currentPhase;
  }

  renderTurn();
  renderControls();
  renderPlayers();
  renderLogs();
  drawBoard();
}

async function setupMap() {
  try {
    const response = await fetch('/rulesets/war-classic-02000/map.json');
    if (!response.ok) {
      throw new Error('Could not load map data.');
    }

    state.mapData = await response.json();
    state.territoryIndex = new Map(state.mapData.territories.map((territory) => [territory.id, territory]));
    render();
  } catch {
    setStatus('Failed to preload map. It will sync after joining a room.', 'error');
  }
}

function setupSocket() {
  state.socket = io();

  state.socket.on('connect', () => {
    void refreshPublicRooms();

    if (state.pendingReconnect && state.session && !state.reconnectInFlight) {
      state.reconnectInFlight = true;
      setStatus(`Reconnecting to room ${state.session.roomId}...`, 'info');
      void joinRoom({
        playerName: state.session.playerName,
        roomId: state.session.roomId,
        playerId: state.session.playerId,
        reconnect: true
      });
      return;
    }

    if (state.autoJoinConfig && !state.autoJoinAttempted && !state.joined) {
      state.autoJoinAttempted = true;
      setStatus(`Auto-joining room ${state.autoJoinConfig.roomId}...`, 'info');
      void joinRoom({
        playerName: state.autoJoinConfig.playerName,
        roomId: state.autoJoinConfig.roomId,
        isPublic: state.autoJoinConfig.isPublic
      });
      return;
    }

    setStatus('Connected to BRisk server.', 'success');
  });

  state.socket.on('disconnect', () => {
    if (state.joined && state.session) {
      state.pendingReconnect = true;
    }
    setStatus('Disconnected from server. Reconnecting...', 'error');
  });

  state.socket.on('rooms:public', (rooms) => {
    state.publicRooms = normalizePublicRoomList(rooms);
    renderPublicRooms();
  });

  state.socket.on('app:error', (payload) => {
    setStatus(payload?.message ?? 'Unknown application error.', 'error');
  });

  state.socket.on('state:update', (snapshot) => {
    state.snapshot = snapshot;

    if (!state.mapData && snapshot?.map?.territories) {
      state.mapData = snapshot.map;
      state.territoryIndex = new Map(snapshot.map.territories.map((territory) => [territory.id, territory]));
    }

    if (snapshot.status === 'LOBBY') {
      const isHost = snapshot.hostPlayerId === snapshot.youPlayerId;
      const playerCount = snapshot.players?.length ?? 0;
      if (isHost && playerCount >= 3) {
        setStatus(`Room ${snapshot.roomId} ready. You are host, start when ready.`, 'success');
      } else if (isHost) {
        setStatus(`Room ${snapshot.roomId} ready. Need ${3 - playerCount} more player(s).`, 'info');
      } else {
        setStatus(`Room ${snapshot.roomId} ready. Waiting for host to start.`, 'success');
      }

      if (
        state.autoJoinConfig?.autoHostStart &&
        !state.autoHostStartTriggered &&
        isHost &&
        playerCount >= 3
      ) {
        state.autoHostStartTriggered = true;
        state.socket.emit('game:start', {}, (response) => {
          if (!response?.ok) {
            state.autoHostStartTriggered = false;
            setStatus(response?.error ?? 'Auto-start failed.', 'error');
            return;
          }
          setStatus('Game auto-started.', 'success');
          clearSelection();
        });
      }
    } else if (snapshot.status === 'IN_PROGRESS') {
      const me = snapshot.players.find((player) => player.id === snapshot.youPlayerId);
      const turnText = snapshot.game.currentPlayerId === snapshot.youPlayerId ? 'Your turn.' : 'Opponent turn.';
      setStatus(`Room ${snapshot.roomId} | ${turnText} Reserve: ${me?.reserveArmies ?? 0}.`, 'info');
    } else if (snapshot.status === 'FINISHED') {
      const winner = snapshot.players.find((player) => player.id === snapshot.game.winnerPlayerId);
      setStatus(`Room ${snapshot.roomId} finished. Winner: ${winner?.name ?? 'Unknown'}.`, 'success');
    }

    render();
  });
}

function setupActions() {
  ui.joinForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerName = ui.playerNameInput.value.trim();
    const roomId = ui.roomIdInput.value.trim().toUpperCase();
    const isPublic = ui.roomPublicInput.checked;

    if (!playerName || !roomId) {
      setStatus('Please provide player name and room code.', 'error');
      return;
    }

    void joinRoom({ playerName, roomId, isPublic });
  });

  ui.roomsRefreshButton.addEventListener('click', () => {
    void refreshPublicRooms();
  });

  ui.startButton.addEventListener('click', () => {
    state.socket.emit('game:start', {}, (response) => {
      if (!response?.ok) {
        setStatus(response?.error ?? 'Failed to start game.', 'error');
        return;
      }
      setStatus('Game started.', 'success');
      clearSelection();
    });
  });

  ui.attackButton.addEventListener('click', async () => {
    if (!state.selection.fromTerritoryId || !state.selection.toTerritoryId) {
      setStatus('Select attack origin and target first.', 'error');
      return;
    }

    const ok = await sendGameAction({
      type: 'ATTACK',
      payload: {
        fromTerritoryId: state.selection.fromTerritoryId,
        toTerritoryId: state.selection.toTerritoryId,
        attackDice: Number(ui.attackDice.value)
      }
    });

    if (ok) {
      state.selection.toTerritoryId = null;
      setStatus('Attack resolved.', 'success');
    }
  });

  ui.endAttackButton.addEventListener('click', async () => {
    const ok = await sendGameAction({ type: 'END_ATTACK_PHASE', payload: {} });
    if (ok) {
      clearSelection();
      setStatus('Attack phase ended.', 'success');
    }
  });

  ui.fortifyButton.addEventListener('click', async () => {
    const armies = Number(ui.fortifyArmies.value);
    if (!Number.isInteger(armies) || armies < 1) {
      setStatus('Fortify armies must be a positive integer.', 'error');
      return;
    }

    const ok = await sendGameAction({
      type: 'FORTIFY',
      payload: {
        fromTerritoryId: state.selection.fromTerritoryId,
        toTerritoryId: state.selection.toTerritoryId,
        armies
      }
    });

    if (ok) {
      clearSelection();
      setStatus('Fortify move applied.', 'success');
    }
  });

  ui.endTurnButton.addEventListener('click', async () => {
    const ok = await sendGameAction({ type: 'END_TURN', payload: {} });
    if (ok) {
      clearSelection();
      setStatus('Turn ended.', 'success');
    }
  });
}

async function bootstrap() {
  seedJoinFormFromAutoJoin();
  renderPublicRooms();
  await refreshPublicRooms();
  setInterval(() => {
    void refreshPublicRooms();
  }, 12000);

  await setupMap();
  setupSocket();
  setupActions();
  render();
}

bootstrap();
