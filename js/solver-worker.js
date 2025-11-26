// =============================
// ค่าคงที่ / แผนที่ (ฝั่ง Worker)
// =============================
const SPECIAL_MAP = {
  "+/-": ["+", "-"],
  "x/÷": ["*", "/"],
  "x": ["*"],
  "÷": ["/"],
  "?": [
    "0","1","2","3","4","5","6","7","8","9",
    "10","11","12","13","14","15",
    "16","17","18","19","20",
    "+","-","*","/","="
  ]
};

const DEFINE_MARKS = new Set(["=", "+", "-", "*", "/"]);
const DEFINE_UNIT = new Set(["0","1","2","3","4","5","6","7","8","9"]);
const DEFINE_TENS = new Set([
  "10","11","12","13","14","15",
  "16","17","18","19","20"
]);

// =============================
// Utility ภายใน Worker
// =============================
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

function add_pawn_js(rackPerm, locks, totalLen) {
  const arr = new Array(totalLen).fill(null);

  locks.forEach(l => {
    const pos = l.position - 1;
    if (pos >= 0 && pos < totalLen) {
      arr[pos] = l.value;
    }
  });

  let idx = 0;
  for (let i = 0; i < totalLen; i++) {
    if (arr[i] === null && idx < rackPerm.length) {
      arr[i] = rackPerm[idx++];
    }
  }
  return arr;
}

function Condition(set_condition) {
  if (!set_condition.includes("=")) return false;

  // ห้าม operator ติดกัน ยกเว้น "= -"
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i];
    const b = set_condition[i + 1];
    if (DEFINE_MARKS.has(a) && DEFINE_MARKS.has(b) && !(a === "=" && b === "-")) {
      return false;
    }
  }

  // tens + tens
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i];
    const b = set_condition[i + 1];
    if (DEFINE_TENS.has(a) && DEFINE_TENS.has(b)) {
      return false;
    }
  }

  // unit + tens หรือ tens + unit
  for (let i = 0; i < set_condition.length - 1; i++) {
    const a = set_condition[i];
    const b = set_condition[i + 1];
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
    if (num.length >= 2 && num[0] === "0") return false;
  }

  // กัน /0 และ -0
  for (let i = 0; i < set_condition.length - 1; i++) {
    if (set_condition[i] === "/" && set_condition[i + 1] === "0") return false;
  }
  for (let i = 0; i < set_condition.length - 1; i++) {
    if (set_condition[i] === "-" && set_condition[i + 1] === "0") return false;
  }

  // เริ่ม/จบด้วย operator
  if ((DEFINE_MARKS.has(set_condition[0]) && set_condition[0] !== "-") ||
      DEFINE_MARKS.has(set_condition[set_condition.length - 1])) {
    return false;
  }

  return true;
}

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

// =============================
// Solver หลัก (ไม่ยุ่งกับ DOM)
// =============================
function solve(mode, filled, totalSlots, fixSlotsValues) {
  if (!Array.isArray(filled) || filled.length === 0) return [];

  let locks = [];
  let totalLen;

  if (mode === "fix") {
    totalLen = totalSlots;
    for (let i = 0; i < totalSlots; i++) {
      const v = fixSlotsValues && fixSlotsValues[i];
      if (v && v !== "") {
        locks.push({ position: i + 1, value: v });
      }
    }
  } else {
    totalLen = filled.length;
  }

  const solutionsMap = new Map();

  function addSolution(seqOriginal, expTokens) {
    const key = expTokens.join(",");

    const qPos = [];
    for (let i = 0; i < seqOriginal.length; i++) {
      if (seqOriginal[i] === "?") qPos.push(i);
    }

    const existing = solutionsMap.get(key);
    if (!existing) {
      solutionsMap.set(key, {
        tokens: expTokens.slice(),
        qPositions: qPos.slice()
      });
    } else {
      for (const p of qPos) {
        if (!existing.qPositions.includes(p)) {
          existing.qPositions.push(p);
        }
      }
    }
  }

  if (mode === "fix") {
    const perms = Permutations(filled);
    for (const perm of perms) {
      const seq = add_pawn_js(perm, locks, totalLen); // seq ยังมี ? ได้
      const expandedList = Expanded(seq);
      for (const exp of expandedList) {
        if (Condition(exp) && Check_Equation(exp)) {
          addSolution(seq, exp);
        }
      }
    }
  } else {
    const perms = Permutations(filled);
    for (const perm of perms) {
      const seq = perm;
      const expandedList = Expanded(seq);
      for (const exp of expandedList) {
        if (Condition(exp) && Check_Equation(exp)) {
          addSolution(seq, exp);
        }
      }
    }
  }

  return Array.from(solutionsMap.values());
}

// =============================
// Worker message handler
// =============================
self.onmessage = (e) => {
  const { type, payload } = e.data || {};
  if (type === "solve") {
    const { mode, filled, totalSlots, fixSlotsValues } = payload;

    const start = performance.now();
    const result = solve(mode, filled, totalSlots, fixSlotsValues);
    const end = performance.now();

    const elapsedMs = end - start;

    self.postMessage({ 
      type: "result", 
      solutions: result,
      elapsedMs: elapsedMs
    });
  }
};
