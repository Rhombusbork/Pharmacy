// 홈 화면: 과목별로 덱 목록을 보여주고, 형식 오류가 있으면 위쪽에 모아 표시한다.
// 덱을 클릭하면 바로 그 덱의 퀴즈를 시작한다(화면 전환은 main.js가 담당).

import { getDeckSummary, exportAll, importAll } from "../storage.js";

// entries: main.js의 buildDeckEntries()가 만든 배열.
//   - { path, fatal }                                  → 덱 전체 제외, 경고로만 표시
//   - { path, deck, questionErrors, validQuestions }    → 정상 표시 대상 (문제별 오류는 있을 수 있음)
// callbacks: { onSelectDeck(entry), onImported() }
export function renderHome(container, entries, callbacks) {
  container.innerHTML = "";

  const title = document.createElement("h1");
  title.textContent = "퀴즈 학습";
  container.appendChild(title);

  renderBackupControls(container, callbacks);
  renderErrorBox(container, entries);
  renderDeckGroups(container, entries, callbacks);
}

// "기록 내보내기(JSON 다운로드)" / "기록 불러오기" 버튼.
// localStorage 접근은 하지 않고 storage.js의 exportAll/importAll만 호출한다.
function renderBackupControls(container, callbacks) {
  const box = document.createElement("div");
  box.className = "backup-controls";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "기록 내보내기";
  exportBtn.addEventListener("click", () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);

    const link = document.createElement("a");
    link.href = url;
    link.download = `quizapp-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  const importLabel = document.createElement("label");
  importLabel.className = "import-label";
  importLabel.textContent = "기록 불러오기";

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.hidden = true;
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = ""; // 같은 파일을 다시 골라도 change가 발생하게 초기화
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      const ok = window.confirm("지금 가지고 있는 기록을 불러온 파일 내용으로 덮어씁니다. 계속할까요?");
      if (!ok) return;
      if (!importAll(data)) {
        window.alert("이 파일은 퀴즈 기록 백업 파일이 아닙니다. 기존 기록은 그대로 두었습니다.");
        return;
      }
      window.alert("기록을 불러왔습니다.");
      callbacks.onImported();
    } catch (err) {
      console.error("[home] 기록 불러오기 실패:", err);
      window.alert("불러오기에 실패했습니다. 올바른 백업 파일(JSON)인지 확인해주세요.");
    }
  });

  importLabel.appendChild(importInput);
  box.appendChild(exportBtn);
  box.appendChild(importLabel);
  container.appendChild(box);
}

// 덱 전체 오류(fatal)와 문제별 오류를 "파일명 (+ id) : 이유" 형태로 모아 보여준다.
function renderErrorBox(container, entries) {
  const lines = [];

  for (const e of entries) {
    if (e.fatal) {
      lines.push(`⚠️ ${e.path}: ${e.fatal}`);
    } else if (e.questionErrors && e.questionErrors.length > 0) {
      for (const qe of e.questionErrors) {
        lines.push(`⚠️ ${e.path} (id ${qe.id}): ${qe.reasons.join(", ")}`);
      }
    }
  }

  if (lines.length === 0) return;

  const box = document.createElement("div");
  for (const text of lines) {
    const line = document.createElement("div");
    line.className = "deck-error";
    line.textContent = text;
    box.appendChild(line);
  }
  container.appendChild(box);
}

// 정상인 덱들을 과목별로 묶어서 목록으로 그린다. (오류가 있어도 정상 문제가 하나라도 있으면 표시)
function renderDeckGroups(container, entries, callbacks) {
  const usable = entries.filter((e) => !e.fatal);

  const bySubject = new Map();
  for (const e of usable) {
    const subject = e.deck.subject;
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(e);
  }

  for (const [subject, decks] of bySubject) {
    const group = document.createElement("div");
    group.className = "subject-group";

    const heading = document.createElement("h2");
    heading.textContent = subject;
    group.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "deck-list";

    for (const e of decks) {
      list.appendChild(renderDeckItem(e, callbacks));
    }

    group.appendChild(list);
    container.appendChild(group);
  }
}

function renderDeckItem(entry, callbacks) {
  const { deck, validQuestions, questionErrors } = entry;

  const item = document.createElement("li");
  item.className = "deck-item";

  const titleEl = document.createElement("div");
  titleEl.className = "deck-title";
  titleEl.textContent = deck.title ?? "(제목 없음)";

  const countEl = document.createElement("div");
  countEl.className = "deck-count";
  const total = deck.questions.length;
  countEl.textContent =
    questionErrors.length > 0
      ? `${validQuestions.length}문제 (전체 ${total}개 중 형식 오류 ${questionErrors.length}개 제외)`
      : `${total}문제`;

  item.appendChild(titleEl);
  item.appendChild(countEl);
  item.appendChild(renderScoreLine(deck.deckId));

  item.addEventListener("click", () => callbacks.onSelectDeck(entry));

  return item;
}

// 덱의 최근/최고 점수를 한 줄로 보여준다. 아직 한 번도 안 풀었으면 안내 문구만 표시.
function renderScoreLine(deckId) {
  const { recent, best } = getDeckSummary(deckId);
  const line = document.createElement("div");
  line.className = "deck-score";

  if (!recent) {
    line.textContent = "아직 풀지 않음";
    return line;
  }

  const pct = (s) => (s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0);
  const fmt = (s) => `${s.correct}/${s.total} (${pct(s)}%)`;
  line.textContent = `최근 ${fmt(recent)} · 최고 ${fmt(best)}`;
  return line;
}
