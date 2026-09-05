const state = {
  score: 0,
  coins: 0,
  active: false,
  player: {
    x: 50, y: 200, w: 24, h: 32, vx: 5.0, vy: 0, grounded: false, element: null
  },
  cameraX: 0,
  solids: [],
  coinsList: [],
  lastGenX: 0,
  keys: {},
  loopId: null,
  hiScore: parseInt(localStorage.getItem('dom_runner_hi_score')) || 0
};

window.onkeydown = (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) e.preventDefault();
  state.keys[e.code] = true;
};

window.onkeyup = (e) => state.keys[e.code] = false;

const resize = () => {
  const scale = Math.min(window.innerWidth / 800, window.innerHeight / 400);
  document.documentElement.style.setProperty('--scale', scale);
};

const start = () => {
  if (document.activeElement) document.activeElement.blur();
  state.active = true;
  state.score = state.coins = 0;
  updateHUD();
  document.getElementById('hud').classList.remove('hidden');
  ['start-screen', 'game-over-screen'].forEach(s => showScreen(s, false));
  respawn();
  cancelAnimationFrame(state.loopId);
  state.loopId = requestAnimationFrame(() => loop());
};

const updateHUD = () => {
  if (state.score > state.hiScore) state.hiScore = state.score;
  document.getElementById('score-val').textContent = state.score;
  document.getElementById('coins-val').textContent = state.coins;
  document.getElementById('hi-score-val').textContent = state.hiScore;
};

const showScreen = (id, act) => {
  const ei = document.getElementById(id);
  ei.classList.toggle('hidden', !act);
  ei.classList.toggle('active', act);
};

const respawn = () => {
  document.getElementById('game-world').innerHTML = '';
  state.solids = [];
  state.coinsList = [];
  state.player.element = spawn('player', 50, 200, state.player.w, state.player.h);
  state.player.x = 50;
  state.player.y = 200;
  state.player.vy = 0;
  state.player.grounded = false;
  state.lastGenX = 0;

  for (let i = 0; i < 3; i++) {
    generateChunk(state.lastGenX, state.lastGenX + 480);
    state.lastGenX += 480;
  }

  state.cameraX = 0;
  document.getElementById('game-world').style.transform = `translateX(0px)`;
};

const spawn = (type, x, y, w, h, cls = []) => {
  const el = document.createElement('div');

  el.className = `entity ${type} ` + cls.join(' ');

  Object.assign(el.style, {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`
  });
  document.getElementById('game-world').appendChild(el);
  return el;
};

const generateChunk = (startX, endX) => {
  const heights = [220, 252, 284, 316, 348];
  const chunkY = heights[Math.floor(Math.random() * heights.length)];
  const hasGap = startX > 200 && Math.random() > 0.5;
  const gapStart = 4 + Math.floor(Math.random() * 3);
  const gapEnd = gapStart + 4; // 4 blocks wide

  for (let i = 0; i < 15; i++) {
    if (hasGap && i >= gapStart && i < gapEnd) continue;
    const x = startX + i * 32;
    const h = 400 - chunkY;

    state.solids.push({
      x, y: chunkY, w: 32, h, element: spawn('tile', x, chunkY, 32, h, ['ground']), type: 'ground'
    });
  }

  const seed = Math.sin(startX);

  if (seed > 0.4) {
    const bx = startX + 96;

    [0, 32, 64].forEach((ox, i) => {
      const type = i === 1 ? 'question' : 'brick';
      const el = spawn('tile', bx + ox, chunkY - 100, 32, 32, [type]);
      if (type === 'question') el.textContent = '?';

      state.solids.push({
        x: bx + ox, y: chunkY - 100, w: 32, h: 32, element: el, type, reward: true
      });
    });
  } else if (seed < -0.4) {
    [64, 96, 128].forEach(ox => state.coinsList.push({
      x: startX + ox, y: chunkY - 140, w: 16, h: 16, element: spawn('coin', startX + ox, chunkY - 140, 16, 16)
    }));
  }
};

const loop = () => {
  if (!state.active) return;
  update();
  state.loopId = requestAnimationFrame(() => loop());
};

const update = () => {
  state.player.x += state.player.vx;
  checkCollisions('x');

  if ((state.keys['ArrowUp'] || state.keys['KeyW'] || state.keys['Space']) && state.player.grounded) {
    state.player.vy = -8.5;
    state.player.grounded = false;
  }

  state.player.vy = Math.min(state.player.vy + 0.22, 6);
  state.player.y += state.player.vy;
  state.player.grounded = false;
  checkCollisions('y');

  state.player.element.style.left = `${state.player.x}px`;
  state.player.element.style.top = `${state.player.y}px`;
  state.score += 1;
  updateHUD();

  state.cameraX = state.player.x - 100;

  document.getElementById('game-world').style.transform = `translateX(-${state.cameraX}px)`;

  if (state.player.y > 400) die();

  if (state.player.x + 800 > state.lastGenX) {
    generateChunk(state.lastGenX, state.lastGenX + 480);
    state.lastGenX += 480;
    cleanup();
  }

  updateEntities();
};

const checkCollisions = (dir) => {
  state.solids.forEach(s => {
    if (rectCollide(state.player, s)) {
      if (dir === 'x') {
        state.player.x = state.player.vx > 0 ? s.x - state.player.w : s.x + s.w;
      } else {
        if (state.player.vy > 0) {
          state.player.y = s.y - state.player.h;
          state.player.vy = 0;
          state.player.grounded = true;
        }

        if (state.player.vy < 0) {
          state.player.y = s.y + s.h;
          state.player.vy = 0;

          if (s.type === 'question' && s.reward) {
            s.reward = false;
            s.element.className = 'entity tile empty-block';
            s.element.textContent = '';
            state.score += 200;
            state.coins++;
            updateHUD();
          }
        }
      }
    }
  });
};

const rectCollide = (r1, r2) => r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;

const die = () => {
  state.active = false;

  if (state.score > state.hiScore) {
    state.hiScore = state.score;
    localStorage.setItem('dom_runner_hi_score', state.hiScore);
  }

  document.getElementById('final-score').textContent = state.score;
  document.getElementById('high-score').textContent = state.hiScore;
  updateHUD();
  document.getElementById('hud').classList.add('hidden');
  showScreen('game-over-screen', true);
};

const cleanup = () => {
  const limit = state.cameraX - 200;
  state.solids = state.solids.filter(s => s.x + s.w >= limit || (s.element.remove(), false));
  state.coinsList = state.coinsList.filter(c => c.x + c.w >= limit || (c.element.remove(), false));
};

const updateEntities = () => {
  state.coinsList.forEach((c, i) => {
    if (rectCollide(state.player, c)) {
      c.element.remove();
      state.coinsList.splice(i, 1);
      state.score += 100;
      state.coins++;
      updateHUD();
    }
  });
};

// Event bindings moved down here after function definitions
document.getElementById('start-btn').onclick = start;
document.getElementById('restart-btn').onclick = start;

window.onresize = resize;
window.onload = resize;
