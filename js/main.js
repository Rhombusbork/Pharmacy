// 앱 시작점. 홈 ↔ 풀이 ↔ 결과 화면 전환을 담당한다.

import { loadAllDecks, findMissingFiles } from "./loader.js";
import { findStructures } from "./ui/richtext.js";
import { validateDeckHeader, validateQuestions, findDuplicateDeckIds } from "./validator.js";
import { renderHome } from "./ui/home.js";
import { renderQuiz } from "./ui/quiz.js";
import { renderResult } from "./ui/result.js";
import { saveSession } from "./storage.js";

// 렌더러는 여기서 import만 해도 각 파일 안에서 스스로 등록된다(registerRenderer 호출).
// 새 유형을 추가할 때는 렌더러 파일 하나 추가 + 여기에 import 한 줄만 있으면 된다.
import "./renderers/mcq.js";
import "./renderers/short.js";

const app = document.getElementById("app");

// loader가 읽어온 결과를 validator로 검사해서, 화면이 바로 쓸 수 있는 형태로 정리한다.
// 반환값의 각 항목은 둘 중 하나다.
//   - { path, fatal: "이유" }                             → 덱 전체를 제외
//   - { path, deck, questionErrors, validQuestions }       → 정상(문제별 오류는 있을 수 있음)
function buildDeckEntries(loadResults) {
  // 1) 파일 읽기 실패 / 머리말 오류 → 덱 전체 제외 대상 걸러내기
  const headerChecked = loadResults.map((r) => {
    if (!r.ok) return { path: r.path, fatal: `파일을 읽지 못함 (${r.error})` };
    const headerErrors = validateDeckHeader(r.deck);
    if (headerErrors.length > 0) {
      return { path: r.path, fatal: `필수 항목 오류: ${headerErrors.join(", ")}` };
    }
    return { path: r.path, deck: r.deck };
  });

  // 2) 머리말을 통과한 덱들 사이에서 deckId 중복 검사
  const passedHeader = headerChecked.filter((r) => !r.fatal);
  const duplicateIds = findDuplicateDeckIds(
    passedHeader.map((r) => ({ path: r.path, deckId: r.deck.deckId }))
  );

  // 3) 문제별 검사 (헤더도 통과하고 deckId도 안 겹치는 덱만)
  return headerChecked.map((r) => {
    if (r.fatal) return r;
    if (duplicateIds.has(r.deck.deckId)) {
      return { path: r.path, fatal: `deckId "${r.deck.deckId}"가 다른 덱과 중복됨` };
    }
    const { questionErrors, validQuestions } = validateQuestions(r.deck.questions);
    return { path: r.path, deck: r.deck, questionErrors, validQuestions };
  });
}

let deckEntries = [];

// 지금 보고 있는 과목은 주소 끝의 #과목명 에 담는다.
// 이렇게 하면 과목 페이지를 즐겨찾기할 수 있고, 브라우저 뒤로가기로 과목 목록에 돌아갈 수 있다.
function currentSubject() {
  return decodeURIComponent(location.hash.slice(1)) || null;
}

function showHome() {
  renderHome(app, deckEntries, currentSubject(), {
    // 주소만 바꾸면 아래 hashchange 처리기가 화면을 다시 그린다.
    onSelectSubject: (subject) => {
      location.hash = subject ? encodeURIComponent(subject) : "";
    },
    onSelectDeck: showQuiz,
    onImported: showHome,
  });
  window.scrollTo(0, 0);
}

// 뒤로가기·앞으로가기 또는 과목 클릭으로 #과목명 이 바뀌면 홈 화면을 다시 그린다.
window.addEventListener("hashchange", () => {
  if (deckEntries.length > 0) showHome();
});

function showQuiz(entry) {
  renderQuiz(app, entry, (results, deck, playedTotal) => {
    // 문제를 하나라도 풀었으면 세션(한 번 끝까지 푼 기록)을 저장한다.
    if (results.length > 0) {
      saveSession({
        source: deck.deckId,
        finishedAt: new Date().toISOString(),
        total: results.length,
        correct: results.filter((r) => r.correct).length,
        results: results.map((r) => ({ qid: r.qid, correct: r.correct })),
      });
    }
    showResult({ deck, results, playedTotal });
  });
}

function showResult(data) {
  renderResult(app, data, { onHome: showHome });
}

// 정상 문제들이 쓰는 그림 파일([[img:...]])이 실제로 있는지 확인하고,
// 없는 그림을 쓰는 문제는 다른 형식 오류와 똑같이 제외하고 홈에 경고로 표시한다.
async function excludeMissingImages(entries) {
  const imagesOf = (q) =>
    [q.question, q.explanation, ...(q.choices ?? []), ...[q.answer].flat()]
      .filter((t) => typeof t === "string")
      .flatMap(findStructures)
      .filter((s) => s.kind === "img")
      .map((s) => s.value.split("|")[0].trim());

  const usable = entries.filter((e) => !e.fatal);
  const missing = await findMissingFiles(usable.flatMap((e) => e.validQuestions.flatMap(imagesOf)));
  if (missing.size === 0) return;

  for (const e of usable) {
    e.validQuestions = e.validQuestions.filter((q) => {
      const lost = imagesOf(q).filter((path) => missing.has(path));
      if (lost.length === 0) return true;
      e.questionErrors.push({ id: q.id, reasons: lost.map((path) => `그림 파일 없음: ${path}`) });
      return false;
    });
  }
}

async function start() {
  const { indexError, results } = await loadAllDecks();
  deckEntries = buildDeckEntries(results);
  await excludeMissingImages(deckEntries);
  // index.json 자체의 문제는 덱 오류와 같은 자리(홈 경고 상자)에 보여준다.
  if (indexError) deckEntries.unshift({ path: "decks/index.json", fatal: indexError });
  showHome();
}

start();
