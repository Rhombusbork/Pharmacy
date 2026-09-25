// 기록 저장/조회. localStorage 접근은 이 파일에서만 한다.
// (나중에 저장 방식을 온라인 DB 등으로 바꿀 때 이 파일만 고치면 되게 하기 위함.)

const STORAGE_KEY = "quizapp:v1";
const MAX_ANSWER_LOG = 3000;
const MAX_SESSIONS = 500;

function defaultData() {
  return {
    version: 1,
    questionStats: {}, // qid -> { attempts, correct, lastAt }
    sessions: [], // { source, finishedAt, total, correct, results: [{ qid, correct }] }
    answerLog: [], // { qid, correct, at }
    bookmarks: [], // 나중 기능 자리 (현재는 미사용)
  };
}

// 저장된 데이터를 읽는다. 없거나 깨져 있으면 빈 기본 구조로 시작한다(앱이 멈추면 안 됨).
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();

    const data = JSON.parse(raw);
    const looksValid =
      typeof data === "object" &&
      data !== null &&
      typeof data.questionStats === "object" &&
      data.questionStats !== null &&
      Array.isArray(data.sessions) &&
      Array.isArray(data.answerLog) &&
      Array.isArray(data.bookmarks);

    return looksValid ? data : defaultData();
  } catch (err) {
    console.error("[storage] 저장된 기록을 읽지 못해 기본값으로 시작합니다:", err);
    return defaultData();
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("[storage] 기록을 저장하지 못했습니다:", err);
  }
}

// 문제 하나를 풀 때마다(답이 확정될 때마다) 호출한다. 누적 통계와 풀이 로그를 갱신한다.
export function recordAnswer(qid, correct) {
  const data = load();
  const now = new Date().toISOString();

  const stat = data.questionStats[qid] ?? { attempts: 0, correct: 0, lastAt: null };
  stat.attempts += 1;
  if (correct) stat.correct += 1;
  stat.lastAt = now;
  data.questionStats[qid] = stat;

  data.answerLog.push({ qid, correct, at: now });
  if (data.answerLog.length > MAX_ANSWER_LOG) {
    data.answerLog = data.answerLog.slice(data.answerLog.length - MAX_ANSWER_LOG);
  }

  save(data);
}

// 한 세션(끝까지 푼 기록)을 저장한다.
// session: { source, finishedAt, total, correct, results: [{ qid, correct }] }
export function saveSession(session) {
  const data = load();
  data.sessions.push(session);
  if (data.sessions.length > MAX_SESSIONS) {
    data.sessions = data.sessions.slice(data.sessions.length - MAX_SESSIONS);
  }
  save(data);
}

// 문제 하나의 누적 통계를 돌려준다. 기록이 없으면 0으로 채운 기본값을 돌려준다.
export function getQuestionStats(qid) {
  const data = load();
  return data.questionStats[qid] ?? { attempts: 0, correct: 0, lastAt: null };
}

// 덱의 가장 최근 세션과 점수(정답률)가 가장 좋았던 세션을 돌려준다. 세션이 없으면 둘 다 null.
export function getDeckSummary(deckId) {
  const data = load();
  const deckSessions = data.sessions.filter((s) => s.source === deckId);
  if (deckSessions.length === 0) return { recent: null, best: null };

  const recent = deckSessions[deckSessions.length - 1];

  const rate = (s) => (s.total > 0 ? s.correct / s.total : 0);
  const best = deckSessions.reduce((a, b) => {
    if (rate(b) > rate(a)) return b;
    if (rate(b) < rate(a)) return a;
    return b.correct > a.correct ? b : a;
  });

  return { recent, best };
}

// 백업 내보내기/불러오기 (7단계 UI에서 연결 예정).
export function exportAll() {
  return load();
}

export function importAll(data) {
  save(data);
}
