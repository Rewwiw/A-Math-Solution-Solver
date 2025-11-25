// -----------------------------
// ค่าคงที่ / แผนที่สำหรับขยายเบี้ยพิเศษ + set ต่าง ๆ
// -----------------------------
const SPECIAL_MAP = {
  "+/-": ["+", "-"],
  "x/÷": ["*", "/"],
  "x": ["*"],
  "÷": ["/"],
  "?": [
    "0","1","2","3","4","5","6","7","8","9",
    "10","11","12","13","14","15","16","17","18","19","20",
    "+","-","*","/","="
  ]
};

const DEFINE_MARKS = new Set(['=', '+', '-', '*', '/']);
const DEFINE_UNIT = new Set(['0','1','2','3','4','5','6','7','8','9']);
const DEFINE_TENS = new Set([
  '10','11','12','13','14','15',
  '16','17','18','19','20'
]);

// -----------------------------
// DOM อ้างอิงหลัก
// -----------------------------
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

// -----------------------------
// State
// -----------------------------
let mode = "bingo";        // "bingo" หรือ "fix"
let filled = [];           // เบี้ยที่อยู่บนมือ (Top rack)
let maxFilled = 9;         // limit บนมือ = 9 ตัวทุกโหมด
let currentTarget = "top"; // "top" หรือ DOM ของ .fix-slot

let totalSlots = 9;        // จำนวนช่องทั้งหมดในสมการ (Fix Position)
let fixSlotsValues = [];   // ยาว totalSlots, เก็บค่าที่ล็อกในแต่ละตำแหน่ง

let solutions = [];
let shownCount = 0;

// -----------------------------
// Render Top rack
// -----------------------------
function renderTopRack() {
  topRackDiv.innerHTML = "";
  filled.forEach(v => {
    const d = document.createElement("div");
    d.className = "pawn-slot";
    d.textContent = v;
    topRackDiv.appendChild(d);
  });
}

// -----------------------------
// สร้างช่อง Fix Position ตามจำนวน totalSlots
// -----------------------------
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

// -----------------------------
// เลือก target เป็น Top rack (เรียกจาก HTML)
// -----------------------------
function selectTopTarget() {
  currentTarget = "top";
}
window.selectTopTarget = selectTopTarget;

// -----------------------------
// คลิกปุ่มเบี้ย (ตัวเลข / เครื่องหมาย)
// -----------------------------
pawnButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.value;

    if (currentTarget === "top") {
      // จำกัดบนมือ 9 ตัวทุกโหมด
      if (filled.length >= maxFilled) {
        alert("ใส่เบี้ยครบแล้ว (สูงสุด 9 ตัว)");
        return;
      }
      filled.push(v);
      renderTopRack();
    } else if (currentTarget && currentTarget.classList.contains("fix-slot")) {
      // ใส่ค่าในช่อง Fix Position
      const idx = parseInt(currentTarget.dataset.index, 10);
      const contentDiv = currentTarget.querySelector(".pawn-slot");
      contentDiv.textContent = v;
      fixSlotsValues[idx] = v;
    }
  });
});

// -----------------------------
// ปุ่ม Back / Clear / Submit ด้านล่าง
// -----------------------------
controlButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.value === "Back") {
      filled.pop();
      renderTopRack();
    } else if (btn.value === "Clear") {
      // เคลียร์ทั้ง Top rack + Fix slots + คำตอบ
      filled = [];
      renderTopRack();
      if (mode === "fix") {
        buildFixSlots();
      }
      solutions = [];
      shownCount = 0;
      solutionsContainer.innerHTML = "";
    } else if (btn.value === "Submit") {
      runAMath();
    }
  });
});

// -----------------------------
// ปุ่ม Clear เฉพาะ "เบี้ยในช่อง Fix" แต่ไม่ล้างจำนวนช่อง
// -----------------------------
if (clearTotalBtn) {
  clearTotalBtn.addEventListener("click", () => {
    const n = parseInt(totalSlotsInput.value, 10);
    if (!isNaN(n) && n > 0) {
      totalSlots = Math.min(n, 15);
      buildFixSlots();   // สร้างช่อง Fix ใหม่ ว่างหมด
    }
  });
}

// -----------------------------
// เปลี่ยนโหมด Bingo 8 / Bingo Fix Position
// -----------------------------
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

// -----------------------------
// เปลี่ยนจำนวนช่องทั้งหมดในสมการ (input number)
// -----------------------------
totalSlotsInput.addEventListener("input", () => {
  const n = parseInt(totalSlotsInput.value, 10);
  if (!isNaN(n) && n > 0) {
    totalSlots = Math.min(n, 15);
    totalSlotsInput.value = totalSlots;
    if (mode === "fix") buildFixSlots();
  }
});

// -----------------------------
// ขยายเบี้ยพิเศษ เช่น +/-, x/÷, ?
// -----------------------------
function Expanded(pawn) {
  let result = [[]];
  for (const token of pawn) {
    if (token in SPECIAL_MAP) {
      const choices = SPECIAL_MAP[token];
      const next = [];
      for (const base of result) {
        for (const c of choices) {
          next.push([...base, c]);
        }
      }
      result = next;
    } else {
      result = result.map(r => [...r, token]);
    }
  }
  return result;
}

// -----------------------------
// Permutations: สร้างเรียงสับเปลี่ยน (ตัด perm ซ้ำ แต่ logic เดิม)
// -----------------------------
function Permutations(arr) {
  const sorted = arr.slice().sort();
  const used = new Array(sorted.length).fill(false);
  const result = [];
  const path = [];

  function backtrack() {
    if (path.length === sorted.length) {
      result.push(path.slice());
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      // ข้ามค่าซ้ำที่ยังไม่ได้ใช้ของตัวก่อนหน้า
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue;

      used[i] = true;
      path.push(sorted[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
}

// -----------------------------
// เติมเบี้ยลงในช่อง (fix + rack)
// -----------------------------
function add_pawn_js(rackPerm, locks, totalLen) {
  const arr = new Array(totalLen).fill(null);

  // ใส่ค่าที่ล็อกก่อน
  locks.forEach(l => {
    const pos = l.position - 1;
    if (pos >= 0 && pos < totalLen) {
      arr[pos] = l.value;
    }
  });

  // เติมเบี้ยจาก rack ลงช่องที่ยังว่าง
  let idx = 0;
  for (let i = 0; i < totalLen; i++) {
    if (arr[i] === null && idx < rackPerm.length) {
      arr[i] = rackPerm[idx++];
    }
  }
  return arr;
}

// -----------------------------
// เงื่อนไขรูปแบบสมการ (กันเลขแปลก ๆ)
// -----------------------------
function Condition(set_condition) {
  // ต้องมี '='
  if (!set_condition.includes('=')) return false;

  // ห้าม operator ติดกัน ยกเว้น "= -"
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i + 1];
    if (DEFINE_MARKS.has(a) && DEFINE_MARKS.has(b) && !(a === '=' && b === '-')) {
      return false;
    }
  }

  // tens + tens (10 11 → 1011) ไม่ให้
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i + 1];
    if (DEFINE_TENS.has(a) && DEFINE_TENS.has(b)) {
      return false;
    }
  }

  // unit + tens หรือ tens + unit ก็ไม่ให้ (7 17 → 717, 17 7 → 177)
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i], b = set_condition[i + 1];
    if (DEFINE_UNIT.has(a) && DEFINE_TENS.has(b)) return false;
    if (DEFINE_TENS.has(a) && DEFINE_UNIT.has(b)) return false;
  }

  // จำกัดจำนวนเลขหลักเดียวต่อเนื่อง
  let count = 0;
  for (const x of set_condition) {
    if (DEFINE_UNIT.has(x)) count++;
    else count = 0;
    if (count > 3) return false;
  }

  // แยกเลขมาตรวจ 0 นำหน้า
  let numbers = [];
  let temp = "";
  for (const x of set_condition) {
    if (!DEFINE_MARKS.has(x)) {
      temp += x;
    } else {
      if (temp) {
        numbers.push(temp);
        temp = "";
      }
    }
  }
  if (temp) numbers.push(temp);

  for (const num of numbers) {
    if (num.length >= 2 && num[0] === '0') return false;
  }

  // กัน /0 และ -0 แบบง่าย
  for (let i = 0; i < set_condition.length - 1; i++) {
    if (set_condition[i] === '/' && set_condition[i + 1] === '0') return false;
  }
  for (let i = 0; i < set_condition.length - 1; i++) {
    if (set_condition[i] === '-' && set_condition[i + 1] === '0') return false;
  }

  // ห้ามเริ่มด้วย operator (ยกเว้น '-') และห้ามจบด้วย operator
  if ((DEFINE_MARKS.has(set_condition[0]) && set_condition[0] !== '-') ||
      DEFINE_MARKS.has(set_condition[set_condition.length - 1])) {
    return false;
  }

  return true;
}

// -----------------------------
// เช็คว่าแต่ละฝั่งของ '=' ให้ค่าตัวเลขเท่ากันมั้ย
// -----------------------------
function Check_Equation(tokens) {
  const expr = tokens.join("");
  const parts = expr.split("=");
  try {
    const values = parts.map(p =>
      Function('"use strict";return (' + p + ")")()
    );
    const first = values[0];
    return values.every(v => Math.abs(v - first) < 1e-9);
  } catch {
    return false;
  }
}

// -----------------------------
// แต่ง * / ให้เป็น × ÷ เพื่อแสดงผลสวย ๆ
// -----------------------------
function beautify(expr) {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

// -----------------------------
// Run A-Math (หาคำตอบทั้งหมด)
// -----------------------------
function runAMath() {
  solutions = [];
  shownCount = 0;

  if (filled.length === 0) {
    alert("กรุณาใส่เบี้ยบนมืออย่างน้อย 1 ตัว");
    return;
  }

  let locks = [];
  let totalLen;

  if (mode === "fix") {
    totalLen = totalSlots;
    for (let i = 0; i < totalSlots; i++) {
      const v = fixSlotsValues[i];
      if (v && v !== "") {
        locks.push({ position: i + 1, value: v });
      }
    }
  } else {
    totalLen = filled.length;
  }

  const uniq = new Set();

  if (mode === "fix") {
    const perms = Permutations(filled);
    for (const perm of perms) {
      const seq = add_pawn_js(perm, locks, totalLen);
      const expanded = Expanded(seq);
      for (const exp of expanded) {
        if (Condition(exp) && Check_Equation(exp)) {
          uniq.add(exp.join(""));
        }
      }
    }
  } else {
    // Bingo 8 → ใช้เบี้ยบนมืออย่างเดียว
    const perms = Permutations(filled);
    for (const perm of perms) {
      const expanded = Expanded(perm);
      for (const exp of expanded) {
        if (Condition(exp) && Check_Equation(exp)) {
          uniq.add(exp.join(""));
        }
      }
    }
  }

  solutions = Array.from(uniq);
  renderSolutions();
}

// -----------------------------
// แสดงคำตอบในฝั่งขวา
// -----------------------------
function renderSolutions() {
  solutionsContainer.innerHTML = "";

  if (solutions.length === 0) {
    const div = document.createElement("div");
    div.className = "solution-item";
    div.style.color = "red";
    div.style.fontWeight = "bold";
    div.textContent = "No Solution";
    solutionsContainer.appendChild(div);
    return;
  }

  const maxShow = 20;
  const show = solutions.slice(0, maxShow);
  shownCount = show.length;

  show.forEach(s => {
    const div = document.createElement("div");
    div.className = "solution-item";
    div.textContent = beautify(s);
    solutionsContainer.appendChild(div);
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
      more.forEach(s => {
        const div = document.createElement("div");
        div.className = "solution-item";
        div.textContent = beautify(s);
        solutionsContainer.insertBefore(div, actions);
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

// -----------------------------
// Init
// -----------------------------
renderTopRack();
