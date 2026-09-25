// decks/index.json 과 그 안에 나열된 덱 파일들을 읽어오는 역할만 한다.
// (형식이 맞는지 검사하는 것은 3단계의 validator.js가 담당한다.)

const DECKS_BASE = "decks/";

// decks/index.json 을 읽어 등록된 덱 파일 경로 배열을 돌려준다.
// 파일이 없거나 형식이 깨졌으면 빈 배열을 돌려주고 콘솔에 에러를 남긴다(앱이 멈추면 안 됨).
async function loadDeckPaths() {
  try {
    const res = await fetch(`${DECKS_BASE}index.json`);
    if (!res.ok) throw new Error(`index.json 응답 오류: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.decks)) throw new Error("index.json에 decks 배열이 없음");
    return data.decks;
  } catch (err) {
    console.error("[loader] 덱 목록을 읽지 못했습니다:", err);
    return [];
  }
}

// 덱 파일 하나를 읽는다. 성공하면 { ok: true, path, deck }, 실패하면 { ok: false, path, error } 를 돌려준다.
async function loadDeck(path) {
  try {
    const res = await fetch(`${DECKS_BASE}${path}`);
    if (!res.ok) throw new Error(`응답 오류: ${res.status}`);
    const deck = await res.json();
    return { ok: true, path, deck };
  } catch (err) {
    console.error(`[loader] 덱을 읽지 못했습니다 (${path}):`, err);
    return { ok: false, path, error: err.message };
  }
}

// index.json에 등록된 모든 덱을 읽어서 결과 배열로 돌려준다.
// 하나가 실패해도 나머지는 계속 읽는다.
export async function loadAllDecks() {
  const paths = await loadDeckPaths();
  const results = await Promise.all(paths.map(loadDeck));
  return results;
}
