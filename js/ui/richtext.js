// 문제 문장·선지·해설 안의 구조식 표시를 그림으로 바꿔 그린다.
//   [[smi:SMILES]]                         → 분자 구조식
//   [[rxn:반응물>>생성물|화살표 위|화살표 아래]] → 반응식 (위·아래 글자는 생략 가능)
// 그림은 외부 라이브러리 SmilesDrawer(js/vendor/smiles-drawer.min.js, MIT)가 그리며,
// index.html에서 일반 <script>로 먼저 읽어 window.SmilesDrawer로 쓸 수 있다.

// [[smi:...]] / [[rxn:...]] 를 찾는 규칙. SMILES 안에도 ]가 들어갈 수 있으므로(예: [C@@H], [NH4+])
// "]]" 뒤에 ]가 더 이어지지 않는 첫 지점을 끝으로 본다.
const TOKEN = /\[\[(smi|rxn):(.+?)\]\](?!\])/g;

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

// 라이브러리가 해석할 수 있는 표시인지 확인한다. 해석 실패 이유(문자열) 또는 null을 돌려준다.
// 라이브러리를 못 읽은 경우에는 검사하지 않는다(null).
export function checkStructure(kind, value) {
  const lib = window.SmilesDrawer;
  if (!lib) return null;
  try {
    if (kind === "smi") {
      lib.Parser.parse(value);
    } else {
      const { smiles } = splitReaction(value);
      if (!smiles.includes(">")) return "반응식에 > 기호가 없음";
      lib.ReactionParser.parse(smiles);
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
      const drawer = new lib.SvgDrawer({ width: 240, height: 180, bondThickness: 1.2 });
      drawer.draw(lib.Parser.parse(value), svg, "light");
      // 라이브러리는 viewBox만 정하고 크기는 정하지 않는다. 크기가 없으면
      // 그림이 0으로 찌그러져 안 보일 수 있으므로 기본 크기를 직접 준다(CSS가 좁은 화면에서 줄임).
      svg.setAttribute("width", "240");
      svg.setAttribute("height", "180");
    } else {
      const { smiles, above, below } = splitReaction(value);
      const drawer = new lib.ReactionDrawer({}, { bondThickness: 1.2 });
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

function showFallback(wrap, value) {
  wrap.innerHTML = "";
  wrap.className = "structure structure-error";
  wrap.textContent = `[구조식 오류: ${value}]`;
}
