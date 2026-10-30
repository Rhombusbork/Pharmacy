// 문제 문장·선지·해설 안의 구조식 표시를 그림으로 바꿔 그린다.
//   [[smi:SMILES]]                         → 분자 구조식
//   [[rxn:반응물>>생성물|화살표 위|화살표 아래]] → 반응식 (위·아래 글자는 생략 가능)
//   [[rxn:반응물>>?|화살표 위|화살표 아래]]     → 생성물 자리에 "?"를 그린 반응식(생성물 고르기 문제용)
//   [[img:경로|설명]]                        → 그림 파일 (경로는 decks/ 기준, 설명은 생략 가능)
// 그림은 외부 라이브러리 SmilesDrawer(js/vendor/smiles-drawer.min.js, MIT)가 그리며,
// index.html에서 일반 <script>로 먼저 읽어 window.SmilesDrawer로 쓸 수 있다.

// [[smi:...]] / [[rxn:...]] 를 찾는 규칙. SMILES 안에도 ]가 들어갈 수 있으므로(예: [C@@H], [NH4+])
// "]]" 뒤에 ]가 더 이어지지 않는 첫 지점을 끝으로 본다.
const TOKEN = /\[\[(smi|rxn|img):(.+?)\]\](?!\])/g;

// 글자 속 표시들을 [{ kind: "smi" | "rxn", value }] 로 뽑아 돌려준다(validator.js가 검사에 사용).
export function findStructures(text) {
  return [...String(text).matchAll(TOKEN)].map((m) => ({ kind: m[1], value: m[2].trim() }));
}

// 반응 표시 "반응SMILES|위|아래"를 나눈다. 위 글자를 아예 안 쓰면
// 반응 SMILES 가운데 칸(A>시약>B)의 시약을 분자식으로 보여준다.
function splitReaction(value) {
  const [smiles, above, below] = value.split("|");
  return { smiles: smiles.trim(), above: above ?? "{reagents}", below: below ?? "" };
}

// 생성물 자리가 "?"인 반응식인지 확인하고, 맞으면 반응물 SMILES 목록을 돌려준다(아니면 null).
// 예: "CC(=O)C>>?" → ["CC(=O)C"], "CCO.CC(=O)O>>?" → ["CCO", "CC(=O)O"]
function questionReactants(smiles) {
  const parts = smiles.split(">");
  if (parts.length !== 3 || parts[2].trim() !== "?") return null;
  return parts[0].split(".").map((s) => s.trim()).filter(Boolean);
}

// 그림 표시 "경로|설명"을 나눈다.
function splitImage(value) {
  const [path, alt] = value.split("|");
  return { path: path.trim(), alt: (alt ?? "").trim() };
}

// 그림 경로 규칙: decks/ 안의 상대 경로, 그림 확장자만 허용. 문제 있으면 이유, 없으면 null.
// (파일이 실제로 있는지는 여기서 알 수 없고, 그릴 때 못 읽으면 [그림 없음]으로 표시된다.)
function checkImagePath(path) {
  if (/^[a-z]+:|^\/|\.\./i.test(path)) return "그림 경로는 decks/ 기준 상대 경로여야 함";
  if (!/\.(svg|png|jpe?g|gif|webp)$/i.test(path)) return "그림 확장자가 아님(svg, png, jpg, gif, webp)";
  return null;
}

// 그리기 옵션. compactDrawing을 끄지 않으면 작은 분자(예: 아세트산)를 구조식 대신
// "COOHCH3" 같은 글자로 줄여 버리므로 끈다(12단계 스크린샷 점검에서 발견).
const DRAW_OPTIONS = { bondThickness: 1.2, compactDrawing: false };

// 표시가 올바른지 확인한다(구조식·반응식은 라이브러리로 해석해 봄). 해석 실패 이유(문자열) 또는 null을 돌려준다.
// 라이브러리를 못 읽은 경우에는 검사하지 않는다(null).
export function checkStructure(kind, value) {
  if (kind === "img") return checkImagePath(splitImage(value).path);
  const lib = window.SmilesDrawer;
  if (!lib) return null;
  try {
    if (kind === "smi") {
      lib.Parser.parse(value);
    } else {
      const { smiles } = splitReaction(value);
      if (!smiles.includes(">")) return "반응식에 > 기호가 없음";
      const reactants = questionReactants(smiles);
      if (reactants) {
        if (reactants.length === 0) return "반응물이 없음";
        reactants.forEach((r) => lib.Parser.parse(r));
      } else {
        lib.ReactionParser.parse(smiles);
      }
    }
    return null;
  } catch {
    return kind === "smi" ? "SMILES 해석 실패" : "반응식 해석 실패";
  }
}

// el 안에 text를 그린다. 일반 글자는 텍스트 노드로(HTML로 해석되지 않게) 넣고,
// [[smi:...]] / [[rxn:...]] 부분만 그림으로 바꾼다.
export function renderRichText(el, text) {
  const str = String(text);
  let last = 0;
  for (const match of str.matchAll(TOKEN)) {
    if (match.index > last) {
      el.appendChild(document.createTextNode(str.slice(last, match.index)));
    }
    el.appendChild(createStructure(match[1], match[2].trim()));
    last = match.index + match[0].length;
  }
  if (last < str.length) {
    el.appendChild(document.createTextNode(str.slice(last)));
  }
}

// 구조식/반응식 하나를 그림으로 만든다. 라이브러리가 없거나 표기가 잘못되어도
// 앱이 멈추지 않도록, 실패하면 원래 글자를 대신 보여준다.
function createStructure(kind, value) {
  if (kind === "img") return createImage(value);
  if (kind === "rxn" && window.SmilesDrawer && !checkStructure(kind, value)) {
    const { smiles, above, below } = splitReaction(value);
    const reactants = questionReactants(smiles);
    if (reactants) return createQuestionReaction(reactants, above, below);
  }
  const wrap = document.createElement("span");
  wrap.className = kind === "rxn" ? "structure reaction" : "structure";
  wrap.title = value;

  const lib = window.SmilesDrawer;
  if (!lib || checkStructure(kind, value)) {
    showFallback(wrap, value);
    return wrap;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrap.appendChild(svg);

  try {
    if (kind === "smi") {
      const drawer = new lib.SvgDrawer({ width: 240, height: 180, ...DRAW_OPTIONS });
      drawer.draw(lib.Parser.parse(value), svg, "light");
      // 라이브러리는 viewBox만 정하고 크기는 정하지 않는다. 크기가 없으면
      // 그림이 0으로 찌그러져 안 보일 수 있으므로 기본 크기를 직접 준다(CSS가 좁은 화면에서 줄임).
      svg.setAttribute("width", "240");
      svg.setAttribute("height", "180");
    } else {
      const { smiles, above, below } = splitReaction(value);
      const drawer = new lib.ReactionDrawer({}, DRAW_OPTIONS);
      drawer.draw(lib.ReactionParser.parse(smiles), svg, "light", null, above, below);
      // 반응식 그리기는 크기를 style로 정하므로, 폭은 옮겨 적고 높이는 viewBox 비율로 맞춘다
      // (화살표 위·아래 글자까지 들어가게). CSS가 좁은 화면에서 비율대로 줄인다.
      const vb = svg.viewBox.baseVal;
      const w = parseFloat(svg.style.width) || vb.width;
      svg.setAttribute("width", Math.round(w));
      svg.setAttribute("height", Math.round((w * vb.height) / vb.width));
      svg.style.width = "";
      svg.style.height = "";
    }
  } catch (err) {
    console.warn("구조식 그리기 실패:", value, err);
    showFallback(wrap, value);
  }
  return wrap;
}

// 분자 하나를 새 SVG에 그려 돌려준다.
function drawMolecule(smiles) {
  const lib = window.SmilesDrawer;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const drawer = new lib.SvgDrawer({ width: 240, height: 180, ...DRAW_OPTIONS });
  drawer.draw(lib.Parser.parse(smiles), svg, "light");
  svg.setAttribute("width", "240");
  svg.setAttribute("height", "180");
  return svg;
}

// 생성물 자리가 "?"인 반응식: 반응물 구조식(+로 연결) → 화살표(위·아래 글자) → "?"
// SmilesDrawer의 반응식 그리기는 생성물이 꼭 있어야 하므로, 이 경우만 직접 조립한다.
function createQuestionReaction(reactants, above, below) {
  const wrap = document.createElement("span");
  wrap.className = "structure reaction reaction-question";
  wrap.title = reactants.join(" + ") + " → ?";
  reactants.forEach((smiles, i) => {
    if (i > 0) {
      const plus = document.createElement("span");
      plus.className = "reaction-sign";
      plus.textContent = "+";
      wrap.appendChild(plus);
    }
    try {
      wrap.appendChild(drawMolecule(smiles));
    } catch (err) {
      console.warn("구조식 그리기 실패:", smiles, err);
      const span = document.createElement("span");
      showFallback(span, smiles);
      wrap.appendChild(span);
    }
  });
  wrap.appendChild(createArrow(above === "{reagents}" ? "" : above, below));
  const q = document.createElement("span");
  q.className = "reaction-sign reaction-unknown";
  q.textContent = "?";
  wrap.appendChild(q);
  return wrap;
}

// 위·아래에 글자가 있는 반응 화살표 SVG. 폭은 글자 길이에 맞춘다.
function createArrow(above, below) {
  const NS = "http://www.w3.org/2000/svg";
  const width = Math.max(90, 9 * Math.max(above.length, below.length) + 30);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", "70");
  svg.setAttribute("viewBox", `0 0 ${width} 70`);
  svg.setAttribute("class", "reaction-arrow");
  const line = document.createElementNS(NS, "path");
  line.setAttribute("d", `M5 35 H${width - 8} M${width - 16} 29 L${width - 5} 35 L${width - 16} 41`);
  line.setAttribute("stroke", "#222");
  line.setAttribute("stroke-width", "1.6");
  line.setAttribute("fill", "none");
  svg.appendChild(line);
  [[above, 26], [below, 56]].forEach(([label, y]) => {
    if (!label) return;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", width / 2);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "13");
    t.setAttribute("fill", "#222");
    t.textContent = label;
    svg.appendChild(t);
  });
  return svg;
}

// 그림 파일 하나를 만든다. 경로가 잘못됐거나 파일을 못 읽으면 [그림 없음: 경로]를 보여준다.
// 내 컴퓨터에만 두는 그림(.gitignore로 GitHub에 안 올라감)인지 확인한다.
export function isLocalOnlyImage(path) {
  return path.split("/").includes("local");
}

function createImage(value) {
  const { path, alt } = splitImage(value);
  const wrap = document.createElement("span");
  wrap.className = "structure figure";

  if (checkImagePath(path)) {
    wrap.className = "structure structure-error";
    wrap.textContent = `[그림 경로 오류: ${path}]`;
    return wrap;
  }

  const img = document.createElement("img");
  img.src = `decks/${path}`;
  img.alt = alt;
  if (alt) img.title = alt;
  img.addEventListener("error", () => {
    // decks/<과목>/local/ 그림은 저작권 때문에 GitHub에 올리지 않는 "내 컴퓨터 전용" 그림이다.
    // 없으면(= GitHub Pages) 오류 대신 조용히 숨긴다.
    if (isLocalOnlyImage(path)) {
      wrap.remove();
      return;
    }
    wrap.className = "structure structure-error";
    wrap.textContent = `[그림 없음: ${path}]`;
  });
  wrap.appendChild(img);
  return wrap;
}

function showFallback(wrap, value) {
  wrap.innerHTML = "";
  wrap.className = "structure structure-error";
  wrap.textContent = `[구조식 오류: ${value}]`;
}
