// 객관식 렌더러. 다른 렌더러(short.js 등)도 이 파일과 같은 모양의 render() 함수를 내보내야 한다.

import { registerRenderer } from "./registry.js";
import { renderRichText } from "../ui/richtext.js";

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// question: 문제 객체(전역 ID qid 포함), container: 그릴 DOM 요소
// onAnswer: 사용자가 답을 확정하면 호출 → { correct, response }
export function render(question, container, onAnswer) {
  container.innerHTML = "";

  const qText = document.createElement("p");
  qText.className = "question-text";
  renderRichText(qText, question.question);
  container.appendChild(qText);

  const choices = shuffleArray(question.choices);
  const list = document.createElement("div");
  list.className = "choice-list";
  container.appendChild(list);

  let answered = false;

  // 숫자 1~9 키로 선지를 고를 수 있게 한다. 답을 확정하면 이 리스너는 바로 해제한다.
  function onKeydown(e) {
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > choices.length) return;
    pick(choices[n - 1], list.children[n - 1]);
  }
  document.addEventListener("keydown", onKeydown);

  function pick(choice, btn) {
    if (answered) return;
    answered = true;
    document.removeEventListener("keydown", onKeydown);

    const correct = choice === question.answer;

    // 모든 선지 잠그고, 정답은 초록, 고른 오답은 빨강으로 표시
    [...list.children].forEach((b) => {
      b.disabled = true;
      if (b.dataset.choice === question.answer) b.classList.add("choice-correct");
    });
    if (!correct) btn.classList.add("choice-wrong");

    if (question.explanation) {
      const exp = document.createElement("p");
      exp.className = "explanation";
      renderRichText(exp, question.explanation);
      container.appendChild(exp);
    }

    onAnswer({ correct, response: choice });
  }

  choices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    // 번호는 글자로, 선지 내용은 구조식이 섞여 있을 수 있으므로 renderRichText로 그린다.
    btn.textContent = `${idx + 1}. `;
    renderRichText(btn, choice);
    btn.dataset.choice = choice;
    btn.addEventListener("click", () => pick(choice, btn));
    list.appendChild(btn);
  });
}

registerRenderer("mcq", render);
