// 덱 형식을 검사한다. 이 파일은 화면을 모르고 순수하게 데이터만 검사한다(검증 결과 표시는 home.js가 담당).

import { findStructures, checkStructure } from "./ui/richtext.js";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

// 덱 머리말(deckId, subject, title, questions)이 있는지 검사한다.
// 오류가 있으면 문제 목록은 보지 않고 이 덱 전체를 제외해야 한다(반환값이 비어있지 않으면 그 뜻).
export function validateDeckHeader(deck) {
  const errors = [];
  if (!isNonEmptyString(deck?.deckId)) errors.push("deckId 없음");
  if (!isNonEmptyString(deck?.subject)) errors.push("subject 없음");
  if (!isNonEmptyString(deck?.title)) errors.push("title 없음");
  if (!Array.isArray(deck?.questions)) errors.push("questions 배열 없음");
  return errors;
}

// 헤더 검사를 통과한 덱들 사이에서 deckId가 겹치는지 검사한다.
// entries: [{ path, deckId }]  →  겹치는 deckId 집합을 돌려준다.
export function findDuplicateDeckIds(entries) {
  const counts = new Map();
  for (const { deckId } of entries) {
    counts.set(deckId, (counts.get(deckId) ?? 0) + 1);
  }
  const duplicated = new Set();
  for (const [deckId, count] of counts) {
    if (count > 1) duplicated.add(deckId);
  }
  return duplicated;
}

// 문제 안의 모든 글자(문제·선지·정답·해설)에서 [[smi:...]] / [[rxn:...]] / [[img:...]]를 찾아,
// 해석할 수 없는 것마다 "이유: 표기" 문자열을 돌려준다(해석 자체는 richtext.js가 담당).
function findBadStructures(q) {
  const texts = [q.question, q.explanation, ...(Array.isArray(q.choices) ? q.choices : []),
    ...(Array.isArray(q.answer) ? q.answer : [q.answer])].filter((t) => typeof t === "string");
  const bad = [];
  for (const { kind, value } of texts.flatMap(findStructures)) {
    const reason = checkStructure(kind, value);
    const msg = reason && `${reason}: ${value}`;
    if (msg && !bad.includes(msg)) bad.push(msg);
  }
  return bad;
}

// 문제 하나를 검사해서, 문제가 있으면 이유 배열을, 없으면 빈 배열을 돌려준다.
// seenIds: 지금까지 이 덱에서 확인한 id 집합 (호출하는 쪽에서 관리)
function validateQuestion(q, seenIds) {
  const reasons = [];
  const id = q?.id;

  if (!Number.isInteger(id)) {
    reasons.push("id가 정수가 아니거나 없음");
  } else if (seenIds.has(id)) {
    reasons.push("id가 이 덱 안에서 중복됨");
  }

  if (!isNonEmptyString(q?.question)) {
    reasons.push("question이 비어 있음");
  }

  const hasChoices = Object.prototype.hasOwnProperty.call(q ?? {}, "choices");

  if (hasChoices) {
    const choices = q.choices;
    if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isNonEmptyString)) {
      reasons.push("choices는 2개 이상의 빈 값 없는 배열이어야 함");
    } else if (new Set(choices).size !== choices.length) {
      reasons.push("choices에 똑같은 선지가 있음");
    } else if (!isNonEmptyString(q.answer) || !choices.includes(q.answer)) {
      reasons.push("answer가 choices 중 하나와 정확히 일치하지 않음");
    }
  } else {
    const a = q?.answer;
    if (Array.isArray(a)) {
      if (a.length === 0 || !a.every(isNonEmptyString)) {
        reasons.push("answer 배열이 비어 있거나 빈 값을 포함함");
      }
    } else if (!isNonEmptyString(a)) {
      reasons.push("answer가 비어 있음");
    }
  }

  reasons.push(...findBadStructures(q ?? {}));

  return reasons;
}

// 덱의 questions 배열을 검사해서, 문제별 오류 목록과 정상인 문제만 모은 배열을 돌려준다.
// 오류가 있는 문제는 제외하고, 나머지는 그대로 풀 수 있게 한다.
export function validateQuestions(questions) {
  const seenIds = new Set();
  const questionErrors = []; // [{ id, reasons }]
  const validQuestions = [];

  for (const q of questions) {
    const reasons = validateQuestion(q, seenIds);
    if (reasons.length > 0) {
      questionErrors.push({ id: Number.isInteger(q?.id) ? q.id : "(id 없음)", reasons });
    } else {
      seenIds.add(q.id);
      validQuestions.push(q);
    }
  }

  return { questionErrors, validQuestions };
}
