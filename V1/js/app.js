// =============================
// ค่าคงที่ฝั่ง UI
// =============================
const DEFINE_MARKS = new Set(["=", "+", "-", "*", "/"]);

const topRackDiv = document.getElementById("topRack");
const pawnButtons = document.querySelectorAll(".pawn input");
const controlButtons = document.querySelectorAll(".control input");
const solutionsContainer = document.getElementById("solutionsContainer");

const mode1Btn = document.getElementById("mode1");
const mode2Btn = document.getElementById("mode2");
const fixSettings = document.getElementById("fixSettings");
const totalSlotsInput = document.getElementById("totalSlotsInput");
const fixSlotsRow = document.getElementById("fixSlotsRow");
const clearTotalBtn = document.getElementById("clearTotalSlots");
const submitBtn = document.querySelector('.control input[value="Submit"]');

let mode = "bingo";
let filled = [];
let maxFilled = 9;
let currentTarget = "top";
let totalSlots = 9;
let fixSlotsValues = [];
let lastElapsedMs = null;
let solutions = [];
let shownCount = 0;
let isSolving = false;

// =============================
// Web Worker
// =============================
let solverWorker = null;
if (window.Worker) {
  solverWorker = new Worker("js/solver-worker.js");
  solverWorker.onmessage = (e) => {
    const { type, solutions: workerSolutions, elapsedMs } = e.data || {};
    if (type === "result") {
      isSolving = false;
      solutions = workerSolutions || [];
      lastElapsedMs = typeof elapsedMs === "number" ? elapsedMs : null;
      renderSolutions();
    }
  };
} else {
  showToast("เบราว์เซอร์นี้ไม่รองรับ Web Worker");
}

// =============================
// UI Helpers (Toast & Active Focus)
// =============================
function showToast(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function updateActiveFocus() {
  topRackDiv.classList.remove("active-slot");
  document.querySelectorAll('.fix-slot').forEach(el => el.classList.remove('active-slot'));
  
  if (currentTarget === "top") {
    topRackDiv.classList.add("active-slot");
  } else if (currentTarget && currentTarget.classList) {
    currentTarget.classList.add("active-slot");
  }
}

// =============================
// Logic แถวเบี้ย
// =============================
function renderTopRack() {
  topRackDiv.innerHTML = "";
  filled.forEach(v => {
    const d = document.createElement("div");
    d.className = "pawn-slot";
    d.textContent = v;
    topRackDiv.appendChild(d);
  });
}

function buildFixSlots() {
  fixSlotsRow.innerHTML = "";
  fixSlotsValues = new Array(totalSlots).fill(null);

  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement("div");
    slot.className = "fix-slot";
    slot.dataset.index = i;

    const idx = document.createElement("div");
    idx.className = "fix-slot-index";
    idx.textContent = i + 1;

    const content = document.createElement("div");
    content.className = "pawn-slot";
    content.style.background = "transparent";
    content.style.boxShadow = "none";
    content.style.border = "none";

    slot.appendChild(idx);
    slot.appendChild(content);

    slot.addEventListener("click", () => {
      currentTarget = slot;
      updateActiveFocus();
    });

    fixSlotsRow.appendChild(slot);
  }
}

window.selectTopTarget = function() {
  currentTarget = "top";
  updateActiveFocus();
};

pawnButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.value;
    if (currentTarget === "top") {
      if (filled.length >= maxFilled) return showToast("ใส่เบี้ยครบแล้ว (สูงสุด 9 ตัว)");
      filled.push(v);
      renderTopRack();
    } else if (currentTarget && currentTarget.classList.contains("fix-slot")) {
      const idx = parseInt(currentTarget.dataset.index, 10);
      currentTarget.querySelector(".pawn-slot").textContent = v;
      fixSlotsValues[idx] = v;
    }
  });
});

controlButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.value === "Back") {
      if(currentTarget === "top") { filled.pop(); renderTopRack(); }
      else if(currentTarget.classList.contains("fix-slot")) {
        currentTarget.querySelector(".pawn-slot").textContent = "";
        fixSlotsValues[parseInt(currentTarget.dataset.index, 10)] = null;
      }
    } else if (btn.value === "Clear") {
      filled = []; renderTopRack();
      if (mode === "fix") buildFixSlots();
      solutions = []; solutionsContainer.innerHTML = "";
    } else if (btn.value === "Submit") {
      runAMath();
    }
  });
});

if (clearTotalBtn) {
  clearTotalBtn.addEventListener("click", () => {
    const n = parseInt(totalSlotsInput.value, 10);
    if (!isNaN(n) && n > 0) { totalSlots = Math.min(n, 15); buildFixSlots(); }
  });
}

mode1Btn.addEventListener("click", () => {
  mode = "bingo"; mode1Btn.classList.add("active"); mode2Btn.classList.remove("active");
  fixSettings.style.display = "none"; window.selectTopTarget();
});

mode2Btn.addEventListener("click", () => {
  mode = "fix"; mode2Btn.classList.add("active"); mode1Btn.classList.remove("active");
  fixSettings.style.display = "block";
  totalSlots = parseInt(totalSlotsInput.value, 10) || filled.length || 1;
  totalSlotsInput.value = totalSlots;
  buildFixSlots(); window.selectTopTarget();
});

totalSlotsInput.addEventListener("input", () => {
  const n = parseInt(totalSlotsInput.value, 10);
  if (!isNaN(n) && n > 0) { totalSlots = Math.min(n, 15); totalSlotsInput.value = totalSlots; if (mode === "fix") buildFixSlots(); }
});

function beautify(expr) { return expr.replace(/\*/g, "×").replace(/\//g, "÷"); }
function beautifyToken(t) { if (t === "*") return "×"; if (t === "/") return "÷"; return t; }

function showSolvingStatus() {
  solutionsContainer.innerHTML = `<div class="spinner"></div><div style="text-align:center; opacity:0.8;">กำลังคำนวณ...</div>`;
  submitBtn.disabled = true; submitBtn.value = "Solving...";
}

function runAMath() {
  if (!solverWorker) return showToast("ไม่รองรับ Web Worker");
  if (isSolving) return;
  if (filled.length === 0) return showToast("กรุณาใส่เบี้ยบนมืออย่างน้อย 1 ตัว");

  isSolving = true;
  showSolvingStatus();
  solverWorker.postMessage({ type: "solve", payload: { mode, filled, totalSlots, fixSlotsValues } });
}

function renderSolutions() {
  solutionsContainer.innerHTML = "";
  submitBtn.disabled = false; submitBtn.value = "Submit";

  const summary = document.createElement("div");
  summary.className = "solution-summary";
  summary.textContent = `พบ ${solutions.length} คำตอบ ${lastElapsedMs ? `(ใช้เวลา ${(lastElapsedMs / 1000).toFixed(2)}s)` : ''}`;
  solutionsContainer.appendChild(summary);

  if (solutions.length === 0) {
    const div = document.createElement("div");
    div.className = "solution-item"; div.style.color = "#ef4444"; div.style.textAlign = "center"; div.textContent = "ไม่มีสมการที่ถูกต้อง";
    solutionsContainer.appendChild(div);
    return;
  }

  shownCount = Math.min(solutions.length, 20);
  const makeItem = ({ tokens, qPositions }) => {
    const item = document.createElement("div");
    item.className = "solution-item";
    const row = document.createElement("div");
    row.className = "solution-row";

    tokens.forEach((t, idx) => {
      const slot = document.createElement("div");
      slot.className = "pawn-slot solution-pawn";
      const isFromQ = qPositions.includes(idx);

      if (t === "=") slot.classList.add(isFromQ ? "qmark" : "eq");
      else if (isFromQ) slot.classList.add("qmark");
      else if (DEFINE_MARKS.has(t)) slot.classList.add("op");
      
      slot.textContent = beautifyToken(t);
      row.appendChild(slot);
    });

    item.appendChild(row);
    const textLine = document.createElement("div");
    textLine.style.fontSize = "13px"; textLine.style.opacity = "0.6"; textLine.style.marginTop = "6px";
    textLine.textContent = beautify(tokens.join(""));
    item.appendChild(textLine);
    return item;
  };

  solutions.slice(0, shownCount).forEach(sol => solutionsContainer.appendChild(makeItem(sol)));

  if (solutions.length > shownCount) {
    const moreBtn = document.createElement("button");
    moreBtn.className = "show-more-btn"; moreBtn.textContent = "ดูเพิ่มเติม";
    moreBtn.addEventListener("click", () => {
      const more = solutions.slice(shownCount, shownCount + 10);
      shownCount += more.length;
      more.forEach(sol => solutionsContainer.insertBefore(makeItem(sol), moreBtn));
      if (shownCount >= solutions.length) moreBtn.remove();
      solutionsContainer.scrollTop = solutionsContainer.scrollHeight;
    });
    solutionsContainer.appendChild(moreBtn);
  }
}

renderTopRack();
if (mode === "fix") buildFixSlots();
updateActiveFocus(); // เริ่มต้นให้ topRack เรืองแสงว่าพร้อมรับค่า