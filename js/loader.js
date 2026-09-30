// decks/index.json 과 그 안에 나열된 덱 파일들을 읽어오는 역할만 한다.
// (형식이 맞는지 검사하는 것은 3단계의 validator.js가 담당한다.)

const DECKS_BASE = "decks/";

// decks/index.json 을 읽어 { paths, error } 를 돌려준다.
// 파일이 없거나 형식이 깨졌으면 paths는 빈 배열, error에 이유를 담는다(홈 화면에 표시, 앱은 멈추지 않음).
async function loadDeckPaths() {
  try {
    const res = await fetch(`${DECKS_BASE}index.json`);
    if (!res.ok) throw new Error(`파일을 찾지 못함 (응답 ${res.status})`);
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("JSON 문법 오류 (쉼표·따옴표·괄호 확인)");
    }
    if (!Array.isArray(data?.decks)) throw new Error('"decks" 배열이 없음');
    const paths = data.decks.filter((p) => typeof p === "string" && p.trim() !== "");
    const skipped = data.decks.length - paths.length;
    return { paths, error: skipped > 0 ? `문자열이 아니거나 빈 경로 ${skipped}개를 건너뜀` : null };
  } catch (err) {
    console.error("[loader] 덱 목록을 읽지 못했습니다:", err);
    // fetch 자체가 실패하는 대표적인 경우: index.html을 더블클릭해서 file:// 로 연 경우
    const hint = location.protocol === "file:" ? " — 파일을 더블클릭하지 말고 Live Server로 여세요" : "";
    return { paths: [], error: `${err.message}${hint}` };
  }
}

// 덱 파일 하나를 읽는다. 성공하면 { ok: true, path, deck }, 실패하면 { ok: false, path, error } 를 돌려준다.
async function loadDeck(path) {
  try {
    const res = await fetch(`${DECKS_BASE}${path}`);
    if (!res.ok) throw new Error(`파일을 찾지 못함 (응답 ${res.status})`);
    let deck;
    try {
      deck = await res.json();
    } catch {
      throw new Error("JSON 문법 오류 (쉼표·따옴표·괄호 확인)");
    }
    return { ok: true, path, deck };
  } catch (err) {
    console.error(`[loader] 덱을 읽지 못했습니다 (${path}):`, err);
    return { ok: false, path, error: err.message };
  }
}

// index.json에 등록된 모든 덱을 읽어서 { indexError, results } 로 돌려준다.
// 하나가 실패해도 나머지는 계속 읽는다.
export async function loadAllDecks() {
  const { paths, error } = await loadDeckPaths();
  const results = await Promise.all(paths.map(loadDeck));
  return { indexError: error, results };
}

// 그림 경로(decks/ 기준) 목록 중 실제로 읽을 수 없는 것들을 Set으로 돌려준다.
// 파일 내용은 받지 않고 있는지만 확인한다(HEAD 요청).
export async function findMissingFiles(paths) {
  const missing = new Set();
  await Promise.all(
    [...new Set(paths)].map(async (path) => {
      try {
        const res = await fetch(`${DECKS_BASE}${path}`, { method: "HEAD" });
        if (!res.ok) missing.add(path);
      } catch {
        missing.add(path);
      }
    })
  );
  return missing;
}
