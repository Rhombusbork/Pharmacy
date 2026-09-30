// 주관식 렌더러. mcq.js와 같은 모양(render(question, container, onAnswer))을 따른다.

import { registerRenderer } from "./registry.js";
import { renderRichText } from "../ui/richtext.js";

// 비교 전 정규화: 앞뒤 공백 제거 → 중간 공백 제거 → 영문 소문자화 → 유니코드 NFC 정규화
function normalize(s) {
  return s.trim().replace(/\s+/g, "").toLowerCase().normalize("NFC");
}

// answer가 배열이면 하나라도 일치하면 정답으로 본다.
function isCorrect(input, answer) {
  const candidates = Array.isArray(answer) ? answer : [answer];
  const normInput = normalize(input);
  return candidates.some((a) => normalize(a) === normInput);
}

// question: 문제 객체(전역 ID qid 포함), container: 그릴 DOM 요소
// onAnswer: 사용자가 답을 확정하면 호출 → { correct, response }. "맞은 걸로 처리"를 누르면 다시 호출된다.
export function render(question, container, onAnswer) {
  container.innerHTML = "";

  const qText = document.createElement("p");
  qText.className = "question-text";
  renderRichText(qText, question.question);
  container.appendChild(qText);

  const form = document.createElement("form");
  form.className = "short-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "short-input";
  input.autocomplete = "off";
  form.appendChild(input);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "제출";
  form.appendChild(submitBtn);

  container.appendChild(form);
  input.focus();

  let answered = false;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered) return;
    answered = true;

    const response = input.value;
    const correct = isCorrect(response, question.answer);

    input.disabled = true;
    submitBtn.disabled = true;

    const resultLine = document.createElement("p");
    resultLine.className = correct ? "short-result correct" : "short-result wrong";
    resultLine.textContent = correct ? "정답입니다." : "오답입니다.";
    container.appendChild(resultLine);

    if (!correct) {
      const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
      const ansLine = document.createElement("p");
      ansLine.className = "short-answer";
      renderRichText(ansLine, `정답: ${answers.join(" / ")}`);
      container.appendChild(ansLine);

      const fixBtn = document.createElement("button");
      fixBtn.type = "button";
      fixBtn.className = "fix-correct-btn";
      fixBtn.textContent = "맞은 걸로 처리";
      fixBtn.addEventListener("click", () => {
        fixBtn.disabled = true;
        resultLine.textContent = "정답으로 정정됨";
        resultLine.className = "short-result correct";
        onAnswer({ correct: true, response });
      });
      container.appendChild(fixBtn);
    }

    if (question.explanation) {
      const exp = document.createElement("p");
      exp.className = "explanation";
      renderRichText(exp, question.explanation);
      container.appendChild(exp);
    }

    onAnswer({ correct, response });
  });
}

registerRenderer("short", render);
