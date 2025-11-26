// =============================
// ค่าคงที่ฝั่ง UI
// =============================
const DEFINE_MARKS = new Set(["=", "+", "-", "*", "/"]);

// =============================
// DOM references
// =============================
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

// =============================
// State ฝั่ง UI
// =============================
let mode = "bingo";          // "bingo" หรือ "fix"
let filled = [];             // เบี้ยบนมือ
let maxFilled = 9;           // limit = 9 ตัวทุกโหมด
let currentTarget = "top";

let totalSlots = 9;          // จำนวนช่องทั้งหมดในสมการ
let fixSlotsValues = [];     // ค่าในช่อง fix
let lastElapsedMs = null;   // เวลาใช้คำนวณรอบล่าสุด (ms)


// solutions: array ของ object { tokens: [...], qPositions: [...] }
let solutions = [];
let shownCount = 0;

// สถานะการคำนวณ
let isSolving = false;
let lastHadSolution = null;  // null = ยังไม่รู้, true/false = รอบก่อนมี/ไม่มีคำตอบ

// =============================
// Web Worker (ตัว Solver)
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

  solverWorker.onerror = (err) => {
    console.error("Solver worker error:", err);
    isSolving = false;
    alert("เกิดข้อผิดพลาดในการคำนวณสมการ");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.value = submitBtn.dataset.originalText || "Submit";
    }
  };
} else {
  alert("เบราว์เซอร์นี้ไม่รองรับ Web Worker (แนะนำใช้ Chrome/Edge เวอร์ชันใหม่)");
}


// =============================
// Render Top Rack
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

// =============================
// สร้างช่อง Fix Position
// =============================
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
    content.textContent = "";

    slot.appendChild(idx);
    slot.appendChild(content);

    slot.addEventListener("click", () => {
      currentTarget = slot;
    });

    fixSlotsRow.appendChild(slot);
  }
}

// ให้ HTML เรียกได้
function selectTopTarget() {
  currentTarget = "top";
}
window.selectTopTarget = selectTopTarget;

// =============================
// คลิกปุ่มเบี้ย
// =============================
pawnButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.value;

    if (currentTarget === "top") {
      if (filled.length >= maxFilled) {
        alert("ใส่เบี้ยครบแล้ว (สูงสุด 9 ตัว)");
        return;
      }
      filled.push(v);
      renderTopRack();
    } else if (currentTarget && currentTarget.classList.contains("fix-slot")) {
      const idx = parseInt(currentTarget.dataset.index, 10);
      const contentDiv = currentTarget.querySelector(".pawn-slot");
      contentDiv.textContent = v;
      fixSlotsValues[idx] = v;
    }
  });
});

// =============================
// ปุ่ม Back / Clear / Submit
// =============================
controlButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.value === "Back") {
      filled.pop();
      renderTopRack();
    } else if (btn.value === "Clear") {
      // เคลียร์ Top + Fix + solution
      filled = [];
      renderTopRack();
      if (mode === "fix") {
        buildFixSlots();
      }
      solutions = [];
      shownCount = 0;
      lastHadSolution = null;
      solutionsContainer.innerHTML = "";
    } else if (btn.value === "Submit") {
      runAMath();
    }
  });
});

// =============================
// ปุ่ม Clear เฉพาะแถว Fix (ไม่แตะจำนวนช่อง)
// =============================
if (clearTotalBtn) {
  clearTotalBtn.addEventListener("click", () => {
    const n = parseInt(totalSlotsInput.value, 10);
    if (!isNaN(n) && n > 0) {
      totalSlots = Math.min(n, 15);
      buildFixSlots();
    }
  });
}

// =============================
// เปลี่ยนโหมด
// =============================
mode1Btn.addEventListener("click", () => {
  mode = "bingo";
  mode1Btn.classList.add("active");
  mode2Btn.classList.remove("active");
  fixSettings.style.display = "none";
  currentTarget = "top";
});

mode2Btn.addEventListener("click", () => {
  mode = "fix";
  mode2Btn.classList.add("active");
  mode1Btn.classList.remove("active");
  fixSettings.style.display = "block";

  totalSlots = parseInt(totalSlotsInput.value, 10) || filled.length || 1;
  buildFixSlots();
  currentTarget = "top";
});

// เปลี่ยนจำนวนช่องทั้งหมดในสมการ
totalSlotsInput.addEventListener("input", () => {
  const n = parseInt(totalSlotsInput.value, 10);
  if (!isNaN(n) && n > 0) {
    totalSlots = Math.min(n, 15);
    totalSlotsInput.value = totalSlots;
    if (mode === "fix") buildFixSlots();
  }
});

// =============================
// Beautify
// =============================
function beautify(expr) {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

function beautifyToken(t) {
  if (t === "*") return "×";
  if (t === "/") return "÷";
  return t;
}

// =============================
// แสดงสถานะกำลังคำนวณ
// =============================
function showSolvingStatus() {
  solutionsContainer.innerHTML = "";

  const div = document.createElement("div");
  div.className = "solution-item";
  div.style.fontWeight = "bold";
  div.textContent = "กำลังค้นหาคำตอบ...";
  solutionsContainer.appendChild(div);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.value;
    submitBtn.value = "Solving...";
  }
}

// =============================
// เริ่มคำนวณ (ส่งงานให้ Worker)
// =============================
function runAMath() {
  if (!solverWorker) {
    alert("ไม่รองรับ Web Worker");
    return;
  }

  if (isSolving) return;

  if (filled.length === 0) {
    alert("กรุณาใส่เบี้ยบนมืออย่างน้อย 1 ตัว");
    return;
  }

  isSolving = true;
  solutions = [];
  shownCount = 0;

  showSolvingStatus();

  const payload = {
    mode,
    filled,
    totalSlots,
    fixSlotsValues
  };

  solverWorker.postMessage({ type: "solve", payload });
}

// =============================
// Render Solutions
// =============================
function renderSolutions() {
  solutionsContainer.innerHTML = "";

  // คืนปุ่ม Submit ให้กดได้อีกครั้ง
  if (submitBtn) {
    submitBtn.disabled = false;
    if (submitBtn.dataset.originalText) {
      submitBtn.value = submitBtn.dataset.originalText;
    } else {
      submitBtn.value = "Submit";
    }
  }

  // 🔹 แถบสรุปด้านบนสุด
  const summary = document.createElement("div");
  summary.className = "solution-summary";

  const count = solutions ? solutions.length : 0;
  let text = `Total solutions: ${count}`;

  if (typeof lastElapsedMs === "number") {
    const sec = (lastElapsedMs / 1000).toFixed(2);
    text += ` (in ${sec}s)`;
  }

  summary.textContent = text;
  solutionsContainer.appendChild(summary);

  // ถ้าไม่มีคำตอบ
  if (!solutions || solutions.length === 0) {
    const div = document.createElement("div");
    div.className = "solution-item";
    div.style.color = "red";
    div.style.fontWeight = "bold";

    if (lastHadSolution === false) {
      div.textContent = "Still No Solution";
    } else {
      div.textContent = "No Solution";
    }

    solutionsContainer.appendChild(div);
    lastHadSolution = false;
    return;
  }

  lastHadSolution = true;

  const maxShow = 20;
  const show = solutions.slice(0, maxShow);
  shownCount = show.length;

  const makeItem = (solutionObj) => {
    const { tokens, qPositions } = solutionObj;

    const item = document.createElement("div");
    item.className = "solution-item";

    const row = document.createElement("div");
    row.className = "solution-row";

    tokens.forEach((t, idx) => {
      const slot = document.createElement("div");
      slot.className = "pawn-slot solution-pawn";

      const isFromQ = qPositions.includes(idx);

      if (DEFINE_MARKS.has(t)) {
        slot.classList.add("op");
      }

      if (t === "=") {
        slot.classList.remove("op");
        if (isFromQ) {
          slot.classList.add("qmark");
        } else {
          slot.classList.add("eq");
        }
      } else if (isFromQ) {
        slot.classList.remove("op");
        slot.classList.add("qmark");
      }

      slot.textContent = beautifyToken(t);
      row.appendChild(slot);
    });

    item.appendChild(row);

    const textLine = document.createElement("div");
    textLine.style.fontSize = "14px";
    textLine.style.opacity = "0.8";
    textLine.style.marginTop = "2px";
    textLine.textContent = beautify(tokens.join(""));

    item.appendChild(textLine);
    return item;
  };

  // แสดงชุดแรก
  show.forEach(sol => {
    const item = makeItem(sol);
    solutionsContainer.appendChild(item);
  });

  const actions = document.createElement("div");
  actions.className = "solution-actions";

  if (solutions.length > shownCount) {
    const moreBtn = document.createElement("button");
    moreBtn.className = "show-more-btn";
    moreBtn.textContent = "ดูเพิ่มเติม";
    moreBtn.addEventListener("click", () => {
      const more = solutions.slice(shownCount, shownCount + 10);
      shownCount += more.length;

      more.forEach(sol => {
        const item = makeItem(sol);
        solutionsContainer.insertBefore(item, actions);
      });

      if (shownCount >= solutions.length) {
        moreBtn.remove();
      }
      solutionsContainer.scrollTop = solutionsContainer.scrollHeight;
    });
    actions.appendChild(moreBtn);
  }

  solutionsContainer.appendChild(actions);
}


// =============================
// Init
// =============================
renderTopRack();
if (mode === "fix") buildFixSlots();
