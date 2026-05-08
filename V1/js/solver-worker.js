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

// 🟢 กลับไปใช้ Logic ดั้งเดิมของคุณ 100% แต่เขียนในรูปแบบที่ประหยัด Memory
function Condition(set_condition) {
  let hasEq = false;
  let countUnit = 0;
  const len = set_condition.length;

  // เริ่ม/จบด้วย operator (ยกเว้นติดลบตัวแรก)
  if ((DEFINE_MARKS.has(set_condition[0]) && set_condition[0] !== "-") ||
      DEFINE_MARKS.has(set_condition[len - 1])) {
    return false;
  }

  for (let i = 0; i < len; i++) {
    const x = set_condition[i];
    
    // ตรวจสอบว่ามี = อย่างน้อย 1 ตัว (อนุญาตให้มีหลายตัวได้)
    if (x === "=") hasEq = true;

    // จำกัดจำนวนเลขหลักเดียวต่อเนื่อง
    if (DEFINE_UNIT.has(x)) {
      countUnit++;
      if (countUnit > 3) return false;
    } else {
      countUnit = 0;
    }

    if (i < len - 1) {
      const next = set_condition[i + 1];

      // ห้าม operator ติดกัน ยกเว้น "= -"
      if (DEFINE_MARKS.has(x) && DEFINE_MARKS.has(next) && !(x === "=" && next === "-")) {
        return false;
      }

      // ห้าม tens + tens / unit + tens / tens + unit
      if ((DEFINE_TENS.has(x) && DEFINE_TENS.has(next)) ||
          (DEFINE_UNIT.has(x) && DEFINE_TENS.has(next)) ||
          (DEFINE_TENS.has(x) && DEFINE_UNIT.has(next))) {
        return false;
      }

      // กัน /0 และ -0
      if (x === "/" && next === "0") return false;
      if (x === "-" && next === "0") return false;
    }
  }

  // ต้องมีเครื่องหมาย =
  if (!hasEq) return false;

  // แยกเลขมาตรวจ 0 นำหน้า
  let isZeroStart = false;
  let tempLen = 0;
  for (let i = 0; i < len; i++) {
    if (!DEFINE_MARKS.has(set_condition[i])) {
      if (tempLen === 0 && set_condition[i] === "0") isZeroStart = true;
      tempLen++;
    } else {
      if (isZeroStart && tempLen >= 2) return false;
      tempLen = 0;
      isZeroStart = false;
    }
  }
  if (isZeroStart && tempLen >= 2) return false;

  return true;
}

// 🟢 ตัวประมวลผลสมการแบบเร็วพิเศษ
function evaluateMathStr(str) {
  let tokens = [];
  let numStr = "";
  for (let i = 0; i < str.length; i++) {
    let c = str[i];
    if (c === '+' || c === '*' || c === '/') {
      if (numStr) tokens.push(Number(numStr));
      numStr = "";
      tokens.push(c);
    } else if (c === '-') {
      if (numStr) {
        tokens.push(Number(numStr));
        numStr = "";
        tokens.push(c);
      } else {
        numStr += c; // กรณีติดลบด้านหน้า
      }
    } else {
      numStr += c;
    }
  }
  if (numStr) tokens.push(Number(numStr));

  let temp = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '*') {
      let prev = temp.pop();
      temp.push(prev * tokens[i+1]);
      i += 2;
    } else if (tokens[i] === '/') {
      let prev = temp.pop();
      if (tokens[i+1] === 0) return NaN;
      temp.push(prev / tokens[i+1]);
      i += 2;
    } else {
      temp.push(tokens[i]);
      i++;
    }
  }
  
  let res = temp[0];
  for (let j = 1; j < temp.length; j += 2) {
    if (temp[j] === '+') res += temp[j+1];
    else if (temp[j] === '-') res -= temp[j+1];
  }
  return res;
}

// 🟢 แก้ไข Check_Equation ให้รองรับ = กี่ตัวก็ได้ และทุกข้างต้องเท่ากัน
function Check_Equation(tokens) {
  const expr = tokens.join("");
  const parts = expr.split("=");
  
  // ถ้าไม่มี = จะกลายเป็น 1 ก้อน (ซึ่งดักไว้แล้วใน Condition)
  if (parts.length < 2) return false;

  let firstVal = null;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") return false; // กรณี = ติดกัน เช่น 17==17
    
    const val = evaluateMathStr(parts[i]);
    if (isNaN(val)) return false;
    
    if (firstVal === null) {
      firstVal = val;
    } else {
      if (Math.abs(val - firstVal) > 1e-9) return false;
    }
  }
  
  return true;
}

// =============================
// Solver หลัก
// =============================
function solve(mode, filled, totalSlots, fixSlotsValues) {
  if (!Array.isArray(filled) || filled.length === 0) return [];
  let locks = [];
  let totalLen = mode === "fix" ? totalSlots : filled.length;

  if (mode === "fix") {
    for (let i = 0; i < totalSlots; i++) {
      const v = fixSlotsValues && fixSlotsValues[i];
      if (v && v !== "") locks.push({ position: i + 1, value: v });
    }
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
      solutionsMap.set(key, { tokens: expTokens.slice(), qPositions: qPos.slice() });
    } else {
      for (const p of qPos) {
        if (!existing.qPositions.includes(p)) existing.qPositions.push(p);
      }
    }
  }

  const perms = Permutations(filled);
  for (const perm of perms) {
    const seq = mode === "fix" ? add_pawn_js(perm, locks, totalLen) : perm;
    const expandedList = Expanded(seq);
    for (const exp of expandedList) {
      if (Condition(exp) && Check_Equation(exp)) {
        addSolution(seq, exp);
      }
    }
  }
  return Array.from(solutionsMap.values());
}

self.onmessage = (e) => {
  const { type, payload } = e.data || {};
  if (type === "solve") {
    const { mode, filled, totalSlots, fixSlotsValues } = payload;
    const start = performance.now();
    const result = solve(mode, filled, totalSlots, fixSlotsValues);
    const end = performance.now();
    self.postMessage({ type: "result", solutions: result, elapsedMs: end - start });
  }
};