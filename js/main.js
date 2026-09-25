// 앱 시작점. 홈 ↔ 풀이 ↔ 결과 화면 전환을 담당한다.

import { loadAllDecks } from "./loader.js";
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

function showHome() {
  renderHome(app, deckEntries, { onSelectDeck: showQuiz, onImported: showHome });
}

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

async function start() {
  const loadResults = await loadAllDecks();
  deckEntries = buildDeckEntries(loadResults);
  showHome();
}

start();
