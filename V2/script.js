// ══════════════════════════════════════════════════════════════
// script.js (A-Math Pro Engine)
// ══════════════════════════════════════════════════════════════

const TILE_POINTS = {
  '0':1,'1':1,'2':1,'3':1,'4':2,'5':2,'6':2,'7':2,'8':2,'9':2,
  '10':3,'11':4,'12':3,'13':6,'14':4,'15':4,'16':4,'17':6,'18':4,'19':7,'20':5,
  '+':2,'-':2,'x':2,'÷':2,'+/-':1,'x/÷':1,'=':1,'?':0
};

const PAD_TILES = [
  {v:'1'},{v:'2'},{v:'3'},{v:'4'},{v:'5'},{v:'+'},
  {v:'6'},{v:'7'},{v:'8'},{v:'9'},{v:'10'},{v:'-'},
  {v:'11'},{v:'12'},{v:'13'},{v:'14'},{v:'15'},{v:'x'},
  {v:'16'},{v:'17'},{v:'18'},{v:'19'},{v:'20'},{v:'÷'},
  {v:'0',span:2},{v:'+/-'},{v:'x/÷'},{v:'?'},{v:'='},
];

const BONUS_CYCLE  = ['p1','p2','p3','e2','e3'];
const BONUS_LABELS = { p1:'P×1', p2:'P×2', p3:'P×3', e2:'E×2', e3:'E×3' };

const SPECIAL_MAP = {
  '+/-': ['+', '-'], 'x/÷': ['*', '/'], 'x': ['*'], '÷': ['/'],
  '?': ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','+','-','*','/','=']
};

const MARKS_SET = new Set(['=','+','-','*','/']);
const UNIT_SET  = new Set(['0','1','2','3','4','5','6','7','8','9']);
const TENS_SET  = new Set(['10','11','12','13','14','15','16','17','18','19','20']);

function mustBeNum(t) { return UNIT_SET.has(t) || TENS_SET.has(t); }
function mustBeOp(t)  { return t==='+' || t==='-' || t==='*' || t==='/'; }
function mustBeEq(t)  { return t==='='; }
function couldBeEq(t) { return t==='=' || t==='?'; }

// ── FAST TEMPLATE PRUNING ──
function ConditionTemplate(seq) {
  const n = seq.length;
  if (n === 0) return false;
  if (!seq.some(couldBeEq)) return false;
  const first = seq[0];
  if (first==='+' || first==='*' || first==='/' || mustBeEq(first)) return false;
  const last = seq[n-1];
  if (mustBeOp(last) || mustBeEq(last)) return false;

  for (let i = 0; i < n-1; i++) {
    const a = seq[i], b = seq[i+1];
    if ((mustBeOp(a)||mustBeEq(a)) && (mustBeOp(b)||mustBeEq(b))) {
      if (!(couldBeEq(a) && b==='-')) return false;
    }
    if (TENS_SET.has(a) && TENS_SET.has(b)) return false;
    if (mustBeNum(a) && mustBeNum(b)) {
      if ((TENS_SET.has(a)&&UNIT_SET.has(b)) || (UNIT_SET.has(a)&&TENS_SET.has(b))) return false;
    }
    if ((a==='/'||a==='-') && b==='0') return false;
  }
  return true;
}

function prefixOk(prefix, totalLen) {
  const n = prefix.length;
  if (n === 0) return true;
  const first = prefix[0];
  if (first==='+' || first==='*' || first==='/' || mustBeEq(first)) return false;
  if (n === totalLen) {
    if (!prefix.some(couldBeEq)) return false;
    const last = prefix[n-1];
    if (mustBeOp(last) || mustBeEq(last)) return false;
  }
  if (n >= 2) {
    const a = prefix[n-2], b = prefix[n-1];
    if ((mustBeOp(a)||mustBeEq(a)) && (mustBeOp(b)||mustBeEq(b))) {
      if (!(couldBeEq(a) && b==='-')) return false;
    }
    if (TENS_SET.has(a) && TENS_SET.has(b)) return false;
    if (mustBeNum(a) && mustBeNum(b)) {
      if ((TENS_SET.has(a)&&UNIT_SET.has(b)) || (UNIT_SET.has(a)&&TENS_SET.has(b))) return false;
    }
    if ((a==='/'||a==='-') && b==='0') return false;
  }
  return true;
}

function* permsGen(arr) {
  function* rec(remaining, prefix, totalLen) {
    if (!remaining.length) { yield prefix; return; }
    const seen = new Set();
    for (let i = 0; i < remaining.length; i++) {
      const v = remaining[i];
      if (seen.has(v)) continue; seen.add(v);
      const next = [...prefix, v];
      if (!prefixOk(next, totalLen)) continue;
      yield* rec(remaining.filter((_,j)=>j!==i), next, totalLen);
    }
  }
  yield* rec(arr, [], arr.length);
}

// ── STATE ──
let filled        = [];
let maxFilled     = 15;
let currentTarget = "top";
let mode          = "mode1";
let solutions     = [];
let shownCount    = 0;
let segments      = [];
let trailingEmpty = 0;
let bonusMap      = {};

// ── UI LOGIC ──
function tilePoint(v) { return TILE_POINTS[v] ?? 0; }
function makeTileEl(v, extraClass = '') {
  const el = document.createElement("div"); el.className = "pawn-slot" + (extraClass ? ' ' + extraClass : ''); el.textContent = v;
  const pt = document.createElement("span"); pt.className = "tile-pt"; pt.textContent = tilePoint(v); el.appendChild(pt);
  return el;
}

function buildPad() {
  const pad = document.getElementById("pawnPad"); pad.innerHTML = "";
  PAD_TILES.forEach(tile => {
    const wrap = document.createElement("div"); wrap.className = "pawn-btn-wrap" + (tile.span === 2 ? " zero" : "");
    const btn = document.createElement("input"); btn.type = "button"; btn.value = tile.v; wrap.appendChild(btn);
    const ptBadge = document.createElement("span"); ptBadge.className = "pad-pt"; ptBadge.textContent = tilePoint(tile.v); wrap.appendChild(ptBadge);
    wrap.addEventListener("click", () => handlePadClick(tile.v)); pad.appendChild(wrap);
  });
}

function handlePadClick(v) {
  if (currentTarget === "top") {
    if (filled.length < maxFilled) { filled.push(v); renderTop(); } else alert("Rack is full!");
  } else if (currentTarget && currentTarget._segIdx !== undefined) {
    const si = currentTarget._segIdx, ti = currentTarget._tileIdx; segments[si].tiles[ti] = v;
    if (ti+1 < segments[si].tiles.length && segments[si].tiles[ti+1]==="") currentTarget = { _segIdx: si, _tileIdx: ti+1 };
    buildSegmentUI();
  }
}

function renderTop() {
  const box = document.getElementById("topDisplay"); box.innerHTML = "";
  filled.forEach(v => box.appendChild(makeTileEl(v)));
  if (currentTarget === "top") box.classList.add("targeting"); else box.classList.remove("targeting");
}

function buildSegmentUI() {
  const builder = document.getElementById("segmentBuilder"); builder.innerHTML = "";
  segments.forEach((seg, si) => {
    const row = document.createElement("div"); row.className = "seq-row";
    const lblB = document.createElement("span"); lblB.textContent = "Space Before:"; lblB.style.fontSize = "13px"; lblB.style.color = "var(--text-muted)";
    const inp = document.createElement("input"); inp.type = "number"; inp.min = "0"; inp.value = seg.before; inp.className = "empty-input";
    inp.addEventListener("input", () => { segments[si].before = Math.max(0, parseInt(inp.value)||0); updatePreview(); });
    row.appendChild(lblB); row.appendChild(inp);
    
    const div = document.createElement("div"); div.style.flex = "1"; row.appendChild(div);
    const btnAdd = document.createElement("button"); btnAdd.className = "btn-action add"; btnAdd.textContent = "+ Tile";
    btnAdd.addEventListener("click", () => { segments[si].tiles.push(""); buildSegmentUI(); }); row.appendChild(btnAdd);
    
    if (seg.tiles.length > 0) {
      const btnRem = document.createElement("button"); btnRem.className = "btn-action remove"; btnRem.textContent = "- Tile";
      btnRem.addEventListener("click", () => {
        segments[si].tiles.pop();
        if (currentTarget && currentTarget._segIdx===si && currentTarget._tileIdx>=segments[si].tiles.length) selectTopTarget();
        buildSegmentUI();
      });
      row.appendChild(btnRem);
    }
    
    const tileGroup = document.createElement("div"); tileGroup.style.cssText = "display:flex; gap:6px; width:100%; margin-top:8px; flex-wrap:wrap;";
    seg.tiles.forEach((t, ti) => {
      const slot = document.createElement("div"); slot.className = "tile-slot" + (t ? " filled" : ""); slot._segIdx = si; slot._tileIdx = ti; slot.textContent = t || "?";
      if (currentTarget && currentTarget._segIdx===si && currentTarget._tileIdx===ti) slot.classList.add("selected");
      slot.addEventListener("click", () => { currentTarget = slot; buildSegmentUI(); }); tileGroup.appendChild(slot);
    });
    row.appendChild(tileGroup); builder.appendChild(row);
  });
  
  const trailRow = document.createElement("div"); trailRow.className = "seq-row";
  const lblA = document.createElement("span"); lblA.textContent = "Space After:"; lblA.style.fontSize = "13px"; lblA.style.color = "var(--text-muted)";
  const inpA = document.createElement("input"); inpA.type = "number"; inpA.min = "0"; inpA.value = trailingEmpty; inpA.className = "empty-input";
  inpA.addEventListener("input", () => { trailingEmpty = Math.max(0, parseInt(inpA.value)||0); updatePreview(); });
  trailRow.appendChild(lblA); trailRow.appendChild(inpA); builder.appendChild(trailRow); updatePreview();
}

function addSegment() { segments.push({ before: 0, tiles: [] }); buildSegmentUI(); }
function removeSegment() {
  if (!segments.length) return; segments.pop();
  if (currentTarget && currentTarget._segIdx >= segments.length) selectTopTarget(); buildSegmentUI();
}

function computeSeqStructure() {
  const positions = [];
  for (const seg of segments) {
    for (let i = 0; i < seg.before; i++) positions.push({ type: 'empty' });
    for (const t of seg.tiles) positions.push({ type: 'fixed', value: t });
  }
  for (let i = 0; i < trailingEmpty; i++) positions.push({ type: 'empty' }); return positions;
}

function updatePreview() {
  const wrap = document.getElementById("seqPreview"); wrap.innerHTML = ""; const positions = computeSeqStructure();
  if (!positions.length) { wrap.innerHTML = '<span style="color:#64748b;font-size:13px;">No sequence defined</span>'; return; }
  positions.forEach((pos, i) => {
    const tileBox = document.createElement("div");
    if (pos.type === 'fixed') {
      tileBox.className = "preview-tile-box is-fixed"; tileBox.textContent = pos.value || "?";
    } else {
      const bonus = bonusMap[i] || 'p1'; tileBox.className = `preview-tile-box is-empty bonus-${bonus}`; tileBox.textContent = BONUS_LABELS[bonus];
      tileBox.addEventListener("click", () => {
        const idx = BONUS_CYCLE.indexOf(bonusMap[i] || 'p1'); bonusMap[i] = BONUS_CYCLE[(idx+1) % BONUS_CYCLE.length]; updatePreview();
      });
    }
    wrap.appendChild(tileBox);
  });
}

function selectTopTarget() { currentTarget = "top"; renderTop(); document.querySelectorAll(".tile-slot.selected").forEach(s => s.classList.remove("selected")); }

document.getElementById("btnBack").addEventListener("click", () => {
  if (currentTarget === "top") { filled.pop(); renderTop(); }
  else if (currentTarget && currentTarget._segIdx !== undefined) { segments[currentTarget._segIdx].tiles[currentTarget._tileIdx] = ""; buildSegmentUI(); }
});
document.getElementById("btnClear").addEventListener("click", () => {
  filled = []; segments = []; trailingEmpty = 0; bonusMap = {}; solutions = []; shownCount = 0;
  document.getElementById("solutionsContainer").innerHTML = `<div class="empty-state"><p>Cleared. Ready for new tiles.</p></div>`;
  selectTopTarget(); if (mode === "mode2") { addSegment(); buildSegmentUI(); } else renderTop();
});
document.getElementById("btnSubmit").addEventListener("click", runAMath);

document.getElementById("mode1").addEventListener("click", () => {
  mode = "mode1"; document.getElementById("mode1").classList.add("active"); document.getElementById("mode2").classList.remove("active");
  document.getElementById("mode2Panel").style.display = "none"; segments = []; trailingEmpty = 0; bonusMap = {}; selectTopTarget(); renderTop();
});
document.getElementById("mode2").addEventListener("click", () => {
  mode = "mode2"; document.getElementById("mode2").classList.add("active"); document.getElementById("mode1").classList.remove("active");
  document.getElementById("mode2Panel").style.display = "block"; if (!segments.length) addSegment(); buildSegmentUI(); selectTopTarget();
});

// ── FAST ENGINE LOGIC ──
function* expandGen(arr) {
  function* rec(i, cur) {
    if (i === arr.length) { yield cur; return; }
    const t = arr[i];
    if (t in SPECIAL_MAP) for (const op of SPECIAL_MAP[t]) yield* rec(i+1, [...cur, op]);
    else yield* rec(i+1, [...cur, t]);
  }
  yield* rec(0, []);
}

function Condition(seq) {
  if (!seq.includes('=')) return false;
  const first = seq[0], last = seq[seq.length-1];
  if ((MARKS_SET.has(first) && first !== '-') || MARKS_SET.has(last)) return false;
  for (let i = 0; i < seq.length-1; i++) {
    const a = seq[i], b = seq[i+1];
    if (MARKS_SET.has(a) && MARKS_SET.has(b) && !(a==='='&&b==='-')) return false;
    if (TENS_SET.has(a) && TENS_SET.has(b)) return false;
    if (UNIT_SET.has(a) && TENS_SET.has(b)) return false;
    if (TENS_SET.has(a) && UNIT_SET.has(b)) return false;
    if ((a==='/'||a==='-') && b==='0') return false;
  }
  let cnt = 0; for (const x of seq) { if (UNIT_SET.has(x)) { cnt++; if (cnt>3) return false; } else cnt=0; }
  let temp="";
  for (const x of seq) { if (!MARKS_SET.has(x)) temp += x; else { if (temp.length>=2 && temp[0]==='0') return false; temp=""; } }
  if (temp.length>=2 && temp[0]==='0') return false; return true;
}

// Custom Math Evaluator (Replaces eval)
function evaluateMathStr(str) {
  let tokens = []; let numStr = "";
  for (let i = 0; i < str.length; i++) {
    let c = str[i];
    if (c === '+' || c === '*' || c === '/') { if (numStr) tokens.push(Number(numStr)); numStr = ""; tokens.push(c); }
    else if (c === '-') { if (numStr) { tokens.push(Number(numStr)); numStr = ""; tokens.push(c); } else { numStr += c; } }
    else { numStr += c; }
  }
  if (numStr) tokens.push(Number(numStr));
  let temp = []; let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '*') { let prev = temp.pop(); temp.push(prev * tokens[i+1]); i += 2; }
    else if (tokens[i] === '/') { let prev = temp.pop(); if (tokens[i+1] === 0) return NaN; temp.push(prev / tokens[i+1]); i += 2; }
    else { temp.push(tokens[i]); i++; }
  }
  let res = temp[0];
  for (let j = 1; j < temp.length; j += 2) { if (temp[j] === '+') res += temp[j+1]; else if (temp[j] === '-') res -= temp[j+1]; }
  return res;
}

let _evalCache = new Map();
function cachedEval(exprStr) {
  if (_evalCache.has(exprStr)) return _evalCache.get(exprStr);
  let result = evaluateMathStr(exprStr); _evalCache.set(exprStr, result); return result;
}

function Check_Equation(seq) {
  const parts = []; let temp = [];
  for (const t of seq) { if (t==='=') { parts.push(temp); temp=[]; } else temp.push(t); } parts.push(temp);
  if (parts.length < 2) return false; // Must have at least one '='
  try {
    const vals = parts.map(p => { if (!p.length) return null; return cachedEval(p.join('')); });
    if (vals.some(v => v===null || isNaN(v) || !isFinite(v))) return false;
    return vals.every(v => Math.abs(v-vals[0]) < 1e-9); // All parts between '=' must be mathematically equal
  } catch { return false; }
}

function Permutations(arr) {
  if (!arr.length) return [[]]; if (arr.length===1) return [[arr[0]]];
  const res=[], seen=new Set();
  for (let i=0; i<arr.length; i++) {
    const v=arr[i]; if (seen.has(v)) continue; seen.add(v);
    for (const p of Permutations(arr.filter((_,j)=>j!==i))) res.push([v,...p]);
  }
  return res;
}

function Combinations(arr, k) {
  if (k===0) return [[]]; if (k>arr.length) return [];
  const res=[], seen=new Set();
  for (let i=0; i<=arr.length-k; i++) {
    const v=arr[i]; if (seen.has(v)) continue; seen.add(v);
    for (const c of Combinations(arr.slice(i+1),k-1)) res.push([v,...c]);
  }
  return res;
}

function* distributeGen(gapGroups, k, idx=0, partialDist=[], partialOff=[]) {
  if (idx === gapGroups.length) { if (k === 0) yield { dist: partialDist, offsets: partialOff }; return; }
  const gap = gapGroups[idx]; const maxUse = Math.min(k, gap.length);
  for (let use = 0; use <= maxUse; use++) {
    const maxOffset = use === 0 ? 0 : gap.length - use;
    for (let off = 0; off <= maxOffset; off++) {
      yield* distributeGen(gapGroups, k - use, idx + 1, [...partialDist, use], [...partialOff, off]);
    }
  }
}

function computeScore(subOrigSeq, subBonuses, rackUsedCount) {
  let sum=0, eMult=1;
  subOrigSeq.forEach((origToken,i)=>{
    const bonus=subBonuses[i]||'p1', pt=tilePoint(origToken);
    if (bonus==='p1') sum+=pt; else if (bonus==='p2') sum+=pt*2; else if (bonus==='p3') sum+=pt*3;
    else if (bonus==='e2') { sum+=pt; eMult*=2; } else if (bonus==='e3') { sum+=pt; eMult*=3; }
  });
  let score=sum*eMult; if (rackUsedCount>=8) score+=40; return score;
}

// ── UI ASYNC PROCESSING ──
function showLoading() { document.getElementById("loadingOverlay").classList.add("active"); setProgress(0,"Preparing..."); }
function hideLoading() { document.getElementById("loadingOverlay").classList.remove("active"); }
function setProgress(pct, detail) {
  const p=Math.min(100,Math.max(0,Math.round(pct)));
  document.getElementById("loadingPct").textContent=p+"%";
  document.getElementById("loadingBarFill").style.width=p+"%";
  if (detail) document.getElementById("loadingDetail").textContent=detail;
}
function yieldFrame() { return new Promise(r=>setTimeout(r,0)); }

async function runAMath() {
  solutions=[]; shownCount=0;
  const seenKey=new Set(); _evalCache=new Map();
  const minTiles=Math.max(1,parseInt(document.getElementById("minTileInput").value)||1);
  
  if (filled.length===0) { alert("Please add tiles to the rack first."); return; }
  showLoading(); await yieldFrame();

  if (mode==='mode1') {
    const allPerms=[...permsGen(filled)];
    const total=allPerms.length;
    const YIELD_MS=40; let lastYield=performance.now();

    for (let pi=0; pi<total; pi++) {
      const perm=allPerms[pi];
      if (perm.length>=minTiles && ConditionTemplate(perm)) {
        for (const exp of expandGen(perm)) {
          if (Condition(exp) && Check_Equation(exp)) {
            const key=exp.join('');
            if (!seenKey.has(key)) { seenKey.add(key); solutions.push({eq:exp, score:null, usedCount:filled.length}); }
          }
        }
      }
      const now=performance.now();
      if (now-lastYield>=YIELD_MS) {
        setProgress(((pi+1)/total)*100,`Checking ${pi+1}/${total} — ${solutions.length} found`);
        await yieldFrame(); lastYield=performance.now();
      }
    }
  } else {
    const positions=computeSeqStructure();
    if (!positions.length) { hideLoading(); alert("Please define a sequence first."); return; }
    if (positions.some(p=>p.type==='fixed'&&!p.value)) { hideLoading(); alert("Please fill all fixed tile slots."); return; }

    const gapGroups=[]; let curGap=null;
    positions.forEach((p,i)=>{ if (p.type==='empty') { if (!curGap) { curGap=[]; gapGroups.push(curGap); } curGap.push(i); } else curGap=null; });

    const rackCount=filled.length;
    const slotBonuses=positions.map((p,i)=>p.type==='fixed'?'p1':(bonusMap[i]||'p1'));
    const workUnits=[]; let totalWeight=0;

    for (let k=1; k<=rackCount; k++) {
      if (k<minTiles) continue;
      for (const rackSubset of Combinations(filled,k)) {
        const permCount=Permutations(rackSubset).length;
        for (const {dist,offsets} of distributeGen(gapGroups,k)) {
          workUnits.push({k,rackSubset,dist,offsets,weight:permCount}); totalWeight+=permCount;
        }
      }
    }

    if (!workUnits.length) { hideLoading(); alert(`No combinations use at least ${minTiles} tile(s).`); return; }
    setProgress(0,`Approx. ${totalWeight.toLocaleString()} permutations to check`); await yieldFrame();

    const YIELD_MS=40; let doneWeight=0, lastYield=performance.now();
    for (let wi=0; wi<workUnits.length; wi++) {
      const {k,rackSubset,dist,offsets,weight}=workUnits[wi];
      const filledSet=new Set();
      dist.forEach((useCount,gi)=>{ for (let j=0;j<useCount;j++) filledSet.add(gapGroups[gi][offsets[gi]+j]); });
      const active=[];
      positions.forEach((p,i)=>{ if (p.type==='fixed'||filledSet.has(i)) active.push(i); });

      let contiguous=true;
      for (let ii=1;ii<active.length;ii++) { if (active[ii]!==active[ii-1]+1){contiguous=false;break;} }

      if (!contiguous||!active.length) {
        doneWeight+=weight;
      } else {
        const subBonuses=active.map(i=>slotBonuses[i]);
        const sortedFilled=[...filledSet].sort((a,b)=>a-b);

        for (const perm of Permutations(rackSubset)) {
          const subOrigSeq=active.map(i=>{
            const p=positions[i]; if (p.type==='fixed') return p.value; return perm[sortedFilled.indexOf(i)];
          });

          if (!ConditionTemplate(subOrigSeq)) { doneWeight++; continue; }

          for (const exp of expandGen(subOrigSeq)) {
            if (Condition(exp) && Check_Equation(exp)) {
              const key=exp.join('')+'|'+active.join(',');
              if (!seenKey.has(key)) {
                seenKey.add(key);
                const score=computeScore(subOrigSeq,subBonuses,k);
                solutions.push({eq:exp,score,usedTiles:rackSubset,usedCount:k});
              }
            }
          }
          doneWeight++;
        }
      }
      const now=performance.now();
      if (now-lastYield>=YIELD_MS) {
        setProgress((doneWeight/totalWeight)*100, `${doneWeight.toLocaleString()} / ${totalWeight.toLocaleString()} checked — ${solutions.length} found`);
        await yieldFrame(); lastYield=performance.now();
      }
    }
    solutions.sort((a,b)=>b.score-a.score);
  }

  setProgress(100,`Done — ${solutions.length} solution${solutions.length!==1?'s':''} found`);
  await yieldFrame(); hideLoading(); renderSolutions();
}

// ── RENDER RESULTS ──
function getStyledEquation(tokens) {
  return tokens.map(t => {
    let beautified = t.replace(/\*/g,"×").replace(/\//g,"÷");
    if (t === '=') return `<span class="sol-eq">${beautified}</span>`;
    if (['+','-','*','/'].includes(t)) return `<span class="sol-op">${beautified}</span>`;
    return `<span class="sol-num">${beautified}</span>`;
  }).join('');
}

function computeLeftover(s) {
  if (s.usedTiles) {
    const rem=[...filled];
    for (const t of s.usedTiles) { const idx=rem.indexOf(t); if (idx!==-1) rem.splice(idx,1); }
    return rem;
  }
  return [];
}

function makeSolutionItem(s) {
  const div=document.createElement("div"); div.className="solution-item";
  const eqWrap=document.createElement("div");
  eqWrap.innerHTML = getStyledEquation(Array.isArray(s.eq) ? s.eq : s.eq.split(''));
  div.appendChild(eqWrap);
  
  const meta=document.createElement("div"); meta.className="solution-meta";
  if (s.score!==null) {
    const sc=document.createElement("span"); sc.className="solution-score"; sc.textContent=`${s.score} pts`; meta.appendChild(sc);
  }
  const leftover=computeLeftover(s);
  if (leftover.length===0 && mode !== 'mode1') {
    const b=document.createElement("span"); b.className="badge bingo"; b.textContent="BINGO"; meta.appendChild(b);
  } else if (leftover.length > 0) {
    const b=document.createElement("span"); b.className="badge left"; b.textContent="Left: "+leftover.map(t=>t==='*'?'×':t==='/'?'÷':t).join(","); meta.appendChild(b);
  }
  div.appendChild(meta); return div;
}

function renderSolutions() {
  const sc=document.getElementById("solutionsContainer"); sc.innerHTML="";
  if (!solutions.length) {
    sc.innerHTML=`<div class="empty-state"><p style="color:var(--danger)">No valid equations found.</p></div>`; return;
  }
  
  const show=solutions.slice(0,30); shownCount=show.length;
  show.forEach(s=>sc.appendChild(makeSolutionItem(s)));

  if (solutions.length>shownCount) {
    const moreBtn=document.createElement("button"); moreBtn.className="show-more-btn";
    moreBtn.textContent=`Show more (${solutions.length-shownCount} remaining)`;
    moreBtn.addEventListener("click",()=>{
      const more=solutions.slice(shownCount,shownCount+20); shownCount+=more.length;
      more.forEach(s=>sc.insertBefore(makeSolutionItem(s),moreBtn));
      moreBtn.textContent=shownCount>=solutions.length ?`All ${solutions.length} solutions shown` :`Show more (${solutions.length-shownCount} remaining)`;
      if(shownCount>=solutions.length) moreBtn.remove();
    });
    sc.appendChild(moreBtn);
  }
}

// ── INIT ──
buildPad(); selectTopTarget(); renderTop();