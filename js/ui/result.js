// 결과 화면: 점수, 문제별 정답 여부와 누적 정답률을 보여준다.

import { getQuestionStats } from "../storage.js";

// data: { deck, results, playedTotal }
// callbacks: { onHome }
export function renderResult(container, data, callbacks) {
  const { deck, results } = data;
  container.innerHTML = "";

  const title = document.createElement("h1");
  title.textContent = "결과";
  container.appendChild(title);

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;

  const summary = document.createElement("p");
  summary.className = "result-summary";
  summary.textContent =
    total > 0 ? `${deck.title}: ${total}문제 중 ${correct}개 정답` : `${deck.title}: 풀 수 있는 문제가 없었습니다.`;
  container.appendChild(summary);

  if (total > 0) {
    const heading = document.createElement("h2");
    heading.textContent = "문제별 결과";
    container.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "result-list";
    results.forEach((r) => {
      const stat = getQuestionStats(r.qid);
      const rate = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;

      const li = document.createElement("li");
      li.className = r.correct ? "result-item correct" : "result-item wrong";

      const qidEl = document.createElement("span");
      qidEl.className = "result-qid";
      qidEl.textContent = `${r.qid} — ${r.correct ? "정답" : "오답"}`;

      const rateEl = document.createElement("span");
      rateEl.className = "result-rate";
      rateEl.textContent = `누적 정답률 ${rate}% (${stat.attempts}회 중 ${stat.correct}회)`;

      li.appendChild(qidEl);
      li.appendChild(rateEl);
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  const homeBtn = document.createElement("button");
  homeBtn.textContent = "홈으로";
  homeBtn.addEventListener("click", callbacks.onHome);
  container.appendChild(homeBtn);
}
