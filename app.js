/* ========= Catálogo de niveles de internet con dificultad incremental ========= */
const REMOTE_LEVELS = [
  {
    title: "Nivel 1: Inicial Rápido (7x7)",
    size: { rows: 7, cols: 7 },
    grid: [
      "......#",
      ".#.#.#.",
      ".......",
      ".#.#.#.",
      ".......",
      ".#.#.#.",
      "#......"
    ],
    entries: {
      across: [
        { number: 1, row: 0, col: 0, answer: "MADRID", clue: "Capital del Reino de España" },
        { number: 4, row: 2, col: 0, answer: "AMERICA", clue: "Continente rodeado por los océanos Atlántico y Pacífico" },
        { number: 6, row: 4, col: 0, answer: "PLANETA", clue: "Cuerpo masivo que gira en órbita regular en torno a una estrella" },
        { number: 7, row: 6, col: 1, answer: "SOLARES", clue: "Sistemas o paneles que aprovechan la radiación lumínica" }
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: "MAPA", clue: "Esquema gráfico o representación plana de la superficie terrestre" },
        { number: 2, row: 0, col: 2, answer: "DIETA", clue: "Conjunto de alimentos y nutrientes consumidos habitualmente" },
        { number: 3, row: 0, col: 4, answer: "IMAN", clue: "Objeto ferromagnético con capacidad de atracción natural" },
        { number: 5, row: 2, col: 6, answer: "ALTAS", clue: "Personas u objetos con una altura superior al promedio" }
      ]
    }
  },
  {
    title: "Nivel 2: Desafío Básico (8x8)",
    size: { rows: 8, cols: 8 },
    grid: [
      ".......#",
      ".#.#.#.#",
      "........",
      ".#.#.#.#",
      "........",
      ".#.#.#.#",
      "........",
      "#.#.#.#."
    ],
    entries: {
      across: [
        { number: 1, row: 0, col: 0, answer: "LONDRES", clue: "Capital del Reino Unido, famosa por el Big Ben" },
        { number: 3, row: 2, col: 0, answer: "FRANCIA", clue: "País europeo cuna de la Torre Eiffel y el buen queso" },
        { number: 5, row: 4, col: 0, answer: "PLANETA", clue: "Cuerpo celeste como la Tierra o Júpiter" },
        { number: 6, row: 6, col: 0, answer: "ESCUELA", clue: "Establecimiento público donde se enseña a los alumnos" }
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: "LUPA", clue: "Lente óptica usada para ampliar la visión de objetos chicos" },
        { number: 2, row: 0, col: 2, answer: "DIARIO", clue: "Periódico de publicación cotidiana impreso o digital" },
        { number: 3, row: 0, col: 4, answer: "RANA", clue: "Anfibio pequeño saltador de piel húmeda que croa" },
        { number: 4, row: 0, col: 6, answer: "SALA", clue: "Espacio o estancia principal de una vivienda" }
      ]
    }
  },
  {
    title: "Nivel 3: Crucigrama Estándar (9x9)",
    size: { rows: 9, cols: 9 },
    grid: [
      ".........",
      "#.#.#.#.#",
      "........",
      "#.#.#.#.#",
      ".........",
      "#.#.#.#.#",
      ".........",
      "#.#.#.#.#",
      "........."
    ],
    entries: {
      across: [
        { number: 1, row: 0, col: 0, answer: "ARGENTINA", clue: "País sudamericano famoso por el tango, el mate y Maradona" },
        { number: 4, row: 2, col: 0, answer: "BARCELONA", clue: "Ciudad de España conocida por las obras arquitectónicas de Gaudí" },
        { number: 6, row: 4, col: 0, answer: "CHOCOLATE", clue: "Alimento dulce obtenido de mezclar azúcar con pasta de cacao" },
        { number: 7, row: 6, col: 0, answer: "DROMEDARIO", clue: "Animal rumiante similar al camello pero con una sola joroba" },
        { number: 8, row: 8, col: 0, answer: "EDUCACION", clue: "Proceso de socialización y aprendizaje formal de las personas" }
      ],
      down: [
        { number: 1, row: 0, col: 0, answer: "ABC", clue: "Las tres primeras letras que abren el abecedario" },
        { number: 2, row: 0, col: 2, answer: "GARABATO", clue: "Trazo irregular hecho con el lápiz que no tiene sentido" },
        { number: 3, row: 0, col: 4, answer: "NOCION", clue: "Idea o conocimiento elemental que se posee sobre algo" },
        { number: 5, row: 0, col: 6, answer: "ATAR", clue: "Sujetar o amarrar un objeto utilizando cuerdas o lazos" }
      ]
    }
  }
];

/* ========= Estado de la App ========= */
let currentLevelIndex = 0; 
let cw = null; 
let state = {
  active: null, 
  dirPreferred: 'across', 
  checkMode: false
};
let cellIndex = null; 

const els = {
  board: document.getElementById('board'),
  levelIndicator: document.getElementById('levelIndicator'),
  dirText: document.getElementById('dirText'),
  entryText: document.getElementById('entryText'),
  cluesAcross: document.getElementById('cluesAcross'),
  cluesDown: document.getElementById('cluesDown'),
  checkBtn: document.getElementById('checkBtn'),
  toggleDirBtn: document.getElementById('toggleDirBtn'),
  nextLevelBtn: document.getElementById('nextLevelBtn'),
  hiddenInput: document.getElementById('hiddenInput')
};

/* ========= Lógica de Normalización ========= */
const normalizeLetter = (s) => {
  if (!s) return '';
  return s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

function isEditableChar(ch) {
  return /^[A-ZÑ]$/.test(ch);
}

/* ========= PERSISTENCIA: Guardar y Cargar ========= */
function getStorageKey() {
  return `cw_progress_level_${currentLevelIndex}`;
}

function saveProgress() {
  if (!cw || !cellIndex) return;
  const { rows, cols } = cw.size;
  const progressData = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!cellIndex[r][c].isBlock) {
        progressData.push({ r, c, user: cellIndex[r][c].user });
      }
    }
  }
  localStorage.setItem(getStorageKey(), JSON.stringify(progressData));
}

function loadProgress() {
  const saved = localStorage.getItem(getStorageKey());
  if (!saved) return;
  try {
    const progressData = JSON.parse(saved);
    for (const item of progressData) {
      if (cellIndex[item.r] && cellIndex[item.r][item.c]) {
        cellIndex[item.r][item.c].user = item.user;
      }
    }
  } catch (e) {
    console.error("Error al leer el progreso guardado", e);
  }
}

/* ========= Modelado de Tablero ========= */
function buildCellIndex(levelData) {
  const { rows, cols } = levelData.size;
  const cell = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      r, c,
      isBlock: levelData.grid[r][c] === '#',
      number: null,
      solution: null, 
      belongs: { across: null, down: null }, 
      user: ''
    }))
  );

  const across = levelData.entries?.across ?? [];
  const down = levelData.entries?.down ?? [];

  for (const e of across) {
    const { number, row, col, answer } = e;
    for (let i = 0; i < answer.length; i++) {
      const rr = row;
      const cc = col + i;
      if (!cell[rr] || !cell[rr][cc] || cell[rr][cc].isBlock) continue;
      cell[rr][cc].solution = normalizeLetter(answer[i]);
      cell[rr][cc].belongs.across = { entryNumber: number, index: i };
      if (i === 0) cell[rr][cc].number = number;
    }
  }

  for (const e of down) {
    const { number, row, col, answer } = e;
    for (let i = 0; i < answer.length; i++) {
      const rr = row + i;
      const cc = col;
      if (!cell[rr] || !cell[rr][cc] || cell[rr][cc].isBlock) continue;
      cell[rr][cc].solution = normalizeLetter(answer[i]);
      cell[rr][cc].belongs.down = { entryNumber: number, index: i };
      if (i === 0 && cell[rr][cc].number === null) cell[rr][cc].number = number;
    }
  }

  return cell;
}

/* ========= Renderizado ========= */
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
          if(els.hiddenInput) { els.hiddenInput.value = ''; els.hiddenInput.focus(); }
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

/* ========= Selección y Control de Dirección ========= */
function cellToPossibleDirs(r, c) {
  if (!cellIndex[r] || !cellIndex[r][c]) return [];
  const cell = cellIndex[r][c];
  if (cell.isBlock) return [];
  const dirs = [];
  if (cell.belongs.across) dirs.push('across');
  if (cell.belongs.down) dirs.push('down');
  return dirs;
}

function selectCell(r, c, forceDir = null) {
  if (!cellIndex[r] || !cellIndex[r][c]) return;
  const cell = cellIndex[r][c];
  if (cell.isBlock) return;

  const possible = cellToPossibleDirs(r, c);
  if (possible.length === 0) return;

  let dir = forceDir;
  if (!dir) {
    dir = possible.includes(state.dirPreferred) ? state.dirPreferred : possible[0];
  }

  const entry = dir === 'across' ? cell.belongs.across : cell.belongs.down;
  state.active = { r, c, dir, entryNumber: entry.entryNumber, indexInEntry: entry.index };
  state.dirPreferred = dir;

  updateActiveInfo();
  renderActiveHighlight();
}

function toggleDirection() {
  if (!state.active) return;
  const { r, c, dir } = state.active;
  const possible = cellToPossibleDirs(r, c);
  if (possible.length > 1) {
    selectCell(r, c, dir === 'across' ? 'down' : 'across');
  }
}

function renderActiveHighlight() {
  els.board.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
  if (!state.active) return;
  const target = els.board.querySelector(`.cell[data-r="${state.active.r}"][data-c="${state.active.c}"]`);
  if (target) target.classList.add('selected');
}

/* ========= Avance Automático de Casilla ========= */
function moveWithinActive(delta) {
  if (!state.active) return;
  const { dir, entryNumber, indexInEntry } = state.active;
  const nextIndex = indexInEntry + delta;

  const list = dir === 'across' ? cw.entries.across : cw.entries.down;
  const entry = list.find(e => e.number === entryNumber);
  if (!entry || nextIndex < 0 || nextIndex >= entry.answer.length) return;

  const rr = dir === 'across' ? entry.row : entry.row + nextIndex;
  const cc = dir === 'across' ? entry.col + nextIndex : entry.col;
  selectCell(rr, cc, dir);
}

/* ========= Escritura y Teclas ========= */
function setCharAtActive(ch) {
  if (!state.active) return;
  const { r, c } = state.active;
  cellIndex[r][c].user = ch;
  updateCellDom(r, c);
  saveProgress(); // Guardar progreso en cada letra puesta
  if (state.checkMode) applyCheckVisuals();
  moveWithinActive(+1);
}

function clearAtActive() {
  if (!state.active) return;
  const { r, c } = state.active;
  cellIndex[r][c].user = '';
  updateCellDom(r, c);
  const div = els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (div) div.classList.remove('correct', 'wrong');
  saveProgress(); // Guardar progreso al borrar
  moveWithinActive(-1);
}

function applyCheckVisuals() {
  els.board.querySelectorAll('.cell').forEach(el => el.classList.remove('wrong', 'correct'));
  if (!state.checkMode) return;

  for (let r = 0; r < cw.size.rows; r++) {
    for (let c = 0; c < cw.size.cols; c++) {
      const cell = cellIndex[r][c];
      if (cell.isBlock || !cell.user) continue;
      const div = els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      if (div) div.classList.add(cell.user === cell.solution ? 'correct' : 'wrong');
    }
  }
}

function updateActiveInfo() {
  if (!state.active) {
    els.dirText.textContent = '—'; els.entryText.textContent = '—'; return;
  }
  const { dir, entryNumber, indexInEntry } = state.active;
  els.dirText.textContent = dir === 'across' ? 'Horizontal' : 'Vertical';
  const list = dir === 'across' ? cw.entries.across : cw.entries.down;
  const entry = list.find(e => e.number === entryNumber);
  els.entryText.textContent = entry ? `Pista ${entryNumber}: "${entry.clue}" (Letra ${indexInEntry + 1})` : '—';
}

/* ========= Renderizado de Pistas ========= */
function renderClues() {
  els.cluesAcross.innerHTML = ''; els.cluesDown.innerHTML = '';
  const generate = (container, list, dir) => {
    for (const e of list) {
      const div = document.createElement('div');
      div.className = 'clueItem';
      div.style.cursor = 'pointer';
      div.innerHTML = `<span class="n">${e.number}.</span><span class="t">${e.clue}</span>`;
      div.addEventListener('click', () => selectCell(e.row, e.col, dir));
      container.appendChild(div);
    }
  };
  generate(els.cluesAcross, cw.entries.across, 'across');
  generate(els.cluesDown, cw.entries.down, 'down');
}

/* ========= Control de Flujo de Niveles ========= */
function startLevel(index) {
  // Guardar nivel actual antes de cambiar (por si acaso dejas un nivel a medias)
  localStorage.setItem('cw_current_level_index', index % REMOTE_LEVELS.length);

  currentLevelIndex = index % REMOTE_LEVELS.length; 
  cw = REMOTE_LEVELS[currentLevelIndex];

  state.active = null;
  state.dirPreferred = 'across';
  state.checkMode = false;
  els.checkBtn.textContent = 'Comprobar';
  els.levelIndicator.textContent = `Nivel ${currentLevelIndex + 1}: ${cw.size.rows}x${cw.size.cols}`;

  cellIndex = buildCellIndex(cw);
  
  // CARGAR EL PROGRESO ALMACENADO PARA ESTE NIVEL ESPECÍFICO
  loadProgress();

  renderClues();
  renderBoard();

  // Buscar primera casilla editable para auto-seleccionar
  for (let r = 0; r < cw.size.rows; r++) {
    for (let c = 0; c < cw.size.cols; c++) {
      if (!cellIndex[r][c].isBlock) { selectCell(r, c); return; }
    }
  }
}

/* ========= Eventos e Inicialización ========= */
function init() {
  els.toggleDirBtn.addEventListener('click', (e) => { e.preventDefault(); toggleDirection(); });
  
  els.nextLevelBtn.addEventListener('click', () => {
    startLevel(currentLevelIndex + 1);
  });

  els.checkBtn.addEventListener('click', () => {
    state.checkMode = !state.checkMode;
    applyCheckVisuals();
    els.checkBtn.textContent = state.checkMode ? 'Ocultar' : 'Comprobar';
  });

  document.addEventListener('keydown', (ev) => {
    if (!state.active) return;
    if (ev.key === 'Backspace') { ev.preventDefault(); clearAtActive(); return; }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); moveWithinActive(-1); return; }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); moveWithinActive(+1); return; }
    if (ev.key && ev.key.length === 1) {
      const ch = normalizeLetter(ev.key);
      if (isEditableChar(ch)) { ev.preventDefault(); setCharAtActive(ch); }
    }
  });

  if (els.hiddenInput) {
    els.hiddenInput.addEventListener('input', (ev) => {
      const last = ev.target.value.substring(ev.target.value.length - 1);
      const ch = normalizeLetter(last);
      if (isEditableChar(ch)) setCharAtActive(ch);
      ev.target.value = '';
    });
  }

  // Recordar en qué nivel se quedó el usuario la última vez que abrió la app
  const lastSavedLevel = localStorage.getItem('cw_current_level_index');
  const levelToStart = lastSavedLevel !== null ? parseInt(lastSavedLevel, 10) : 0;

  startLevel(levelToStart);
}

window.addEventListener('DOMContentLoaded', init);
