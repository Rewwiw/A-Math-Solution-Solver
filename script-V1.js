// ══════════════════════════════════════════════════════════════
// 1. DOM Elements & State Management
// ══════════════════════════════════════════════════════════════

const inputBox = document.querySelector(".show-pawn-input");
const buttons = document.querySelectorAll(".pawn input");
const controlButtons = document.querySelectorAll(".control input");
const lockContainer = document.getElementById("lockContainer");
const seqPreview = document.getElementById("seqPreview");
const addLockBtn = document.getElementById("addLock");
const solutionsContainer = document.getElementById("solutionsContainer");

const mode1Btn = document.getElementById("mode1");
const mode2Btn = document.getElementById("mode2");

let filled = [];
let maxFilled = 9;
let currentTarget = "top";
let mode = "mode1";
let solutions = [];
let shownCount = 0;

// ══════════════════════════════════════════════════════════════
// 2. Tile Point Constants & Helpers
// ══════════════════════════════════════════════════════════════

const TILE_POINTS = {
  '0':1, '1':1, '2':1, '3':1, '4':2, '5':2, '6':2, '7':2, '8':2, '9':2,
  '10':3, '11':4, '12':3, '13':6, '14':4, '15':4, '16':4, '17':6, '18':4, '19':7, '20':5,
  '+':2, '-':2, 'x':2, '÷':2, '+/-':1, 'x/÷':1, '=':1, '?':0
};

const PAD_TILES = [
  {v:'1'},{v:'2'},{v:'3'},{v:'4'},{v:'5'},{v:'+'},
  {v:'6'},{v:'7'},{v:'8'},{v:'9'},{v:'10'},{v:'-'},
  {v:'11'},{v:'12'},{v:'13'},{v:'14'},{v:'15'},{v:'x'},
  {v:'16'},{v:'17'},{v:'18'},{v:'19'},{v:'20'},{v:'÷'},
  {v:'0',span:2},{v:'+/-'},{v:'x/÷'},{v:'?'},{v:'='},
];

function tilePoint(t) {
  return TILE_POINTS[t] !== undefined ? TILE_POINTS[t] : (TILE_POINTS[t.replace('?','')] || 0);
}

// ══════════════════════════════════════════════════════════════
// 3. UI Rendering & Input Interactions
// ══════════════════════════════════════════════════════════════

let lastV1RackTapTime = 0;
let lastV1RackTapIdx = -1;
let v1RackTapTimeout = null;

function render() {
  inputBox.innerHTML = "";
  filled.forEach((v, idx) => {
    const div = document.createElement("div");
    div.className = "pawn-slot";
    div.textContent = v;
    div.title = "Double-tap to remove this tile";

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (lastV1RackTapIdx === idx && (now - lastV1RackTapTime) < 380) {
        // Double tap confirmed -> remove tile
        if (v1RackTapTimeout) clearTimeout(v1RackTapTimeout);
        filled.splice(idx, 1);
        lastV1RackTapIdx = -1;
        lastV1RackTapTime = 0;
        render();
      } else {
        lastV1RackTapIdx = idx;
        lastV1RackTapTime = now;

        inputBox.querySelectorAll(".pawn-slot.tap-pending").forEach(s => s.classList.remove("tap-pending"));
        div.classList.add("tap-pending");

        if (v1RackTapTimeout) clearTimeout(v1RackTapTimeout);
        v1RackTapTimeout = setTimeout(() => {
          div.classList.remove("tap-pending");
          lastV1RackTapIdx = -1;
        }, 380);
      }
    });

    inputBox.appendChild(div);
  });

  // Highlight locked positions on rack preview
  document.querySelectorAll(".lock-pair").forEach(pair => {
    const pos = parseInt(pair.querySelector(".lock-pos").value) - 1;
    const valDiv = pair.querySelector(".lock-val .pawn-slot");
    const val = valDiv ? valDiv.textContent : "";

    if (!isNaN(pos) && val !== "" && filled[pos] == val) {
      const div = inputBox.children[pos];
      if (div) div.classList.add("locked");
    }
  });

  updateSeqPreview();
}

// Sequence Preview Renderer for Mode 2
function updateSeqPreview() {
  if (!seqPreview) return;
  if (mode !== "mode2") {
    seqPreview.style.display = "none";
    return;
  }
  seqPreview.style.display = "flex";
  seqPreview.innerHTML = "";

  const rackCount = filled.length;
  const lockPairs = Array.from(document.querySelectorAll(".lock-pair"));
  const lockCount = lockPairs.length;
  let totalSlots = rackCount + lockCount;

  const lockMap = {};

  lockPairs.forEach(pair => {
    const posInput = pair.querySelector(".lock-pos");
    const valDiv = pair.querySelector(".lock-val .pawn-slot");
    const pos = parseInt(posInput?.value, 10);
    const val = valDiv ? valDiv.textContent.trim() : "";
    if (!isNaN(pos) && pos >= 1) {
      lockMap[pos] = {
        val,
        pair,
        posInput,
        valWrap: pair.querySelector(".lock-val")
      };
      if (pos > totalSlots) totalSlots = pos;
    }
  });

  if (totalSlots <= 0) {
    seqPreview.innerHTML = '<span style="font-size:12px;color:var(--text-muted);font-weight:600;font-style:italic;">Add rack tiles or lock positions to preview sequence</span>';
    return;
  }

  for (let p = 1; p <= totalSlots; p++) {
    const slotWrap = document.createElement("div");
    slotWrap.className = "preview-slot";

    const posLbl = document.createElement("span");
    posLbl.className = "preview-pos-label";
    posLbl.textContent = p;
    slotWrap.appendChild(posLbl);

    const tileBox = document.createElement("div");
    if (lockMap[p]) {
      const item = lockMap[p];
      tileBox.className = "preview-tile-box is-fixed";
      tileBox.title = `Position ${p}: Locked with '${item.val || "empty"}'. Click to edit`;

      const valSpan = document.createElement("span");
      valSpan.className = "val";
      valSpan.textContent = item.val || "?";
      tileBox.appendChild(valSpan);

      if (item.val) {
        const ptSpan = document.createElement("span");
        ptSpan.className = "tile-pt";
        ptSpan.textContent = tilePoint(item.val);
        tileBox.appendChild(ptSpan);
      }

      tileBox.addEventListener("click", () => {
        openLockModal(item.valWrap);
      });
    } else {
      tileBox.className = "preview-tile-box is-empty";
      tileBox.title = `Position ${p}: Free slot. Click to lock`;

      const posNum = document.createElement("span");
      posNum.className = "pos-num";
      posNum.textContent = "+";
      tileBox.appendChild(posNum);

      tileBox.addEventListener("click", () => {
        // Find an unassigned lock or create a new lock pair for position p
        let targetLock = lockPairs.find(pair => {
          const valDiv = pair.querySelector(".lock-val .pawn-slot");
          return !valDiv || !valDiv.textContent.trim();
        });
        if (!targetLock) {
          addLock();
          const allPairs = document.querySelectorAll(".lock-pair");
          targetLock = allPairs[allPairs.length - 1];
        }
        if (targetLock) {
          const posInput = targetLock.querySelector(".lock-pos");
          if (posInput) posInput.value = p;
          const valInput = targetLock.querySelector(".lock-val");
          openLockModal(valInput);
          updateSeqPreview();
        }
      });
    }
    slotWrap.appendChild(tileBox);
    seqPreview.appendChild(slotWrap);
  }
}

// Keypad event listeners
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentTarget === "top") {
      if (filled.length < maxFilled) {
        filled.push(btn.value);
        render();
      } else {
        alert("Rack is full!");
      }
    } else if (currentTarget && typeof currentTarget === "object") {
      currentTarget.innerHTML = "";
      const div = document.createElement("div");
      div.className = "pawn-slot";
      div.textContent = btn.value;
      currentTarget.appendChild(div);
      render();
    }
  });
});

function selectSlotTopPawn() {
  currentTarget = "top";
}

function selectSlotLockPawn(targetDiv) {
  currentTarget = targetDiv;
}

// Control buttons (Back, Clear, Submit)
controlButtons.forEach(ctrl => {
  ctrl.addEventListener("click", () => {
    if (ctrl.value === "Back") {
      filled.pop();
      render();
    } else if (ctrl.value === "Clear") {
      filled = [];
      lockContainer.innerHTML = "";
      solutionsContainer.innerHTML = "";
      solutions = [];
      shownCount = 0;
      render();
    } else if (ctrl.value === "Submit") {
      runAMath();
    }
  });
});

// Mode switcher
mode1Btn.addEventListener("click", () => {
  mode = "mode1";
  mode1Btn.classList.add("active");
  mode2Btn.classList.remove("active");
  addLockBtn.style.display = "none";
  lockContainer.innerHTML = "";
  render();
});

mode2Btn.addEventListener("click", () => {
  mode = "mode2";
  mode2Btn.classList.add("active");
  mode1Btn.classList.remove("active");
  addLockBtn.style.display = "inline-block";
  if (lockContainer.children.length === 0) addLock();
  render();
});

// ══════════════════════════════════════════════════════════════
// 4. Fixed Position Builder (Mode 2)
// ══════════════════════════════════════════════════════════════

function addLock() {
  const pairDiv = document.createElement("div");
  pairDiv.className = "lock-pair";

  const posWrap = document.createElement("div");
  posWrap.className = "lock-field";
  const posLabel = document.createElement("span");
  posLabel.className = "lock-label";
  posLabel.textContent = "Position:";
  const posInput = document.createElement("input");
  posInput.type = "number";
  posInput.min = 1;
  posInput.value = 1;
  posInput.className = "lock-pos";
  posInput.addEventListener("focus", () => {
    const currentLocks = lockContainer.querySelectorAll(".lock-pair").length;
    posInput.max = 9 + currentLocks;
  });
  posInput.addEventListener("input", () => {
    render();
    updateSeqPreview();
  });
  posWrap.appendChild(posLabel);
  posWrap.appendChild(posInput);

  const arrow = document.createElement("span");
  arrow.className = "lock-arrow";
  arrow.innerHTML = "&rarr;";

  const valWrap = document.createElement("div");
  valWrap.className = "lock-field";
  const valLabel = document.createElement("span");
  valLabel.className = "lock-label";
  valLabel.textContent = "Tile:";
  const valInput = document.createElement("div");
  valInput.className = "lock-val";
  valInput.onclick = () => openLockModal(valInput);
  valWrap.appendChild(valLabel);
  valWrap.appendChild(valInput);

  const removeBtn = document.createElement("button");
  removeBtn.className = "lock-remove";
  removeBtn.innerHTML = "&minus;";
  removeBtn.title = "Remove locked tile";
  removeBtn.addEventListener("click", () => {
    pairDiv.remove();
    render();
    updateSeqPreview();
  });

  pairDiv.appendChild(posWrap);
  pairDiv.appendChild(arrow);
  pairDiv.appendChild(valWrap);
  pairDiv.appendChild(removeBtn);
  lockContainer.appendChild(pairDiv);

  render();
  updateSeqPreview();
}
addLockBtn.addEventListener("click", addLock);

// ══════════════════════════════════════════════════════════════
// 5. Tile Selector Modal Controller
// ══════════════════════════════════════════════════════════════

let activeLockTarget = null;

function buildModalPad() {
  const modalPad = document.getElementById("modalPawnPad");
  if (!modalPad) return;
  modalPad.innerHTML = "";
  PAD_TILES.forEach(tile => {
    const wrap = document.createElement("div");
    wrap.className = "pawn-btn-wrap" + (tile.span === 2 ? " zero" : "");
    const btn = document.createElement("input");
    btn.type = "button";
    btn.value = tile.v;
    wrap.appendChild(btn);
    const ptBadge = document.createElement("span");
    ptBadge.className = "pad-pt";
    ptBadge.textContent = tilePoint(tile.v);
    wrap.appendChild(ptBadge);
    wrap.addEventListener("click", () => selectModalLockTile(tile.v));
    modalPad.appendChild(wrap);
  });
}

function openLockModal(targetDiv) {
  activeLockTarget = targetDiv;
  const modal = document.getElementById("tileModalOverlay");
  if (modal) {
    buildModalPad();
    modal.classList.add("active");
  }
}

function closeTileModal() {
  const modal = document.getElementById("tileModalOverlay");
  if (modal) modal.classList.remove("active");
  activeLockTarget = null;
}

function handleTileModalBackdrop(e) {
  if (e.target.id === "tileModalOverlay") {
    closeTileModal();
  }
}

function selectModalLockTile(val) {
  if (activeLockTarget) {
    activeLockTarget.innerHTML = "";
    const div = document.createElement("div");
    div.className = "pawn-slot";
    div.textContent = val;
    activeLockTarget.appendChild(div);
    closeTileModal();
    render();
  }
}

function clearSelectedLockSlot() {
  if (activeLockTarget) {
    activeLockTarget.innerHTML = "";
    closeTileModal();
    render();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTileModal();
});

// ══════════════════════════════════════════════════════════════
// 6. A-Math Permutation & Validation Engine
// ══════════════════════════════════════════════════════════════

// Expands dual/blank wildcards (+/-, x/÷, ?) into concrete candidate tokens
function Expanded(pawn) {
  const special_map = {
    '+/-': ['+', '-'],
    'x/÷': ['*', '/'],
    'x': ['*'],
    '÷': ['/'],
    '?': ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','+','-','*','/','=']
  };

  let result = [[]];
  for (const token of pawn) {
    if (token in special_map) {
      result = result.flatMap(r => special_map[token].map(op => [...r, op]));
    } else {
      result = result.map(r => [...r, token]);
    }
  }
  return result;
}

// Merges rack permutation with fixed board locked positions
function add_pawn_js(pawn_in_rack, pawn_on_board) {
  const pawn_on_board_zero = {};
  for (const pair of pawn_on_board) {
    pawn_on_board_zero[pair.position - 1] = pair.value;
  }
  const final_length = pawn_in_rack.length + pawn_on_board.length;
  const final_arr = Array(final_length).fill(null);
  for (const pos in pawn_on_board_zero) {
    final_arr[pos] = pawn_on_board_zero[pos];
  }
  let idx = 0;
  for (let i = 0; i < final_length; i++) {
    if (final_arr[i] === null) final_arr[i] = pawn_in_rack[idx++];
  }
  return final_arr;
}

// Generates unique permutations of rack array
function Permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  const used = new Set();
  for (let i = 0; i < arr.length; i++) {
    if (used.has(arr[i])) continue;
    used.add(arr[i]);
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of Permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// Validates grammar rules (operator placement, leading zeros, consecutive digits)
function Condition(set_condition) {
  const define_marks = new Set(['=','+','-','*','/']);
  const define_number_unitdigit = new Set(['0','1','2','3','4','5','6','7','8','9']);
  const define_number_tensdigit = new Set(['10','11','12','13','14','15','16','17','18','19','20']);

  if (!set_condition.includes('=')) return false;

  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i+1];
    if (define_marks.has(a) && define_marks.has(b) && !(a == '=' && b == '-')) return false;
  }
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i+1];
    if (define_number_tensdigit.has(a) && define_number_tensdigit.has(b)) return false;
  }
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i+1];
    if (define_number_unitdigit.has(a) && define_number_tensdigit.has(b)) return false;
    if (define_number_tensdigit.has(a) && define_number_unitdigit.has(b)) return false;
  }

  let count = 0;
  for (const x of set_condition) {
    if (define_number_unitdigit.has(x)) count++;
    else count = 0;
    if (count > 3) return false;
  }

  let numbers = [];
  let temp = "";
  for (const x of set_condition) {
    if (!define_marks.has(x)) temp += x;
    else {
      if (temp) { numbers.push(temp); temp = ""; }
    }
  }
  if (temp) numbers.push(temp);

  for (const num of numbers) {
    if (num.length >= 2 && num[0] == '0') return false;
  }
  for (let i = 0; i < set_condition.length - 1; i++) {
    if (set_condition[i] == '/' && set_condition[i+1] == '0') return false;
    if (set_condition[i] == '-' && set_condition[i+1] == '0') return false;
  }
  if ((define_marks.has(set_condition[0]) && set_condition[0] != '-') || define_marks.has(set_condition[set_condition.length - 1])) {
    return false;
  }
  return true;
}

// Evaluates mathematical equality across all '=' segments
function Check_Equation(set_check_equation) {
  const parts = [];
  let temp = [];
  for (const t of set_check_equation) {
    if (t == '=') { parts.push(temp); temp = []; }
    else { temp.push(t); }
  }
  parts.push(temp);
  try {
    const values = parts.map(p => eval(p.join('')));
    const first = values[0];
    return values.every(v => Math.abs(v - first) < 1e-9);
  } catch {
    return false;
  }
}

// Computes score with tile points and Bingo bonus (+40 when >= 8 rack tiles used)
function computeScore(tokens, rackUsedCount) {
  let sum = 0;
  tokens.forEach(t => {
    sum += tilePoint(t);
  });
  if (rackUsedCount >= 8) sum += 40;
  return sum;
}

// ══════════════════════════════════════════════════════════════
// 7. Asynchronous Solver Loop & Progress UI
// ══════════════════════════════════════════════════════════════

let isComputationAborted = false;

function showLoading() {
  isComputationAborted = false;
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("active");
  setProgress(0, "Preparing...");
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("active");
}

function cancelComputation() {
  isComputationAborted = true;
  hideLoading();
}

function setProgress(pct, detail) {
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  const pctEl = document.getElementById("loadingPct");
  const barEl = document.getElementById("loadingBarFill");
  const detailEl = document.getElementById("loadingDetail");
  if (pctEl) {
    pctEl.textContent = p + "%";
    pctEl.style.color = `hsl(${Math.round(20 + p)}, 90%, 45%)`;
  }
  if (barEl) barEl.style.width = p + "%";
  if (detailEl && detail) detailEl.textContent = detail;
}

function yieldFrame() {
  return new Promise(r => setTimeout(r, 0));
}

async function runAMath() {
  solutions = [];
  shownCount = 0;
  const seenKey = new Set();
  let locks = [];

  if (filled.length === 0) {
    alert("Please enter tiles on the rack first!");
    return;
  }

  if (mode === 'mode2') {
    document.querySelectorAll(".lock-pair").forEach(pair => {
      const pos = parseInt(pair.querySelector(".lock-pos").value);
      const valDiv = pair.querySelector(".lock-val .pawn-slot");
      const val = valDiv ? valDiv.textContent : "";
      if (pos && val) locks.push({ position: pos, value: val });
    });
  }

  showLoading();
  await yieldFrame();

  const allPerms = Permutations(filled);
  const total = allPerms.length;
  const YIELD_MS = 40;
  let lastYield = performance.now();

  for (let pi = 0; pi < total; pi++) {
    if (isComputationAborted) { hideLoading(); return; }
    const perm = allPerms[pi];
    const combined = mode === 'mode2' ? add_pawn_js(perm, locks) : perm;
    const exps = Expanded(combined);

    for (const exp of exps) {
      if (Condition(exp) && Check_Equation(exp)) {
        const key = exp.join('');
        if (!seenKey.has(key)) {
          seenKey.add(key);
          const score = computeScore(combined, perm.length);
          solutions.push({
            eq: key,
            score: score,
            usedTiles: perm,
            usedCount: perm.length
          });
        }
      }
    }

    const now = performance.now();
    if (now - lastYield >= YIELD_MS) {
      setProgress(((pi + 1) / total) * 100, `Checking ${pi + 1}/${total} — ${solutions.length} found`);
      await yieldFrame();
      lastYield = performance.now();
    }
  }

  if (isComputationAborted) { hideLoading(); return; }
  solutions.sort((a, b) => b.score - a.score);
  hideLoading();
  renderSolutions();
}

// ══════════════════════════════════════════════════════════════
// 8. Solution Rendering & Pagination
// ══════════════════════════════════════════════════════════════

function beautify(expr) {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

function computeLeftover(s) {
  if (s.usedTiles) {
    const rem = [...filled];
    for (const t of s.usedTiles) {
      const idx = rem.indexOf(t);
      if (idx !== -1) rem.splice(idx, 1);
    }
    return rem;
  }
  return s.usedCount >= filled.length ? [] : [];
}

function makeSolutionItem(s) {
  const div = document.createElement("div");
  div.className = "solution-item";

  const eq = document.createElement("span");
  eq.className = "solution-eq";
  eq.textContent = beautify(s.eq);
  div.appendChild(eq);

  const meta = document.createElement("div");
  meta.className = "solution-meta";

  if (s.score !== null && s.score !== undefined) {
    const sc = document.createElement("span");
    sc.className = "solution-score";
    sc.textContent = `${s.score} pts`;
    meta.appendChild(sc);
  }

  // Bingo badge requires at least 8 rack tiles used
  if (s.usedCount >= 8) {
    const b = document.createElement("span");
    b.className = "badge-bingo";
    b.textContent = "Bingo";
    meta.appendChild(b);
  }

  const leftover = computeLeftover(s);
  if (leftover.length > 0) {
    const b = document.createElement("span");
    b.className = "badge-leftover";
    b.textContent = "Left: " + leftover.map(t => t === '*' ? '×' : t === '/' ? '÷' : t).join(", ");
    meta.appendChild(b);
  }

  div.appendChild(meta);
  return div;
}

function renderSolutions() {
  solutionsContainer.innerHTML = "";
  solutionsContainer.style.display = "flex";

  if (!solutions.length) {
    const div = document.createElement("div");
    div.className = "solution-item";
    div.style.color = "#d44";
    div.style.fontWeight = "bold";
    div.innerHTML = '<span class="solution-eq">No solutions found.</span>';
    solutionsContainer.appendChild(div);
  } else {
    const show = solutions.slice(0, 20);
    shownCount = show.length;
    show.forEach(s => solutionsContainer.appendChild(makeSolutionItem(s)));
  }

  const actions = document.createElement("div");
  actions.className = "solution-actions";

  if (solutions.length > shownCount) {
    const moreBtn = document.createElement("button");
    moreBtn.className = "show-more-btn";
    moreBtn.textContent = `Show more (${solutions.length - shownCount} remaining)`;
    moreBtn.addEventListener("click", () => {
      const more = solutions.slice(shownCount, shownCount + 10);
      shownCount += more.length;
      more.forEach(s => solutionsContainer.insertBefore(makeSolutionItem(s), actions));
      moreBtn.textContent = shownCount >= solutions.length
        ? `All ${solutions.length} solutions shown`
        : `Show more (${solutions.length - shownCount} remaining)`;
      solutionsContainer.scrollTop = solutionsContainer.scrollHeight;
    });
    actions.appendChild(moreBtn);
  }

  if (window.innerWidth < 700) {
    const backBtn = document.createElement("button");
    backBtn.className = "show-more-btn";
    backBtn.textContent = "Back";
    backBtn.style.background = "#8a8a8a";
    backBtn.addEventListener("click", () => {
      solutionsContainer.style.display = "none";
      document.querySelector(".container").scrollIntoView({behavior: "smooth"});
    });
    actions.appendChild(backBtn);
  }

  if (actions.children.length) solutionsContainer.appendChild(actions);
  solutionsContainer.scrollTop = 0;
}

// ══════════════════════════════════════════════════════════════
// 9. Initial Setup
// ══════════════════════════════════════════════════════════════
selectSlotTopPawn();
render();


