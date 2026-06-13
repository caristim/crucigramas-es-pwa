/* ========= Util ========= */
const normalizeLetter = (s) => {
  if (!s) return '';
  return s.toUpperCase();
};

function isEditableChar(ch) {
  return /^[A-ZÁÉÍÓÚÜÑ]$/.test(ch);
}

/* ========= Generador de Sonidos de Sintetizador Nativo ========= */
function playBeep(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      // Pitido alegre ascendente rápido
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Nota Re5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // Nota La5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'error') {
      // Sonido de error grave sordo
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130.81, ctx.currentTime); // Nota Do3
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.log("AudioContext bloqueado o no soportado hasta interacción.");
  }
}

/* ========= Estado ========= */
let cw = null; 
let state = {
  active: null, 
  dirPreferred: 'across', 
  checkMode: false
};

const els = {
  board: document.getElementById('board'),
  cwSelect: document.getElementById('cwSelect'),
  dirText: document.getElementById('dirText'),
  entryText: document.getElementById('entryText'),
  cluesAcross: document.getElementById('cluesAcross'),
  cluesDown: document.getElementById('cluesDown'),
  checkBtn: document.getElementById('checkBtn'),
  clearBtn: document.getElementById('clearBtn'),
  hiddenInput: document.getElementById('hiddenInput')
};

/* ========= Loader ========= */
async function loadIndex() {
  const res = await fetch('./data/index.json');
  if (!res.ok) throw new Error('No se pudo cargar ./data/index.json');
  return res.json();
}

async function loadCrossword(file) {
  const res = await fetch(`./data/crosswords/${file}`);
  if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
  return res.json();
}

/* ========= Modelado del tablero ========= */
function buildCellIndex(cw) {
  const { rows, cols } = cw.size;
  const cell = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      r, c,
      isBlock: cw.grid[r][c] === '#',
      number: null,
      solution: null, 
      clueNumberAcross: null,
      clueNumberDown: null,
      belongs: { across: null, down: null }, 
      user: ''
    }))
  );

  const across = cw.entries?.across ?? [];
  const down = cw.entries?.down ?? [];

  for (const e of across) {
    const { number, row, col, answer } = e;
    for (let i = 0; i < answer.length; i++) {
      const rr = row;
      const cc = col + i;
      if (!cell[rr] || !cell[rr][cc] || cell[rr][cc].isBlock) continue;
      if (cell[rr][cc].solution == null) cell[rr][cc].solution = answer[i];
      cell[rr][cc].belongs.across = { entryNumber: number, index: i };
      if (i === 0) cell[rr][cc].clueNumberAcross = number;
    }
  }

  for (const e of down) {
    const { number, row, col, answer } = e;
    for (let i = 0; i < answer.length; i++) {
      const rr = row + i;
      const cc = col;
      if (!cell[rr] || !cell[rr][cc] || cell[rr][cc].isBlock) continue;
      if (cell[rr][cc].solution == null) cell[rr][cc].solution = answer[i];
      cell[rr][cc].belongs.down = { entryNumber: number, index: i };
      if (i === 0) cell[rr][cc].clueNumberDown = number;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = cell[r][c].clueNumberAcross;
      const d = cell[r][c].clueNumberDown;
      if (a != null || d != null) cell[r][c].number = a ?? d;
    }
  }

  return cell;
}

/* ========= Render ========= */
let cellIndex = null; 

function renderBoard() {
  const { rows, cols } = cw.size;
  els.board.innerHTML = '';
  els.board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cellIndex[r][c];
      const div = document.createElement('div');
      div.className = 'cell' + (cell.isBlock ? ' block' : ' editable');

      if (!cell.isBlock) {
        div.dataset.r = r;
        div.dataset.c = c;

        if (cell.number != null) {
          const num = document.createElement('div');
          num.className = 'num';
          num.textContent = String(cell.number);
          div.appendChild(num);
        }

        const ch = document.createElement('div');
        ch.className = 'ch';
        ch.textContent = cell.user || '';
        div.appendChild(ch);

        div.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          selectCell(r, c);
          if(els.hiddenInput) {
            els.hiddenInput.value = '';
            els.hiddenInput.focus();
          }
        });
      }

      els.board.appendChild(div);
    }
  }

  applyCheckVisuals();
  updateActiveInfo();
}

function updateCellDom(r, c) {
  const selector = `.cell[data-r="${r}"][data-c="${c}"] .ch`;
  const target = els.board.querySelector(selector);
  if (target) target.textContent = cellIndex[r][c].user || '';
}

/* ========= Selección ========= */
function cellToPossibleDirs(r, c) {
  if (!cellIndex[r] || !cellIndex[r][c]) return [];
  const cell = cellIndex[r][c];
  if (cell.isBlock) return [];
  const dirs = [];
  if (cell.belongs.across) dirs.push('across');
  if (cell.belongs.down) dirs.push('down');
  return dirs;
}

function selectCell(r, c) {
  if (!cellIndex[r] || !cellIndex[r][c]) return;
  const cell = cellIndex[r][c];
  if (cell.isBlock) return;

  const possible = cellToPossibleDirs(r, c);
  if (possible.length === 0) return;

  let dir;
  if (possible.length === 1) dir = possible[0];
  else {
    dir = state.dirPreferred;
    if (!possible.includes(dir)) dir = possible[0];
  }

  state.active = getActiveEntryFromCell(r, c, dir);
  state.dirPreferred = dir; 
  updateActiveInfo();
  renderActiveHighlight();
}

function getActiveEntryFromCell(r, c, dir) {
  const cell = cellIndex[r][c];
  const entry = dir === 'across' ? cell.belongs.across : cell.belongs.down;
  return {
    r, c,
    dir,
    entryNumber: entry.entryNumber,
    indexInEntry: entry.index
  };
}

function renderActiveHighlight() {
  els.board.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
  if (!state.active) return;

  const { r, c } = state.active;
  const target = els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (target) target.classList.add('selected');
}

/* ========= Navegación ========= */
function getNextEditableCell(r, c, dir, delta) {
  if (!cellIndex[r] || !cellIndex[r][c]) return null;
  const cell = cellIndex[r][c];
  const belongs = dir === 'across' ? cell.belongs.across : cell.belongs.down;
  if (!belongs) return null;

  const nextIndex = belongs.index + delta;
  const start = findEntryStart(dir, belongs.entryNumber);
  if (!start) return null;

  if (dir === 'across') {
    const rr = start.row;
    const cc = start.col + nextIndex;
    if (cc < 0 || cc >= cw.size.cols) return null;
    return { r: rr, c: cc };
  } else {
    const rr = start.row + nextIndex;
    const cc = start.col;
    if (rr < 0 || rr >= cw.size.rows) return null;
    return { r: rr, c: cc };
  }
}

function findEntryStart(dir, entryNumber) {
  const list = dir === 'across' ? (cw.entries?.across ?? []) : (cw.entries?.down ?? []);
  return list.find(e => e.number === entryNumber) ?? null;
}

function moveWithinActive(delta) {
  if (!state.active) return;
  const { r, c, dir } = state.active;

  const next = getNextEditableCell(r, c, dir, delta);
  if (!next) return false;

  selectCell(next.r, next.c);
  return true;
}

/* ========= Validación de palabra en tiempo real ========= */
function checkCurrentWord() {
  if (!state.active) return;
  const { dir, entryNumber } = state.active;
  const start = findEntryStart(dir, entryNumber);
  if (!start) return;

  const len = start.answer.length;
  let wordCells = [];
  let complete = true;

  // Almacenamos todas las celdas físicas de esta palabra específica
  for (let i = 0; i < len; i++) {
    const rr = dir === 'across' ? start.row : start.row + i;
    const cc = dir === 'across' ? start.col + i : start.col;
    const cell = cellIndex[rr][cc];
    wordCells.push(cell);
    if (!cell.user) complete = false; // Falta alguna letra por rellenar
  }

  // Si la palabra está completamente escrita por el usuario, la evaluamos de inmediato
  if (complete) {
    let wordIsCorrect = true;
    for (let i = 0; i < len; i++) {
      if (wordCells[i].user !== start.answer[i]) {
        wordIsCorrect = false;
        break;
      }
    }

    // Disparar efectos y sonidos de respuesta
    if (wordIsCorrect) {
      playBeep('success');
    } else {
      playBeep('error');
    }

    // Forzamos actualización visual inmediata para este grupo de celdas
    for (let i = 0; i < len; i++) {
      const rr = dir === 'across' ? start.row : start.row + i;
      const cc = dir === 'across' ? start.col + i : start.col;
      const div = els.board.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"]`);
      if (div) {
        div.classList.remove('correct', 'wrong');
        div.classList.add(wordIsCorrect ? 'correct' : 'wrong');
      }
    }
  }
}

/* ========= Input ========= */
function setCharAtActive(ch) {
  if (!state.active) return;
  const { r, c } = state.active;
  const cell = cellIndex[r][c];
  if (cell.isBlock) return;

  cell.user = ch;
  updateCellDom(r, c);

  // Comprobar la palabra antes de saltar a la siguiente celda
  checkCurrentWord();

  const moved = moveWithinActive(+1);
  // Si ya no se pudo mover adelante porque terminó el tablero/palabra, re-evaluamos visuals generales
  if (!moved && state.checkMode) applyCheckVisuals();
}

function clearAtActive() {
  if (!state.active) return;
  const { r, c } = state.active;
  const cell = cellIndex[r][c];
  if (cell.isBlock) return;

  // Al borrar, removemos los estados de acierto/error de esta celda
  cell.user = '';
  updateCellDom(r, c);
  
  const div = els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (div) div.classList.remove('correct', 'wrong');

  if (state.checkMode) applyCheckVisuals();
}

/* ========= Comprobación Global Manual ========= */
function applyCheckVisuals() {
  els.board.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('wrong', 'correct');
  });

  const { rows, cols } = cw.size;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cellIndex[r][c];
      if (cell.isBlock || !cell.user || !cell.solution) continue;

      const div = els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      if (!div) continue;

      if (cell.user === cell.solution) {
        div.classList.add('correct');
      } else {
        div.classList.add('wrong');
      }
    }
  }
}

function updateActiveInfo() {
  if (!state.active) {
    els.dirText.textContent = '—';
    els.entryText.textContent = '—';
    return;
  }
  const { dir, entryNumber, indexInEntry } = state.active;
  els.dirText.textContent = dir === 'across' ? 'Horizontal' : 'Vertical';
  els.entryText.textContent = `${entryNumber} (letra ${indexInEntry + 1})`;
}

/* ========= Pistas ========= */
function renderClues() {
  const across = cw.entries?.across ?? [];
  const down = cw.entries?.down ?? [];

  els.cluesAcross.innerHTML = '';
  els.cluesDown.innerHTML = '';

  const renderList = (container, list) => {
    const frag = document.createDocumentFragment();
    for (const e of list) {
      const item = document.createElement('div');
      item.className = 'clueItem';
      item.innerHTML = `<span class="n">${e.number}.</span><span class="t">${escapeHtml(e.clue ?? '')}</span>`;
      frag.appendChild(item);
    }
    container.appendChild(frag);
  };

  renderList(els.cluesAcross, across);
  renderList(els.cluesDown, down);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

/* ========= Keyboard ========= */
function onKeyDown(ev) {
  if (!cw || !state.active) return;

  const tag = (ev.target?.tagName ?? '').toLowerCase();
  if (tag === 'select' || (tag === 'input' && ev.target.id !== 'hiddenInput') || tag === 'textarea') return;

  const key = ev.key;

  if (key === 'Backspace') {
    ev.preventDefault();
    clearAtActive();
    moveWithinActive(-1); 
    if(els.hiddenInput) els.hiddenInput.value = '';
    return;
  }

  if (key === 'ArrowLeft') { ev.preventDefault(); if (state.active.dir === 'across') moveWithinActive(-1); return; }
  if (key === 'ArrowRight') { ev.preventDefault(); if (state.active.dir === 'across') moveWithinActive(+1); return; }
  if (key === 'ArrowUp') { ev.preventDefault(); if (state.active.dir === 'down') moveWithinActive(-1); return; }
  if (key === 'ArrowDown') { ev.preventDefault(); if (state.active.dir === 'down') moveWithinActive(+1); return; }

  if (key === 'Tab') {
    ev.preventDefault();
    moveWithinActive(ev.shiftKey ? -1 : +1);
    return;
  }

  if (key && key.length === 1) {
    const ch = normalizeLetter(key);
    if (isEditableChar(ch)) {
      ev.preventDefault();
      setCharAtActive(ch);
      if(els.hiddenInput) els.hiddenInput.value = '';
      return;
    }
  }
}

function onHiddenInput(ev) {
  if (!cw || !state.active) return;
  const val = ev.target.value;
  if (!val) return;

  const lastChar = val.substring(val.length - 1);
  const ch = normalizeLetter(lastChar);
  
  if (isEditableChar(ch)) {
    setCharAtActive(ch);
  }
  ev.target.value = '';
}

/* ========= Crucigrama carga ========= */
async function init() {
  const index = await loadIndex();

  els.cwSelect.innerHTML = '';
  for (const item of index) {
    const opt = document.createElement('option');
    opt.value = item.file;
    opt.textContent = item.title;
    els.cwSelect.appendChild(opt);
  }

  const initialFile = index[0]?.file;
  if (initialFile) {
    els.cwSelect.value = initialFile;
    await loadAndStart(initialFile);
  }

  els.cwSelect.addEventListener('change', async () => {
    const file = els.cwSelect.value;
    await loadAndStart(file);
  });

  els.checkBtn.addEventListener('click', () => {
    state.checkMode = !state.checkMode;
    applyCheckVisuals();
    els.checkBtn.textContent = state.checkMode ? 'Ocultar comprobación' : 'Comprobar';
  });

  els.clearBtn.addEventListener('click', () => {
    if (!cw) return;
    const { rows, cols } = cw.size;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!cellIndex[r][c].isBlock) cellIndex[r][c].user = '';
      }
    }
    renderBoard();
  });

  document.addEventListener('keydown', onKeyDown);
  if (els.hiddenInput) {
    els.hiddenInput.addEventListener('input', onHiddenInput);
  }
}

async function loadAndStart(file) {
  try {
    cw = await loadCrossword(file);
    state.active = null;
    state.dirPreferred = 'across';
    state.checkMode = false;
    els.checkBtn.textContent = 'Comprobar';

    cellIndex = buildCellIndex(cw);
    renderClues();
    renderBoard();

    const first = findFirstEditableCell();
    if (first) {
      const possible = cellToPossibleDirs(first.r, first.c);
      if (possible.includes('across')) state.dirPreferred = 'across';
      else if (possible.includes('down')) state.dirPreferred = 'down';
      selectCell(first.r, first.c);
    }
  } catch (err) {
    console.error("Error al cargar el crucigrama:", err);
  }
}

function findFirstEditableCell() {
  const { rows, cols } = cw.size;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cellIndex[r] && cellIndex[r][c] && !cellIndex[r][c].isBlock) return { r, c };
    }
  }
  return null;
}

/* ========= Iniciar ========= */
init().catch(err => {
  console.error(err);
  els.board.innerHTML = '<div style="padding:12px;color:#fecaca">Error al cargar crucigramas.</div>';
});
