/**
 * ============================================================
 * PRODIGY_WD_03 – Tic-Tac-Toe | script.js  (v2 – Redesigned)
 * ============================================================
 */

'use strict';

/* ── 1. DOM References ─────────────────────────────────────── */
const DOM = {
  board:           document.getElementById('board'),
  cells:           Array.from(document.querySelectorAll('.cell')),
  statusText:      document.getElementById('statusText'),
  statusBar:       document.getElementById('statusBar'),
  statusAvatar:    document.getElementById('statusAvatar'),
  startBtn:        document.getElementById('startBtn'),
  resetScoreBtn:   document.getElementById('resetScoreBtn'),
  pvpBtn:          document.getElementById('pvpBtn'),
  pvaiBtn:         document.getElementById('pvaiBtn'),
  easyBtn:         document.getElementById('easyBtn'),
  mediumBtn:       document.getElementById('mediumBtn'),
  hardBtn:         document.getElementById('hardBtn'),
  difficultyRow:   document.getElementById('difficultyRow'),
  playerXName:     document.getElementById('playerXName'),
  playerOName:     document.getElementById('playerOName'),
  scoreX:          document.getElementById('scoreX'),
  scoreO:          document.getElementById('scoreO'),
  scoreDraws:      document.getElementById('scoreDraws'),
  scoreXName:      document.getElementById('scoreXName'),
  scoreOName:      document.getElementById('scoreOName'),
  historyList:     document.getElementById('historyList'),
  soundToggle:     document.getElementById('soundToggle'),    // hidden checkbox
  soundToggleBtn:  document.getElementById('soundToggleBtn'), // icon button in header
  soundOnIcon:     document.getElementById('soundOnIcon'),
  soundOffIcon:    document.getElementById('soundOffIcon'),
  themeToggleBtn:  document.getElementById('themeToggleBtn'),
  sunIcon:         document.getElementById('sunIcon'),
  moonIcon:        document.getElementById('moonIcon'),
  resultOverlay:   document.getElementById('resultOverlay'),
  resultEmoji:     document.getElementById('resultEmoji'),
  resultTitle:     document.getElementById('resultTitle'),
  resultSubtitle:  document.getElementById('resultSubtitle'),
  playAgainBtn:    document.getElementById('playAgainBtn'),
  closeOverlayBtn: document.getElementById('closeOverlayBtn'),
  confettiCanvas:  document.getElementById('confettiCanvas'),
  starsCanvas:     document.getElementById('starsCanvas'),
};

/* ── 2. Constants ──────────────────────────────────────────── */
const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],  // rows
  [0,3,6],[1,4,7],[2,5,8],  // cols
  [0,4,8],[2,4,6],           // diagonals
];
const MAX_HISTORY = 5;

/* ── 3. Game State ─────────────────────────────────────────── */
const state = {
  board:         Array(9).fill(null),
  currentPlayer: 'X',
  gameMode:      'pvp',
  difficulty:    'medium',
  gameActive:    false,
  scores:        { X: 0, O: 0, draws: 0 },
  history:       [],
};

/* ── 4. Star Field ─────────────────────────────────────────── */
(function initStars() {
  const canvas = DOM.starsCanvas;
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  let stars    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    createStars();
  }

  function createStars() {
    stars = Array.from({ length: 140 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.3 + 0.2,
      alpha: Math.random() * 0.6 + 0.15,
      speed: Math.random() * 0.4 + 0.1,
      dir:   Math.random() * 0.3 - 0.15,
    }));
  }

  function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      // Twinkle
      s.alpha += (Math.random() - 0.5) * 0.04;
      s.alpha  = Math.max(0.05, Math.min(0.75, s.alpha));
      // Drift
      s.y -= s.speed;
      s.x += s.dir;
      if (s.y < -2)              s.y = canvas.height + 2;
      if (s.x < -2)              s.x = canvas.width  + 2;
      if (s.x > canvas.width+2)  s.x = -2;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${s.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(drawStars);
  }

  resize();
  window.addEventListener('resize', resize);
  drawStars();
})();

/* ── 5. Audio Engine ───────────────────────────────────────── */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type = 'sine', dur = 0.15, vol = 0.16, attack = 0.01, rel = 0.08) {
  if (!DOM.soundToggle.checked) return;
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.setValueAtTime(vol, now + dur - rel);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  } catch(_) {}
}

const SFX = {
  click()   { playTone(480, 'triangle', 0.1, 0.14); },
  win()     { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.2,0.18,0.01,0.06), i*100)); },
  draw()    { playTone(220,'sawtooth',0.22,0.12); setTimeout(() => playTone(200,'sawtooth',0.22,0.1), 120); },
  invalid() { playTone(140,'square',0.07,0.05); },
  ai()      { playTone(360,'sine',0.1,0.1); },
};

/* ── 6. Utilities ──────────────────────────────────────────── */
function getName(player) {
  if (player === 'X') return DOM.playerXName.value.trim() || 'Player X';
  if (player === 'O') {
    if (state.gameMode === 'pvai') return 'AI';
    return DOM.playerOName.value.trim() || 'Player O';
  }
  return player;
}

function syncNameLabels() {
  DOM.scoreXName.textContent = getName('X');
  DOM.scoreOName.textContent = state.gameMode === 'pvai' ? 'AI 🤖' : getName('O');
}

function bumpScore(el) {
  el.classList.remove('score-bump');
  void el.offsetWidth;
  el.classList.add('score-bump');
  el.addEventListener('animationend', () => el.classList.remove('score-bump'), { once: true });
}

function cloneBoard(board) { return [...board]; }
function emptyCells(board) { return board.reduce((a, v, i) => (v === null ? [...a, i] : a), []); }

/* ── 7. Win / Draw Detection ───────────────────────────────── */
function checkWinner(board, player) {
  for (const combo of WIN_COMBOS) {
    if (combo.every(i => board[i] === player)) return combo;
  }
  return null;
}
function isBoardFull(board) { return board.every(c => c !== null); }

/* ── 8. Minimax Algorithm ──────────────────────────────────────
 * Recursively evaluates every possible game state.
 * Maximiser = AI (O), Minimiser = human (X).
 * Depth penalty makes AI prefer faster wins and slower losses.
 * ──────────────────────────────────────────────────────────── */
function minimax(board, depth, isMax, aiP, humanP) {
  if (checkWinner(board, aiP))    return  10 - depth;
  if (checkWinner(board, humanP)) return  depth - 10;
  if (isBoardFull(board))         return  0;

  const avail = emptyCells(board);

  if (isMax) {
    let best = -Infinity;
    for (const i of avail) {
      board[i] = aiP;
      best = Math.max(best, minimax(board, depth+1, false, aiP, humanP));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of avail) {
      board[i] = humanP;
      best = Math.min(best, minimax(board, depth+1, true, aiP, humanP));
      board[i] = null;
    }
    return best;
  }
}

function bestMove(board, aiP, humanP) {
  let bestScore = -Infinity, bestIdx = -1;
  for (const i of emptyCells(board)) {
    board[i] = aiP;
    const s = minimax(board, 0, false, aiP, humanP);
    board[i] = null;
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }
  return bestIdx;
}

function getAIMove() {
  const avail = emptyCells(state.board);
  if (!avail.length) return -1;

  if (state.difficulty === 'easy')
    return avail[Math.floor(Math.random() * avail.length)];

  if (state.difficulty === 'medium')
    return Math.random() < 0.4
      ? avail[Math.floor(Math.random() * avail.length)]
      : bestMove(cloneBoard(state.board), 'O', 'X');

  return bestMove(cloneBoard(state.board), 'O', 'X');
}

/* ── 9. Render ─────────────────────────────────────────────── */
function renderBoard() {
  DOM.cells.forEach((cell, i) => {
    const mark = state.board[i];
    cell.classList.remove('x-mark', 'o-mark', 'win-cell');
    if (mark === 'X') {
      cell.innerHTML = `<span class="mark-x">✕</span>`;
      cell.classList.add('x-mark');
      cell.disabled = true;
    } else if (mark === 'O') {
      cell.innerHTML = `<span class="mark-o">○</span>`;
      cell.classList.add('o-mark');
      cell.disabled = true;
    } else {
      cell.innerHTML = '';
      cell.disabled = !state.gameActive;
    }
  });
}

function highlightWinCells(combo) {
  combo.forEach(i => DOM.cells[i].classList.add('win-cell'));
}

/* Status bar */
function setStatus(text, mode = '') {
  DOM.statusText.textContent = text;
  DOM.statusBar.className    = 'status-banner' + (mode ? ` ${mode}` : '');

  // Avatar
  const av = DOM.statusAvatar;
  av.className = 'player-avatar';
  if (mode === 'x-active') {
    av.textContent = '✕';
    av.classList.add('x-av');
  } else if (mode === 'o-active') {
    av.textContent = '○';
    av.classList.add('o-av');
  } else if (mode === 'win') {
    av.textContent = '🏆';
    av.classList.add('win-av');
  } else if (mode === 'draw') {
    av.textContent = '🤝';
  } else {
    av.textContent = '🎮';
  }
}

/* ── 10. History ───────────────────────────────────────────── */
function addToHistory(result) {
  state.history.unshift(result);
  if (state.history.length > MAX_HISTORY) state.history.pop();
  saveToStorage();
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    DOM.historyList.innerHTML = '<li class="history-placeholder">No games played yet</li>';
    return;
  }
  DOM.historyList.innerHTML = state.history.map(r => {
    let txt, cls;
    if      (r.winner === 'X') { txt = `${r.xName} Won`;  cls = 'x-w'; }
    else if (r.winner === 'O') { txt = `${r.oName} Won`;  cls = 'o-w'; }
    else                        { txt = 'Draw';            cls = 'dr';  }
    const mode = r.mode === 'pvai' ? '🤖 vs AI' : '👥 PvP';
    return `<li class="history-item">
      <span class="hi-result ${cls}">${txt}</span>
      <span class="hi-mode">${mode}</span>
    </li>`;
  }).join('');
}

/* ── 11. localStorage ──────────────────────────────────────── */
const KEY = 'ttt_v2';

function saveToStorage() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      scores:  state.scores,
      history: state.history,
      theme:   document.documentElement.getAttribute('data-theme'),
      sound:   DOM.soundToggle.checked,
    }));
  } catch(_) {}
}

function loadFromStorage() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return;
    if (d.scores)  { state.scores = { X: d.scores.X||0, O: d.scores.O||0, draws: d.scores.draws||0 }; }
    if (d.history) { state.history = d.history.slice(0, MAX_HISTORY); }
    if (d.theme)   { document.documentElement.setAttribute('data-theme', d.theme); syncThemeIcons(); }
    if (typeof d.sound === 'boolean') {
      DOM.soundToggle.checked = d.sound;
      syncSoundIcons();
    }
  } catch(_) {}
}

function updateScoreDisplay() {
  DOM.scoreX.textContent     = state.scores.X;
  DOM.scoreO.textContent     = state.scores.O;
  DOM.scoreDraws.textContent = state.scores.draws;
  syncNameLabels();
}

/* ── 12. Confetti ──────────────────────────────────────────── */
const Confetti = (() => {
  const canvas = DOM.confettiCanvas;
  const ctx    = canvas.getContext('2d');
  let parts = [], raf = null;
  const COLORS = ['#ff4d6d','#ffba08','#6bcb77','#00d4aa','#a78bfa','#6c5ce7','#ff9ff3','#38bdf8'];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

  function mkPart() {
    return {
      x: Math.random() * canvas.width,
      y: -14,
      vx: (Math.random()-0.5)*5,
      vy: Math.random()*3+2,
      size: Math.random()*9+4,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      rot: Math.random()*Math.PI*2,
      rotV: (Math.random()-0.5)*0.22,
      alpha: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    };
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.07;
      if (p.y > canvas.height * 0.65) p.alpha -= 0.02;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size*0.5, 0, Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size*0.45);
      }
      ctx.restore();
    });
    parts = parts.filter(p => p.alpha > 0);
    if (parts.length) raf = requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    launch(n=150) {
      resize();
      parts = Array.from({length:n}, mkPart);
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = [];
    },
  };
})();

window.addEventListener('resize', () => {
  DOM.confettiCanvas.width  = window.innerWidth;
  DOM.confettiCanvas.height = window.innerHeight;
});

/* ── 13. Result Overlay ────────────────────────────────────── */
function showResult(winner) {
  let emoji, title, sub;
  if (winner === 'draw') {
    emoji = '🤝'; title = "It's a Draw!";
    sub   = 'A perfectly balanced match!';
  } else {
    const n = getName(winner);
    emoji   = (state.gameMode === 'pvai' && winner === 'O') ? '🤖' : '🏆';
    title   = `${n} Wins!`;
    sub     = (state.gameMode === 'pvai' && winner === 'O')
      ? 'The AI is unbeatable — try Hard mode!'
      : 'Absolutely brilliant! Well played! 🎉';
  }
  DOM.resultEmoji.textContent    = emoji;
  DOM.resultTitle.textContent    = title;
  DOM.resultSubtitle.textContent = sub;
  DOM.resultOverlay.classList.remove('hidden');
}

function hideResult() { DOM.resultOverlay.classList.add('hidden'); }

/* ── 14. Core Game Logic ───────────────────────────────────── */
function startGame() {
  Confetti.stop();
  hideResult();
  state.board         = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameActive    = true;
  DOM.board.classList.remove('disabled', 'ai-thinking');
  renderBoard();
  syncNameLabels();
  setStatus(`${getName('X')}'s turn`, 'x-active');
}

function handleCellClick(e) {
  const cell = e.target.closest('.cell');
  if (!cell || !state.gameActive) return;
  const idx = parseInt(cell.dataset.index, 10);
  if (state.board[idx] !== null) { SFX.invalid(); return; }
  makeMove(idx, state.currentPlayer);
}

function makeMove(idx, player) {
  state.board[idx] = player;
  renderBoard();
  SFX.click();

  const winCombo = checkWinner(state.board, player);
  if (winCombo)               endGame(player, winCombo);
  else if (isBoardFull(state.board)) endGame(null);
  else {
    state.currentPlayer = player === 'X' ? 'O' : 'X';
    if (state.gameMode === 'pvai' && state.currentPlayer === 'O') {
      triggerAI();
    } else {
      const cls = state.currentPlayer === 'X' ? 'x-active' : 'o-active';
      setStatus(`${getName(state.currentPlayer)}'s turn`, cls);
    }
  }
}

function triggerAI() {
  state.gameActive = false;
  DOM.board.classList.add('ai-thinking');
  setStatus('AI is thinking…', 'o-active');
  const delay = { easy:350, medium:600, hard:850 }[state.difficulty] || 500;

  setTimeout(() => {
    DOM.board.classList.remove('ai-thinking');
    const idx = getAIMove();
    if (idx === -1) return;
    state.gameActive = true;
    SFX.ai();
    makeMove(idx, 'O');
  }, delay);
}

function endGame(winner, combo = []) {
  state.gameActive = false;
  DOM.board.classList.add('disabled');

  if (winner) {
    highlightWinCells(combo);
    SFX.win();
    state.scores[winner]++;
    bumpScore(winner === 'X' ? DOM.scoreX : DOM.scoreO);
    setStatus(`🎉 ${getName(winner)} wins!`, 'win');
    Confetti.launch(160);
  } else {
    SFX.draw();
    state.scores.draws++;
    bumpScore(DOM.scoreDraws);
    setStatus("🤝 It's a draw!", 'draw');
  }

  updateScoreDisplay();
  addToHistory({ winner, mode: state.gameMode, xName: getName('X'), oName: getName('O') });
  setTimeout(() => showResult(winner ?? 'draw'), 950);
}

/* ── 15. UI Helpers ────────────────────────────────────────── */
function setMode(mode) {
  state.gameMode = mode;
  DOM.pvpBtn.classList.toggle('active', mode === 'pvp');
  DOM.pvaiBtn.classList.toggle('active', mode === 'pvai');
  DOM.pvpBtn.setAttribute('aria-pressed', mode === 'pvp');
  DOM.pvaiBtn.setAttribute('aria-pressed', mode === 'pvai');
  DOM.difficultyRow.classList.toggle('hidden', mode === 'pvp');
  DOM.playerOName.placeholder = mode === 'pvai' ? 'AI (auto)' : 'Enter name';
  DOM.playerOName.disabled    = mode === 'pvai';
  syncNameLabels();
}

function setDifficulty(diff) {
  state.difficulty = diff;
  [DOM.easyBtn, DOM.mediumBtn, DOM.hardBtn].forEach(btn => {
    const match = btn.dataset.diff === diff;
    btn.classList.toggle('active', match);
    btn.setAttribute('aria-pressed', match);
  });
}

/* Theme */
function syncThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  DOM.sunIcon.classList.toggle('hidden',  !isDark);
  DOM.moonIcon.classList.toggle('hidden',  isDark);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  syncThemeIcons();
  saveToStorage();
}

/* Sound button in header */
function syncSoundIcons() {
  const on = DOM.soundToggle.checked;
  DOM.soundOnIcon.classList.toggle('hidden',  !on);
  DOM.soundOffIcon.classList.toggle('hidden',  on);
}

function toggleSound() {
  DOM.soundToggle.checked = !DOM.soundToggle.checked;
  syncSoundIcons();
  saveToStorage();
}

/* Reset scores */
function resetScores() {
  state.scores  = { X:0, O:0, draws:0 };
  state.history = [];
  updateScoreDisplay();
  renderHistory();
  saveToStorage();
  DOM.resetScoreBtn.textContent = '✓ Cleared!';
  setTimeout(() => { DOM.resetScoreBtn.innerHTML = '<span class="btn-icon">↺</span> Reset Scores'; }, 1600);
}

/* ── 16. Event Listeners ───────────────────────────────────── */
(function attachEvents() {
  DOM.board.addEventListener('click', handleCellClick);

  DOM.startBtn.addEventListener('click',      startGame);
  DOM.playAgainBtn.addEventListener('click',  () => { hideResult(); startGame(); });
  DOM.closeOverlayBtn.addEventListener('click', hideResult);

  DOM.resetScoreBtn.addEventListener('click', resetScores);
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);
  DOM.soundToggleBtn.addEventListener('click', toggleSound);

  DOM.pvpBtn.addEventListener('click',  () => setMode('pvp'));
  DOM.pvaiBtn.addEventListener('click', () => setMode('pvai'));

  DOM.easyBtn.addEventListener('click',   () => setDifficulty('easy'));
  DOM.mediumBtn.addEventListener('click', () => setDifficulty('medium'));
  DOM.hardBtn.addEventListener('click',   () => setDifficulty('hard'));

  DOM.playerXName.addEventListener('input', syncNameLabels);
  DOM.playerOName.addEventListener('input', syncNameLabels);

  DOM.resultOverlay.addEventListener('click', e => { if (e.target === DOM.resultOverlay) hideResult(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideResult(); });

  DOM.board.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.closest('.cell')?.click(); }
  });
})();

/* ── 17. Init ──────────────────────────────────────────────── */
(function init() {
  loadFromStorage();
  syncThemeIcons();
  syncSoundIcons();
  updateScoreDisplay();
  renderHistory();
  setMode('pvp');
  setDifficulty('medium');
  renderBoard();
  setStatus('Press ⚡ New Game to start!', '');
  DOM.board.classList.add('disabled');
})();
