// 풀이 화면: 진행도 표시, 문제를 해당 유형 렌더러에 넘기기, 다음 버튼/Enter 처리.

import { createQuizSession } from "../engine.js";
import { getRenderer, detectType, hasRenderer } from "../renderers/registry.js";

// entry: { deck, validQuestions } (home.js가 다루는 것과 같은 모양)
// onFinish(results, deck, playedTotal): 세션이 끝나면 결과 화면으로 넘어가기 위해 호출
export function renderQuiz(container, entry, onFinish) {
  const { deck, validQuestions } = entry;

  // 아직 렌더러가 없는 유형(지금 단계에서는 주관식)은 자동으로 제외한다.
  // 나중에 renderers/short.js가 등록되면 이 필터를 거치지 않고 그대로 섞여 들어간다.
  const playable = validQuestions.filter((q) => hasRenderer(detectType(q)));

  container.innerHTML = "";

  if (playable.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = "이 덱은 지금 풀 수 있는 문제가 없습니다.";
    container.appendChild(msg);

    const backBtn = document.createElement("button");
    backBtn.textContent = "홈으로";
    backBtn.addEventListener("click", () => onFinish([], deck, 0));
    container.appendChild(backBtn);
    return;
  }

  const session = createQuizSession(playable, deck.deckId);

  const progress = document.createElement("div");
  progress.className = "quiz-progress";

  const qBox = document.createElement("div");
  qBox.className = "quiz-question";

  const nextBtn = document.createElement("button");
  nextBtn.className = "next-btn";
  nextBtn.textContent = "다음";
  nextBtn.hidden = true;

  container.appendChild(progress);
  container.appendChild(qBox);
  container.appendChild(nextBtn);

  // 렌더러가 onAnswer로 넘긴 채점 결과를 잠시 들고 있다가, "다음"으로 넘어갈 때 엔진에 확정해서 넘긴다.
  // 이렇게 미뤄 둬야 short.js의 "맞은 걸로 처리" 버튼이 엔진 코드를 건드리지 않고도
  // 넘어가기 전에 결과를 정정할 수 있다(onAnswer를 다시 호출해서 pendingAnswer를 덮어씀).
  let pendingAnswer = null;

  function onKeydown(e) {
    if (e.key === "Enter" && !nextBtn.hidden) {
      e.preventDefault();
      goNext();
    }
  }
  document.addEventListener("keydown", onKeydown);

  function goNext() {
    if (pendingAnswer) {
      session.submitAnswer(pendingAnswer);
    }
    showCurrent();
  }

  function showCurrent() {
    if (session.isFinished()) {
      document.removeEventListener("keydown", onKeydown);
      onFinish(session.getResults(), deck, playable.length);
      return;
    }

    const q = session.current();
    progress.textContent = `${session.currentIndex + 1} / ${session.total}`;
    nextBtn.hidden = true;
    pendingAnswer = null;
    qBox.innerHTML = "";

    const renderFn = getRenderer(detectType(q));
    renderFn(q, qBox, (answer) => {
      pendingAnswer = answer;
      nextBtn.hidden = false;
    });
  }

  nextBtn.addEventListener("click", goNext);
  showCurrent();
}
