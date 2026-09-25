// 퀴즈 진행·결과 수집만 담당한다. 문제 유형은 전혀 모른다(유형별 처리는 renderers가 한다).
// 덱 파일 구조도 모른다 — 입력은 오로지 "문제 배열"과 "세션 식별자(source)"뿐이다.

import { recordAnswer } from "./storage.js";

function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// questions: 문제 배열(각 항목은 최소한 id를 가짐), source: 세션 출처 식별자(예: deckId)
// 문제마다 전역 ID(`${source}/${id}`)를 붙여서 돌려준다.
export function createQuizSession(questions, source) {
  const withGlobalId = questions.map((q) => ({ ...q, qid: `${source}/${q.id}` }));
  const order = shuffledIndices(withGlobalId.length);
  let pos = 0;
  const results = [];

  return {
    total: withGlobalId.length,

    get currentIndex() {
      return pos;
    },

    current() {
      return withGlobalId[order[pos]];
    },

    isFinished() {
      return pos >= withGlobalId.length;
    },

    // answer: 렌더러가 onAnswer로 넘기는 값 { correct, response }
    submitAnswer(answer) {
      const q = withGlobalId[order[pos]];
      results.push({ qid: q.qid, correct: answer.correct, response: answer.response });
      pos += 1;
      recordAnswer(q.qid, answer.correct);
    },

    getResults() {
      return results;
    },
  };
}
