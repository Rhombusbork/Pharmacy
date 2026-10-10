// 홈 화면은 두 가지 모양이 있다.
//   - 과목 선택 화면(subject 없음): 과목 목록 + 기록 백업 버튼 + 형식 오류 경고
//   - 과목 페이지(subject 있음): 그 과목의 덱 목록. 덱을 클릭하면 퀴즈 시작
// 어느 과목을 보여줄지는 main.js가 주소의 #과목명 을 읽어서 정해준다.

import { getDeckSummary, exportAll, importAll } from "../storage.js";

// entries: main.js의 buildDeckEntries()가 만든 배열.
//   - { path, fatal }                                  → 덱 전체 제외, 경고로만 표시
//   - { path, deck, questionErrors, validQuestions }    → 정상 표시 대상 (문제별 오류는 있을 수 있음)
// subject: 보여줄 과목명. 없거나 존재하지 않는 과목이면 과목 선택 화면을 그린다.
// callbacks: { onSelectSubject(subject|null), onSelectDeck(entry), onImported() }
export function renderHome(container, entries, subject, callbacks) {
  container.innerHTML = "";
  const bySubject = groupBySubject(entries);

  if (subject && bySubject.has(subject)) {
    renderSubjectPage(container, subject, bySubject.get(subject), callbacks);
    return;
  }

  const title = document.createElement("h1");
  title.textContent = "퀴즈 학습";
  container.appendChild(title);

  renderBackupControls(container, callbacks);
  renderErrorBox(container, entries);
  renderSubjectList(container, bySubject, callbacks);
}

// 정상인 덱들을 과목별로 묶는다. (오류가 있어도 정상 문제가 하나라도 있으면 포함)
// Map은 넣은 순서를 지키므로 과목 순서는 index.json에 처음 나온 순서가 된다.
function groupBySubject(entries) {
  const bySubject = new Map();
  for (const e of entries.filter((e) => !e.fatal)) {
    const subject = e.deck.subject;
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(e);
  }
  return bySubject;
}

// 과목 선택 화면의 과목 목록. 과목마다 덱 수와 문제 수를 보여준다.
function renderSubjectList(container, bySubject, callbacks) {
  const list = document.createElement("ul");
  list.className = "deck-list subject-list";

  for (const [subject, decks] of bySubject) {
    const item = document.createElement("li");
    item.className = "deck-item";

    const titleEl = document.createElement("div");
    titleEl.className = "deck-title";
    titleEl.textContent = subject;

    const countEl = document.createElement("div");
    countEl.className = "deck-count";
    const questionCount = decks.reduce((n, e) => n + e.validQuestions.length, 0);
    countEl.textContent = `덱 ${decks.length}개 · ${questionCount}문제`;

    item.appendChild(titleEl);
    item.appendChild(countEl);
    item.addEventListener("click", () => callbacks.onSelectSubject(subject));
    list.appendChild(item);
  }
  container.appendChild(list);
}

// 과목 페이지: 위쪽에 "← 과목 목록" 버튼, 그 아래 과목 이름과 덱 목록.
function renderSubjectPage(container, subject, decks, callbacks) {
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-button";
  backBtn.textContent = "← 과목 목록";
  backBtn.addEventListener("click", () => callbacks.onSelectSubject(null));
  container.appendChild(backBtn);

  const heading = document.createElement("h1");
  heading.textContent = subject;
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "deck-list";
  for (const e of decks) {
    list.appendChild(renderDeckItem(e, callbacks));
  }
  container.appendChild(list);
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
