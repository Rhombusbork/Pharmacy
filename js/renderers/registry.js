// 문제 유형 ↔ 렌더러 매핑을 관리한다.
// 새 유형을 추가할 때는 렌더러 파일에서 registerRenderer()를 한 번 호출하고
// 그 파일을 main.js에서 import하기만 하면 된다. 엔진과 UI 코드는 손댈 필요가 없다.

const renderers = new Map();

export function registerRenderer(type, renderFn) {
  renderers.set(type, renderFn);
}

export function hasRenderer(type) {
  return renderers.has(type);
}

export function getRenderer(type) {
  const fn = renderers.get(type);
  if (!fn) throw new Error(`등록된 렌더러가 없는 유형: ${type}`);
  return fn;
}

// 문제 유형을 판단한다 (CLAUDE.md "유형 판단 규칙").
// type 필드가 있으면 그 값을 쓰고, 없으면 choices 유무로 판단한다.
// → 나중에 새 유형이 생겨도 type 필드가 없는 기존 덱 파일은 그대로 동작한다.
export function detectType(question) {
  if (typeof question.type === "string" && question.type) return question.type;
  return Array.isArray(question.choices) ? "mcq" : "short";
}
