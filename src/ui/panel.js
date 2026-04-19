const PANEL_ID = "cp-sensei-host";
let _shadow = null;
let _currentLevel = 1;

const $ = (id) => _shadow.querySelector("#" + id);

const KW = {
  cpp: new Set(["int","long","short","char","bool","float","double","void","auto",
    "unsigned","signed","const","static","virtual","override","class","struct",
    "template","typename","namespace","using","typedef","return","if","else",
    "for","while","do","switch","case","default","break","continue","new","delete",
    "nullptr","true","false","this","public","private","protected",
    "vector","map","unordered_map","set","unordered_set","pair","stack",
    "queue","deque","priority_queue","string","cout","cin","endl",
    "include","define","size_t","make_pair","push_back","emplace_back"]),
  python: new Set(["def","class","if","elif","else","for","while","return","import",
    "from","in","not","and","or","is","True","False","None","lambda","with","as",
    "try","except","finally","raise","yield","pass","break","continue","global",
    "nonlocal","del","assert","print","range","len","int","str","list","dict","set","tuple"]),
  java: new Set(["int","long","String","boolean","char","void","double","float","short",
    "byte","class","interface","enum","public","private","protected","static",
    "final","abstract","if","else","for","while","do","return","new","null",
    "true","false","import","package","extends","implements","super","this",
    "try","catch","finally","throw","throws","instanceof","ArrayList","HashMap"]),
};

function tokenise(src, lang) {
  const kws = KW[lang] || KW.cpp;
  const out = []; let i = 0; const n = src.length;
  while (i < n) {
    if (src[i]==="/" && src[i+1]==="/") {
      let j=i; while(j<n && src[j]!=="\n") j++;
      out.push({t:"cmt",v:src.slice(i,j)}); i=j; continue;
    }
    if (src[i]==="/" && src[i+1]==="*") {
      let j=i+2; while(j<n-1 && !(src[j]==="*"&&src[j+1]==="/")) j++; j+=2;
      out.push({t:"cmt",v:src.slice(i,j)}); i=j; continue;
    }
    if (src[i]==="#") {
      let j=i; while(j<n && src[j]!=="\n") j++;
      out.push({t:"cmt",v:src.slice(i,j)}); i=j; continue;
    }
    if (src[i]==='"') {
      let j=i+1; while(j<n && !(src[j]==='"'&&src[j-1]!=="\\")) j++; j++;
      out.push({t:"str",v:src.slice(i,j)}); i=j; continue;
    }
    if (src[i]==="'") {
      let j=i+1; while(j<n && !(src[j]==="'"&&src[j-1]!=="\\")) j++; j++;
      out.push({t:"str",v:src.slice(i,j)}); i=j; continue;
    }
    if (src[i]>="0" && src[i]<="9") {
      let j=i; while(j<n && /[\d.eExXabcdefABCDEF_]/.test(src[j])) j++;
      out.push({t:"num",v:src.slice(i,j)}); i=j; continue;
    }
    if (/[a-zA-Z_]/.test(src[i])) {
      let j=i; while(j<n && /\w/.test(src[j])) j++;
      const w=src.slice(i,j); out.push({t:kws.has(w)?"kw":"id",v:w}); i=j; continue;
    }
    out.push({t:src[i]==="\n"?"nl":"op",v:src[i]}); i++;
  }
  return out;
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function renderCode(src, lang) {
  return tokenise(src.trim(), lang).map(tok => {
    const e = esc(tok.v);
    switch(tok.t) {
      case "kw":  return `<b class="ck">${e}</b>`;
      case "str": return `<b class="cs">${e}</b>`;
      case "cmt": return `<i class="cc">${e}</i>`;
      case "num": return `<b class="cn">${e}</b>`;
      case "id":  return `<span class="ci">${e}</span>`;
      case "nl":  return "\n";
      default:    return e;
    }
  }).join("");
}

function stripMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .trim();
}

function parseHintContent(text) {
  const parts = []; const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last=0, m;
  while ((m=re.exec(text))!==null) {
    if (m.index>last) parts.push({type:"text", content:text.slice(last,m.index)});
    parts.push({type:"code", lang:m[1]||"cpp", content:m[2].trim()});
    last=m.index+m[0].length;
  }
  if (last<text.length) parts.push({type:"text", content:text.slice(last)});
  return parts;
}

function parseAnalysis(text) {
  const defs = [
    {emoji:"⏱",cls:"complexity", label:"COMPLEXITY"},
    {emoji:"🐛",cls:"correctness",label:"CORRECTNESS"},
    {emoji:"💥",cls:"failing",    label:"FAILING TEST"},
    {emoji:"💡",cls:"improvement",label:"IMPROVEMENT"},
  ];
  const anchors = defs.map(d=>d.emoji).join("|");
  const out=[];
  for (const d of defs) {
    const m=text.match(new RegExp(`${d.emoji}[^\\n]*\\n([\\s\\S]*?)(?=${anchors}|$)`));
    if (m) out.push({...d, body:m[1].trim()});
  }
  return out.length ? out : null;
}

function createHTML() {
  return `
  <div id="root">
    <div id="panel" class="hidden">
      <div id="rz"></div>
      <div id="hdr">
        <div class="dots">
          <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        </div>
        <span id="ttl">cp-sensei</span>
        <button id="cls">✕</button>
      </div>
      <div id="sbar">
        <span class="spulse"></span>
        <span class="scon">connected</span>
        <span class="sdot">·</span>
        <span class="ssub">AI Mentor</span>
      </div>
      <div id="body">
        <div id="idle">
          <div class="idle-line">
            <span class="icaret">❯</span>
            <span class="itext"> Awaiting your command<span id="cursor">▋</span></span>
          </div>
          <div class="idle-hint">Get a hint or analyze your code below.</div>
        </div>
      </div>
      <div id="lvbar">
        <span class="lvlabel">NEXT</span>
        <div id="segs">
          ${[1,2,3,4,5].map(i=>`<div class="seg" data-i="${i}"></div>`).join("")}
        </div>
        <span id="lvnum">1 / 5</span>
        <button id="plus" title="Next hint level">+</button>
      </div>
      <div id="ftr">
        <button class="cbtn hbtn" id="hbtn">
          <span class="bico">≡</span> Get Hint
        </button>
        <button class="cbtn abtn" id="abtn">
          <span class="bico">&lt;/&gt;</span> Analyze
        </button>
      </div>
    </div>
    <button id="tog" title="CP Sensei">
      <svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7c3aed"/>
            <stop offset="50%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#0ea5e9"/>
          </linearGradient>
          <filter id="gf" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="46" height="46" rx="13" fill="url(#tg)" filter="url(#gf)"/>
        <text x="7" y="30" font-family="'Courier New',monospace"
              font-size="18" font-weight="900" fill="#fff" letter-spacing="-1">&gt;_</text>
      </svg>
    </button>
  </div>`;
}

function loadCSS(root) {
  const s = document.createElement("style");
  s.textContent = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :host{all:initial}

  #root{
    position:fixed;bottom:20px;right:20px;
    z-index:2147483647;
    display:flex;flex-direction:column;align-items:flex-end;gap:14px;
    font-family:'Courier New',Courier,monospace;
  }

  #tog{
    width:50px;height:50px;border-radius:14px;
    background:transparent;border:none;cursor:pointer;padding:0;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 0 1px rgba(99,102,241,0.5),0 8px 28px rgba(99,102,241,0.6),0 2px 8px rgba(0,0,0,0.6);
    transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
    flex-shrink:0;
  }
  #tog:hover{
    transform:scale(1.13) rotate(-5deg);
    box-shadow:0 0 0 2px rgba(99,102,241,0.7),0 14px 36px rgba(99,102,241,0.8),0 4px 12px rgba(0,0,0,0.6);
  }
  #tog:active{transform:scale(.96)}

  #panel{
    width:375px;min-width:300px;max-width:640px;
    min-height:270px;max-height:82vh;
    background:#09091a;border-radius:14px;
    border:1px solid rgba(124,58,237,0.3);
    box-shadow:0 0 0 1px rgba(99,102,241,0.06) inset,0 0 60px rgba(124,58,237,0.12),0 32px 80px rgba(0,0,0,0.85);
    overflow:hidden;display:flex;flex-direction:column;
    transform-origin:bottom right;position:relative;
    transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .2s;
    animation:breathe 4s ease-in-out infinite;
  }
  @keyframes breathe{
    0%,100%{box-shadow:0 0 0 1px rgba(99,102,241,0.06) inset,0 0 60px rgba(124,58,237,0.12),0 32px 80px rgba(0,0,0,0.85)}
    50%    {box-shadow:0 0 0 1px rgba(99,102,241,0.06) inset,0 0 90px rgba(99,102,241,0.22),0 32px 80px rgba(0,0,0,0.85)}
  }
  #panel.hidden{transform:scale(.82) translateY(10px);opacity:0;pointer-events:none}
  #panel.visible{transform:scale(1) translateY(0);opacity:1;pointer-events:all}

  #rz{position:absolute;top:0;left:0;width:20px;height:20px;cursor:nw-resize;z-index:20}
  #rz::before{
    content:'';position:absolute;top:6px;left:6px;width:9px;height:9px;
    border-top:2px solid rgba(124,58,237,0.5);border-left:2px solid rgba(124,58,237,0.5);
    border-radius:2px;transition:border-color .15s;
  }
  #rz:hover::before{border-color:rgba(124,58,237,1)}

  #hdr{
    display:flex;align-items:center;gap:10px;padding:12px 15px;
    background:linear-gradient(135deg,rgba(124,58,237,0.22) 0%,rgba(99,102,241,0.09) 60%,rgba(14,165,233,0.06) 100%);
    border-bottom:1px solid rgba(124,58,237,0.22);flex-shrink:0;
  }
  .dots{display:flex;gap:6px;align-items:center}
  .dot{width:12px;height:12px;border-radius:50%}
  .dot.r{background:#ff5f57;box-shadow:0 0 6px rgba(255,95,87,0.6)}
  .dot.y{background:#febc2e;box-shadow:0 0 6px rgba(254,188,46,0.5)}
  .dot.g{background:#28c840;box-shadow:0 0 6px rgba(40,200,64,0.5)}
  #ttl{flex:1;font-size:11px;font-weight:700;color:#8b8bc0;letter-spacing:.14em;font-family:monospace}
  #cls{
    width:24px;height:24px;border-radius:6px;background:transparent;border:none;
    cursor:pointer;color:#44445a;font-size:13px;
    display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;
  }
  #cls:hover{background:rgba(255,255,255,0.09);color:#e2e8f0}

  #sbar{
    display:flex;align-items:center;gap:7px;padding:5px 15px;
    background:rgba(255,255,255,0.015);border-bottom:1px solid rgba(255,255,255,0.04);
    font-size:10px;font-family:monospace;flex-shrink:0;
  }
  .spulse{
    width:6px;height:6px;border-radius:50%;background:#10b981;
    box-shadow:0 0 8px rgba(16,185,129,0.9);
    animation:sblink 2.2s ease-in-out infinite;flex-shrink:0;
  }
  @keyframes sblink{
    0%,100%{opacity:1;box-shadow:0 0 8px rgba(16,185,129,.9)}
    50%    {opacity:.4;box-shadow:0 0 3px rgba(16,185,129,.3)}
  }
  .scon{color:#10b981;font-weight:700}
  .sdot{color:#2a2a45}
  .ssub{color:#383860}

  #body{flex:1;overflow-y:auto;padding:16px;scrollbar-width:thin;scrollbar-color:#221e40 #09091a}
  #body::-webkit-scrollbar{width:3px}
  #body::-webkit-scrollbar-track{background:transparent}
  #body::-webkit-scrollbar-thumb{background:#221e40;border-radius:2px}

  #idle{padding:4px 0}
  .idle-line{display:flex;align-items:center;gap:8px;font-size:12px;color:#3a3a60}
  .icaret{color:#6366f1;font-size:14px}
  .itext{color:#3a3a60;font-family:monospace}
  #cursor{display:inline-block;color:#6366f1;animation:blink .9s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  .idle-hint{margin-top:8px;padding-left:22px;font-size:10px;color:#252540;font-family:sans-serif;font-style:italic}

  .obadge{
    display:inline-flex;align-items:center;gap:5px;
    font-size:9px;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;border-radius:5px;padding:2px 8px;
    margin-bottom:12px;font-family:monospace;
  }
  .obadge.hb{color:#a78bfa;background:rgba(124,58,237,0.14);border:1px solid rgba(124,58,237,0.32)}
  .obadge.ab{color:#38bdf8;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.28)}
  .osep{height:1px;background:linear-gradient(to right,rgba(124,58,237,0.4),transparent);margin-bottom:14px}

  .hlines{display:flex;flex-direction:column;gap:7px}
  .hline{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.85;color:#cac8ff;font-family:'Courier New',Courier,monospace;letter-spacing:.015em}
  .hbul{color:#7c3aed;flex-shrink:0;margin-top:3px;font-size:9px}
  .htxt{flex:1}

  .cblock{
    margin:12px 0;background:#0f0f2a;border-radius:9px;
    border:1px solid rgba(124,58,237,0.22);overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 0 1px rgba(99,102,241,0.06) inset;
  }
  .cblock-hdr{
    display:flex;align-items:center;justify-content:space-between;
    padding:6px 12px;background:rgba(124,58,237,0.1);
    border-bottom:1px solid rgba(124,58,237,0.15);
  }
  .clang{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;font-family:monospace}
  .cblock pre{
    margin:0;padding:14px;overflow-x:auto;
    font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.75;
    color:#d4d4d4;white-space:pre;scrollbar-width:thin;scrollbar-color:#221e40 #0f0f2a;
  }
  .cblock pre::-webkit-scrollbar{height:3px}
  .cblock pre::-webkit-scrollbar-thumb{background:#221e40;border-radius:2px}
  .ck{font-style:normal;font-weight:bold;color:#569cd6}
  .cs{font-style:normal;font-weight:normal;color:#ce9178}
  .cc{font-style:italic;font-weight:normal;color:#6a9955}
  .cn{font-style:normal;font-weight:normal;color:#b5cea8}
  .ci{color:#9cdcfe}

  .vmore{
    display:block;width:100%;margin-top:14px;padding:5px 0;
    background:rgba(124,58,237,0.07);border:1px solid rgba(124,58,237,0.22);
    border-radius:6px;color:#7c3aed;font-family:monospace;
    font-size:10px;letter-spacing:.08em;cursor:pointer;text-align:center;
    transition:background .18s,border-color .18s;
  }
  .vmore:hover{background:rgba(124,58,237,0.16);border-color:rgba(124,58,237,0.45)}

  .asec{margin-bottom:17px}
  .ahdr{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:monospace;display:flex;align-items:center;gap:7px;margin-bottom:6px}
  .ahdr.complexity{color:#60a5fa}
  .ahdr.correctness{color:#fb923c}
  .ahdr.failing{color:#f87171}
  .ahdr.improvement{color:#34d399}
  .ahr{height:1px;margin-bottom:9px}
  .ahr.complexity{background:linear-gradient(to right,rgba(96,165,250,.3),transparent)}
  .ahr.correctness{background:linear-gradient(to right,rgba(251,146,60,.3),transparent)}
  .ahr.failing{background:linear-gradient(to right,rgba(248,113,113,.3),transparent)}
  .ahr.improvement{background:linear-gradient(to right,rgba(52,211,153,.3),transparent)}
  .abdy{font-family:'Courier New',Courier,monospace;font-size:11.5px;line-height:1.9;color:#8080a8;padding-left:12px;border-left:2px solid rgba(255,255,255,0.05);white-space:pre-wrap;word-break:break-word}

  .eline{display:flex;gap:8px;align-items:center;font-family:monospace;font-size:11.5px;color:#f87171;padding:6px 0}

  #lvbar{
    display:flex;align-items:center;gap:9px;padding:9px 15px;
    background:rgba(124,58,237,0.06);border-top:1px solid rgba(255,255,255,0.04);flex-shrink:0;
  }
  .lvlabel{font-size:9px;font-weight:700;color:#35355a;letter-spacing:.16em;font-family:monospace}
  #segs{display:flex;gap:4px;flex:1}
  .seg{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.07);transition:background .3s,box-shadow .3s}
  .seg.on{background:linear-gradient(90deg,#7c3aed,#6366f1);box-shadow:0 0 7px rgba(124,58,237,0.8)}
  #lvnum{font-size:10px;color:#44445a;font-family:monospace;font-weight:700}
  #plus{
    width:22px;height:22px;border-radius:6px;
    background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.38);
    color:#a78bfa;font-size:17px;font-family:monospace;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:background .18s,transform .12s;user-select:none;line-height:1;
  }
  #plus:hover:not(:disabled){background:rgba(124,58,237,0.3);transform:scale(1.12)}
  #plus:active:not(:disabled){transform:scale(.9)}
  #plus:disabled{opacity:.22;cursor:not-allowed}

  #ftr{display:flex;gap:8px;padding:11px 15px;background:#09091a;border-top:1px solid rgba(255,255,255,0.04);flex-shrink:0}
  .cbtn{
    flex:1;padding:10px 10px;border-radius:9px;
    font-family:'Courier New',monospace;font-size:11.5px;font-weight:700;letter-spacing:.04em;
    cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px;
    transition:all .18s ease;position:relative;overflow:hidden;
  }
  .cbtn:disabled{opacity:.32;cursor:not-allowed;transform:none!important}
  .cbtn:active:not(:disabled){transform:scale(.96)}
  .hbtn{background:linear-gradient(135deg,#5b21b6 0%,#4338ca 100%);color:#ede9fe;box-shadow:0 4px 18px rgba(91,33,182,0.5),0 1px 3px rgba(0,0,0,0.5)}
  .hbtn:hover:not(:disabled){background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);box-shadow:0 6px 24px rgba(91,33,182,0.7),0 1px 3px rgba(0,0,0,0.5);transform:translateY(-1px)}
  .abtn{background:rgba(14,165,233,0.09);color:#38bdf8;border:1px solid rgba(14,165,233,0.3);box-shadow:0 2px 10px rgba(14,165,233,0.08)}
  .abtn:hover:not(:disabled){background:rgba(14,165,233,0.17);border-color:rgba(14,165,233,0.5);box-shadow:0 4px 18px rgba(14,165,233,0.22);transform:translateY(-1px)}
  .bico{font-size:13px;opacity:.9}
  `;
  root.appendChild(s);
}

function typewrite(container, lines, onDone) {
  let li = 0;
  function nextLine() {
    if (li >= lines.length) { onDone?.(); return; }
    const row = document.createElement("div");
    row.className = "hline";
    row.innerHTML = `<span class="hbul">◆</span><span class="htxt"></span>`;
    container.appendChild(row);
    const tx = row.querySelector(".htxt");
    const text = lines[li]; let ci = 0;
    const tick = setInterval(() => {
      tx.textContent = text.slice(0, ++ci);
      if (ci >= text.length) { clearInterval(tick); li++; setTimeout(nextLine, 50); }
    }, 13);
  }
  nextLine();
}

function buildHintDOM(text, container) {
  const parts = parseHintContent(text);
  for (const part of parts) {
    if (part.type === "code") {
      const blk = document.createElement("div");
      blk.className = "cblock";
      blk.innerHTML = `
        <div class="cblock-hdr"><span class="clang">${esc(part.lang)}</span></div>
        <pre>${renderCode(part.content, part.lang)}</pre>`;
      container.appendChild(blk);
    } else {
      const clean = stripMd(part.content);
      const lines = clean.split("\n").filter(l => l.trim());
      if (!lines.length) continue;
      const lw = document.createElement("div");
      lw.className = "hlines";
      container.appendChild(lw);
      typewrite(lw, lines);
    }
  }
}

function applyLevel(lvl) {
  _currentLevel = Math.min(5, Math.max(1, lvl));
  _shadow.querySelectorAll(".seg").forEach((s, i) => s.classList.toggle("on", i < _currentLevel));
  const lv  = $("lvnum");
  const btn = $("plus");
  if (lv)  lv.textContent = `${_currentLevel} / 5`;
  if (btn) btn.disabled   = _currentLevel >= 5;
}

function lock(which) {
  const h=$("hbtn"), a=$("abtn");
  if (!h||!a) return;
  h.disabled=true; a.disabled=true;
  if (which==="hint")    h.innerHTML=`<span class="bico">≡</span> thinking…`;
  if (which==="analyze") a.innerHTML=`<span class="bico">&lt;/&gt;</span> analyzing…`;
}

function unlock() {
  const h=$("hbtn"), a=$("abtn");
  if (!h||!a) return;
  h.disabled=false; a.disabled=false;
  h.innerHTML=`<span class="bico">≡</span> Get Hint`;
  a.innerHTML=`<span class="bico">&lt;/&gt;</span> Analyze`;
}

function displayHint(text) {
  if (!_shadow) return;
  const body = $("body");
  if (!body) return;

  body.innerHTML = `<div id="hout"><span class="obadge hb">≡ hint</span><div class="osep"></div></div>`;
  const out = body.querySelector("#hout");
  const parts = parseHintContent(text);
  const hasCode = parts.some(p => p.type === "code");

  if (hasCode) {
    buildHintDOM(text, out);
    return;
  }

  const rawLines = stripMd(text).split("\n").filter(l => l.trim());
  const LIMIT = 6;
  const truncated = rawLines.length > LIMIT;
  const container = document.createElement("div");
  container.className = "hlines";
  out.appendChild(container);

  typewrite(container, truncated ? rawLines.slice(0, LIMIT) : rawLines, () => {
    if (!truncated) return;
    const btn = document.createElement("button");
    btn.className = "vmore";
    btn.textContent = "▼ view more";
    out.appendChild(btn);
    btn.addEventListener("click", () => {
      container.innerHTML = "";
      btn.remove();
      typewrite(container, rawLines);
    });
  });
}

function displayAnalysis(text) {
  if (!_shadow) return;
  const body = $("body");
  if (!body) return;

  const sections = parseAnalysis(text);
  if (!sections) {
    body.innerHTML = `<div id="aout"><span class="obadge ab">&lt;/&gt; analysis</span><div class="osep"></div><div class="hlines" id="alines"></div></div>`;
    typewrite(body.querySelector("#alines"), text.split("\n").filter(l=>l.trim()));
    return;
  }

  body.innerHTML = `<div id="aout">
    <span class="obadge ab">&lt;/&gt; code analysis</span>
    <div class="osep"></div>
    ${sections.map(s=>`
      <div class="asec">
        <div class="ahdr ${s.cls}"><span>${s.emoji}</span><span>${s.label}</span></div>
        <div class="ahr ${s.cls}"></div>
        <div class="abdy">${esc(s.body)}</div>
      </div>`).join("")}
  </div>`;
}

function displayError(msg) {
  if (!_shadow) return;
  const body = $("body");
  if (!body) return;
  body.innerHTML = `<div class="eline"><span>✕</span><span>${esc(msg)}</span></div>`;
}

function initPanel() {
  if (document.getElementById(PANEL_ID)) return;
  const host = document.createElement("div");
  host.id = PANEL_ID;
  _shadow = host.attachShadow({ mode: "open" });
  _shadow.innerHTML = createHTML();
  loadCSS(_shadow);
  document.body.appendChild(host);
  attachListeners();
}

function attachListeners() {
  const tog   = $("tog");
  const panel = $("panel");
  const cls   = $("cls");
  const hbtn  = $("hbtn");
  const abtn  = $("abtn");
  const plus  = $("plus");
  const rz    = $("rz");

  tog.addEventListener("click", () => {
    panel.classList.remove("hidden");
    panel.classList.add("visible");
  });
  cls.addEventListener("click", () => {
    panel.classList.remove("visible");
    panel.classList.add("hidden");
  });

  plus.addEventListener("click", () => applyLevel(_currentLevel + 1));

  hbtn.addEventListener("click", () => {
    lock("hint");
    const lv = _currentLevel;
    chrome.runtime.sendMessage({ type: "GET_HINT", level: lv }, (res) => {
      if (res?.hint) {
        displayHint(res.hint);
        applyLevel(lv + 1);
      }
      unlock();
    });
  });

  abtn.addEventListener("click", () => {
    const code = window.__cpExtractCode?.(window.__cpDetectPlatform?.());
    if (!code) { displayError("No code found. Write some code first."); return; }
    lock("analyze");
    chrome.runtime.sendMessage({ type: "ANALYZE_CODE", code }, (res) => {
      if (res?.analysis) displayAnalysis(res.analysis);
      unlock();
    });
  });

  let drag=false, sx,sy,sw,sh;
  rz.addEventListener("mousedown", e => {
    drag=true; sx=e.clientX; sy=e.clientY;
    sw=panel.offsetWidth; sh=panel.offsetHeight;
    e.preventDefault();
  });
  document.addEventListener("mousemove", e => {
    if (!drag) return;
    panel.style.width  = Math.max(300,Math.min(640,sw+(sx-e.clientX)))+"px";
    panel.style.height = Math.max(270,sh+(sy-e.clientY))+"px";
  });
  document.addEventListener("mouseup", () => { drag=false; });

  applyLevel(1);
}

window.__cpSenseiInit            = initPanel;
window.__cpSenseiDisplayHint = displayHint;
window.__cpSenseiDisplayAnalysis = displayAnalysis;
