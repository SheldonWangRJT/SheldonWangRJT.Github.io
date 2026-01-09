(() => {
  /** 512 Merge Snake (letter edition)
   *  - Grid-based snake arena (player + bots)
   *  - Values are levels displayed as A..Z, then AA, BB, ... (repeated-letter levels)
   *  - Eating equal-to-head upgrades head (A + A -> B)
   *  - Eating smaller-than-head stores it as a tail segment
   *  - Adjacent equal tail segments merge into next level
   *  - Combat: head can eat smaller enemy segments (equal/bigger kills you)
   *
   *  NOTE: This is a close “viral mini-game” approximation. If you link the exact game,
   *  we can tune rules (spawn rates, merge behavior, combat rules) quickly.
   */

  const canvas = document.getElementById('g8-canvas');
  const ctx = canvas.getContext('2d');

  const elScore = document.getElementById('g8-score');
  const elMax = document.getElementById('g8-max');
  const elLen = document.getElementById('g8-len');
  const elBots = document.getElementById('g8-bots');
  const elOverlay = document.getElementById('g8-overlay');
  const elOverlayTitle = document.getElementById('g8-overlay-title');
  const elOverlayMsg = document.getElementById('g8-overlay-msg');
  const elRestart = document.getElementById('g8-restart');
  const elNew = document.getElementById('g8-new');
  const elSpeed = document.getElementById('g8-speed');
  const elGrid = document.getElementById('g8-grid');

  const COLORS = {
    bg: 'rgba(0,0,0,0.20)',
    grid: 'rgba(255,255,255,0.06)',
    head: '#77e3ff',
    headText: '#0b1020',
    body: 'rgba(255,255,255,0.10)',
    food: 'rgba(255, 91, 106, 0.20)',
    foodText: 'rgba(255,255,255,0.92)',
    text: 'rgba(255,255,255,0.90)',
    danger: '#ff5b6a'
  };

  // Game parameters (mutable via UI)
  let gridSize = parseInt(elGrid.value, 10); // e.g. 26
  let maxSpeed = parseInt(elSpeed.value, 10); // "max ticks per second" baseline

  // State
  /** Snake model:
   *  {
   *    id: string,
   *    kind: 'player'|'bot',
   *    name: string,
   *    hue: number,
   *    cells: [{x,y}], // occupancy
   *    vals: [number], // same length as cells
   *    dir: {x,y},
   *    nextDir: {x,y},
   *    alive: boolean,
   *    score: number,
   *    maxLevel: number,
   *    speedFactor: number, // 0..1
   *    moveAcc: number // seconds accumulator
   *  }
   */
  let snakes = [];
  let foods = []; // [{x,y,level}]
  let running = true; // player alive + not paused
  let tickCount = 0;

  let lastTs = 0;
  let accumulator = 0;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function isOpposite(a, b) { return a.x === -b.x && a.y === -b.y; }
  function leftTurn(d) { return { x: -d.y, y: d.x }; }
  function rightTurn(d) { return { x: d.y, y: -d.x }; }

  function levelToLabel(level) {
    // 0..25 => A..Z
    // 26..51 => AA..ZZ
    // 52..77 => AAA..ZZZ
    const base = level % 26;
    const reps = Math.floor(level / 26) + 1;
    return String.fromCharCode(65 + base).repeat(reps);
  }

  function keyToDir(key) {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return { x: 0, y: -1 };
      case 'ArrowDown':
      case 's':
      case 'S':
        return { x: 0, y: 1 };
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return { x: -1, y: 0 };
      case 'ArrowRight':
      case 'd':
      case 'D':
        return { x: 1, y: 0 };
      default:
        return null;
    }
  }

  function showOverlay(title, msg) {
    elOverlayTitle.textContent = title;
    elOverlayMsg.textContent = msg;
    elOverlay.classList.remove('hidden');
  }

  function hideOverlay() {
    elOverlay.classList.add('hidden');
  }

  function setStats() {
    const player = snakes.find(s => s.kind === 'player');
    const aliveBots = snakes.filter(s => s.kind === 'bot' && s.alive).length;
    elBots.textContent = String(aliveBots);

    if (!player) return;
    elScore.textContent = String(player.score);
    elMax.textContent = levelToLabel(player.maxLevel);
    elLen.textContent = String(player.cells.length);
  }

  function isOccupied(x, y) {
    for (const s of snakes) {
      if (!s.alive) continue;
      for (const c of s.cells) {
        if (c.x === x && c.y === y) return true;
      }
    }
    return false;
  }

  function findEmptyCell() {
    for (let i = 0; i < 4000; i++) {
      const x = randInt(0, gridSize - 1);
      const y = randInt(0, gridSize - 1);
      if (!isOccupied(x, y) && !foods.some(f => f.x === x && f.y === y)) return { x, y };
    }
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!isOccupied(x, y) && !foods.some(f => f.x === x && f.y === y)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  function pickFoodValue() {
    // DEPRECATED (numeric); keep for compatibility if needed
    return 0;
  }

  function pickFoodLevel() {
    // Mostly A, sometimes B/C/D... also sometimes equal to player's head for progression
    const player = snakes.find(s => s.kind === 'player');
    const headLevel = player ? player.vals[0] : 0;

    // 20%: equal to head (lets you upgrade)
    if (Math.random() < 0.20) return headLevel;

    // Otherwise: weighted toward A
    const maxSpawn = Math.min(headLevel, 6); // A..G range near player progression
    const weights = [];
    for (let lvl = 0; lvl <= maxSpawn; lvl++) {
      // lvl 0 gets most weight, then quickly decays
      weights.push(Math.max(1, Math.round(24 / (lvl + 1))));
    }
    let r = randInt(1, weights.reduce((a, b) => a + b, 0));
    for (let lvl = 0; lvl <= maxSpawn; lvl++) {
      r -= weights[lvl];
      if (r <= 0) return lvl;
    }
    return 0;
  }

  function spawnFoodOne() {
    const pos = findEmptyCell();
    foods.push({ x: pos.x, y: pos.y, level: pickFoodLevel() });
  }

  function refillFoods(targetCount) {
    while (foods.length < targetCount) spawnFoodOne();
  }

  function uid() {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }

  function makeSnake({ kind, name, hue, startX, startY, dir }) {
    const headLevel = 0; // A
    return {
      id: uid(),
      kind,
      name,
      hue,
      cells: [{ x: startX, y: startY }],
      vals: [headLevel],
      dir,
      nextDir: dir,
      alive: true,
      score: 0,
      maxLevel: headLevel,
      speedFactor: 0.1, // default; overridden below
      moveAcc: 0
    };
  }

  function reset() {
    gridSize = parseInt(elGrid.value, 10);
    ticksPerSecond = parseInt(elSpeed.value, 10);
    ticksPerSecond = clamp(ticksPerSecond, 2, 30);

    running = true;
    lastTs = 0;
    accumulator = 0;
    tickCount = 0;
    foods = [];
    snakes = [];

    // Player starts centered
    const px = Math.floor(gridSize / 2) - 1;
    const py = Math.floor(gridSize / 2);
    snakes.push(makeSnake({ kind: 'player', name: 'You', hue: 190, startX: px, startY: py, dir: { x: 1, y: 0 } }));

    // Spawn 5 bots with requested speeds: 10/20/30/40/50% of max
    const botSpeeds = [0.10, 0.20, 0.30, 0.40, 0.50];
    for (let i = 0; i < botSpeeds.length; i++) {
      const p = findEmptyCell();
      const hue = (40 + i * 42) % 360;
      const d = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }][randInt(0, 3)];
      const b = makeSnake({ kind: 'bot', name: `Bot ${i + 1}`, hue, startX: p.x, startY: p.y, dir: d });
      b.speedFactor = botSpeeds[i];
      snakes.push(b);
    }

    // Player default 10% speed
    snakes[0].speedFactor = 0.10;

    refillFoods(18);
    hideOverlay();
    setStats();
    draw();
  }

  function gameOver(reason) {
    running = false;
    showOverlay('Game Over', reason);
  }

  function mergeTail(snake) {
    // Merge pass from tail towards head:
    // If vals[i] === vals[i-1] (adjacent), merge into i-1 (closer to head).
    // Example: [Head.., 8, 8] => [Head.., 16]
    // Repeat until no merges.
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = snake.vals.length - 1; i >= 1; i--) {
        if (snake.vals[i] === snake.vals[i - 1]) {
          snake.vals[i - 1] = snake.vals[i - 1] * 2;
          snake.maxVal = Math.max(snake.maxVal, snake.vals[i - 1]);
          snake.score += snake.vals[i - 1];
          snake.vals.splice(i, 1);
          snake.cells.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
  }

  function killSnake(s, reason) {
    s.alive = false;
    if (s.kind === 'player') {
      running = false;
      showOverlay('Game Over', reason);
    }
  }

  function respawnBot(s) {
    const p = findEmptyCell();
    s.cells = [{ x: p.x, y: p.y }];
    s.vals = [0];
    s.dir = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }][randInt(0, 3)];
    s.nextDir = s.dir;
    s.alive = true;
    s.score = 0;
    s.maxLevel = 0;
    s.moveAcc = 0;
  }

  function getSegmentAt(x, y) {
    for (const s of snakes) {
      if (!s.alive) continue;
      for (let i = 0; i < s.cells.length; i++) {
        const c = s.cells[i];
        if (c.x === x && c.y === y) return { snake: s, index: i };
      }
    }
    return null;
  }

  function takeFoodAt(x, y) {
    const idx = foods.findIndex(f => f.x === x && f.y === y);
    if (idx === -1) return null;
    const v = foods[idx].level;
    foods.splice(idx, 1);
    return v;
  }

  function turnToward(s, desiredDir) {
    if (!desiredDir) return;
    if (isOpposite(desiredDir, s.dir)) return;
    s.nextDir = desiredDir;
  }

  function chooseBotDir(bot) {
    const options = [bot.dir, leftTurn(bot.dir), rightTurn(bot.dir)].filter(d => !isOpposite(d, bot.dir));
    const head = bot.cells[0];
    const headLevel = bot.vals[0];

    // nearest food manhattan distance
    const nearestFoodDist = (x, y) => {
      let best = Infinity;
      for (const f of foods) {
        const d = Math.abs(f.x - x) + Math.abs(f.y - y);
        if (d < best) best = d;
      }
      return best;
    };

    // simple target: chase nearest food, but also "hunt" if it can eat a nearby smaller segment
    let best = { score: -Infinity, dir: bot.dir };
    for (const d of options) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;

      // wall / bounds
      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;

      // collision check
      const seg = getSegmentAt(nx, ny);
      if (seg && seg.snake.id === bot.id) continue; // avoid self

      // base score: closer to food is better
      let s = 0;
      const fd = nearestFoodDist(nx, ny);
      s += (fd === Infinity ? 0 : -fd * 2.0);

      // if cell has food, prefer
      const f = foods.find(ff => ff.x === nx && ff.y === ny);
      if (f) s += 28 + f.level * 2.0;

      // hunting: if can eat a smaller enemy segment
      if (seg && seg.snake.id !== bot.id) {
        const victimLevel = seg.snake.vals[seg.index];
        if (headLevel > victimLevel) {
          s += 70 + victimLevel * 2.0;
        } else {
          s -= 200; // avoid death
        }
      }

      // small randomness to prevent lock-ups
      s += (Math.random() - 0.5) * 3;

      if (s > best.score) best = { score: s, dir: d };
    }

    bot.nextDir = best.dir;
  }

  function snakeStep(s) {
    if (!s.alive) return;

    // bot decision
    if (s.kind === 'bot') chooseBotDir(s);

    // apply buffered direction
    if (!isOpposite(s.nextDir, s.dir)) s.dir = s.nextDir;

    const head = s.cells[0];
    const nx = head.x + s.dir.x;
    const ny = head.y + s.dir.y;

    // wall collision
    if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
      killSnake(s, s.kind === 'player' ? 'You hit the wall.' : 'Bot hit wall');
      return;
    }

    // check collisions with existing segments
    const occupant = getSegmentAt(nx, ny);
    if (occupant) {
      if (occupant.snake.id === s.id) {
        killSnake(s, s.kind === 'player' ? 'You ran into yourself.' : 'Bot self crash');
        return;
      }

      const attackerLevel = s.vals[0];
      const victimLevel = occupant.snake.vals[occupant.index];

      if (attackerLevel > victimLevel) {
        // consume that segment
        const eatenLevel = victimLevel;
        occupant.snake.cells.splice(occupant.index, 1);
        occupant.snake.vals.splice(occupant.index, 1);

        if (occupant.index === 0 || occupant.snake.cells.length === 0) {
          // killed enemy snake
          occupant.snake.alive = false;
          if (occupant.snake.kind === 'bot') {
            // respawn shortly
            setTimeout(() => respawnBot(occupant.snake), 450);
          } else {
            // player eaten by bot
            running = false;
            showOverlay('Game Over', 'A bot ate you.');
          }
        }

        // move + grow by eatenVal
        const oldTailCell = s.cells[s.cells.length - 1];
        s.cells.unshift({ x: nx, y: ny });
        s.vals.unshift(s.vals[0]); // keep head level unless eating-equal upgrades it
        s.cells.pop();
        s.vals.pop();
        s.cells.push(oldTailCell);
        s.vals.push(eatenLevel);
        // reward
        s.score += (eatenLevel + 1);
        s.maxLevel = Math.max(s.maxLevel, attackerLevel);
        mergeTail(s);
        return;
      }

      // equal or bigger => die
      killSnake(s, s.kind === 'player' ? 'You ran into a bigger number.' : 'Bot died to bigger');
      return;
    }

    // normal move
    const oldTailCell = s.cells[s.cells.length - 1];
    s.cells.unshift({ x: nx, y: ny });
    s.vals.unshift(s.vals[0]);
    s.cells.pop();
    s.vals.pop();

    // food?
    const eatenFoodVal = takeFoodAt(nx, ny);
    if (eatenFoodVal != null) {
      const headLevel = s.vals[0];
      const eatenLevel = eatenFoodVal;

      if (eatenLevel === headLevel) {
        // Upgrade head: A + A => B
        s.vals[0] = headLevel + 1;
        s.maxLevel = Math.max(s.maxLevel, s.vals[0]);
        s.score += (s.vals[0] + 1) * 5;
      } else if (eatenLevel < headLevel) {
        // Store into tail as a segment
        s.cells.push(oldTailCell);
        s.vals.push(eatenLevel);
        s.score += (eatenLevel + 1);
        mergeTail(s);
      } else {
        // Food bigger than head: treat as lethal (keeps skill / risk)
        killSnake(s, s.kind === 'player' ? 'You ate a bigger letter.' : 'Bot ate bigger');
        return;
      }
      refillFoods(18);
    }
  }

  function step(dt) {
    if (!running) return;
    tickCount++;

    // Each snake moves based on its own speedFactor relative to maxSpeed.
    // Player default is 10% (slow), bots are 10..50%.
    const order = snakes.slice().sort(() => Math.random() - 0.5);
    for (const s of order) {
      if (!s.alive) continue;
      const sf = clamp(s.speedFactor, 0.05, 1.0);
      const interval = 1 / (Math.max(1, maxSpeed) * sf);
      s.moveAcc += dt;
      // move as many steps as needed (in case of tab switching)
      const maxSteps = 3;
      let steps = 0;
      while (s.moveAcc >= interval && steps < maxSteps) {
        snakeStep(s);
        s.moveAcc -= interval;
        steps++;
        if (!running) break;
      }
    }

    setStats();
  }

  function drawGrid() {
    const cell = canvas.width / gridSize;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < gridSize; i++) {
      const p = Math.floor(i * cell) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
    }
    ctx.stroke();
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function colorForValue(v) {
    // simple palette based on level
    const p = Math.max(1, v + 1);
    const hue = (200 + p * 18) % 360;
    return `hsla(${hue}, 85%, 62%, 0.88)`;
  }

  function drawCell(x, y, fill, text, textColor) {
    const cell = canvas.width / gridSize;
    const pad = cell * 0.10;
    const px = x * cell + pad;
    const py = y * cell + pad;
    const w = cell - pad * 2;
    const h = cell - pad * 2;

    ctx.fillStyle = fill;
    roundedRect(px, py, w, h, Math.max(6, cell * 0.22));
    ctx.fill();

    if (text != null) {
      ctx.fillStyle = textColor || COLORS.text;
      ctx.font = `700 ${Math.max(10, cell * 0.34)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(text), px + w / 2, py + h / 2);
    }
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // foods
    for (const f of foods) {
      drawCell(f.x, f.y, COLORS.food, levelToLabel(f.level), COLORS.foodText);
    }

    // snakes
    for (const sn of snakes) {
      if (!sn.alive) continue;
      for (let i = sn.cells.length - 1; i >= 0; i--) {
        const c = sn.cells[i];
        const level = sn.vals[i];
        const isHead = i === 0;

        if (isHead) {
          // draw directional triangle head so direction is obvious
          const cell = canvas.width / gridSize;
          const pad = cell * 0.10;
          const px = c.x * cell + pad;
          const py = c.y * cell + pad;
          const w = cell - pad * 2;
          const h = cell - pad * 2;

          const fill = (sn.kind === 'player' ? COLORS.head : `hsla(${sn.hue}, 90%, 62%, 0.92)`);
          ctx.fillStyle = fill;
          ctx.beginPath();
          // triangle points based on direction
          const cx = px + w / 2;
          const cy = py + h / 2;
          const r = Math.min(w, h) * 0.52;
          const d = sn.dir;
          // map dir to angle (right=0, down=90, left=180, up=270)
          const ang =
            d.x === 1 ? 0 :
            d.y === 1 ? Math.PI / 2 :
            d.x === -1 ? Math.PI :
            -Math.PI / 2;

          const p1 = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
          const p2 = { x: cx + Math.cos(ang + (2.25)) * r * 0.86, y: cy + Math.sin(ang + (2.25)) * r * 0.86 };
          const p3 = { x: cx + Math.cos(ang - (2.25)) * r * 0.86, y: cy + Math.sin(ang - (2.25)) * r * 0.86 };
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fill();

          // label
          ctx.fillStyle = sn.kind === 'player' ? COLORS.headText : 'rgba(0,0,0,0.86)';
          ctx.font = `800 ${Math.max(10, cell * 0.26)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(levelToLabel(level), cx, cy);
        } else {
          const fill = `hsla(${sn.hue}, 85%, ${48 + Math.min(18, level * 1.4)}%, 0.88)`;
          drawCell(c.x, c.y, fill, levelToLabel(level), 'rgba(0,0,0,0.82)');
        }
      }
    }

    // subtle border
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    accumulator += dt;

    // Use a small fixed simulation tick for stability, but snakes move according to their own accumulators.
    const simTick = 1 / 60;
    while (accumulator >= simTick) {
      step(simTick);
      accumulator -= simTick;
    }

    draw();
    requestAnimationFrame(loop);
  }

  // Keyboard controls: prevent scroll on arrow keys while on the page
  document.addEventListener('keydown', (e) => {
    const d = keyToDir(e.key);
    if (!d) return;
    e.preventDefault();
    const player = snakes.find(s => s.kind === 'player');
    if (!player || !player.alive) return;
    turnToward(player, d);
  }, { passive: false });

  // Touch swipe controls
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, ts: performance.now() };
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    // prevent page scrolling while swiping on the canvas
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!t) return;

    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dist = Math.max(adx, ady);
    if (dist < 24) return; // ignore tiny moves

    const player = snakes.find(s => s.kind === 'player');
    if (!player || !player.alive) return;
    const nd = adx > ady ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 };
    turnToward(player, nd);
  }, { passive: true });

  // Buttons / settings
  elRestart.addEventListener('click', reset);
  elNew.addEventListener('click', reset);
  elSpeed.addEventListener('input', () => {
    maxSpeed = clamp(parseInt(elSpeed.value, 10), 2, 60);
  });
  elGrid.addEventListener('change', reset);

  // Start
  reset();
  requestAnimationFrame(loop);
})();


