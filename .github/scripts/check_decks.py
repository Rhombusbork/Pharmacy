# 배포 전 덱 검사: 목록 파일, JSON 문법, 필수 필드, 객관식 정답, id 중복, 그림 파일 존재 여부
# 문제가 하나라도 있으면 실패(exit 1)하여 배포를 막는다.
import json
import os
import re
import sys

errors = []
try:
    index = json.load(open("decks/index.json", encoding="utf-8"))
except Exception as e:
    print(f"decks/index.json: 읽기 실패 — {e}")
    sys.exit(1)

seen_deck_ids = {}
for path in index.get("decks", []):
    full = os.path.join("decks", path)
    try:
        deck = json.load(open(full, encoding="utf-8"))
    except Exception as e:
        errors.append(f"{path}: JSON 오류 — {e}")
        continue
    for key in ("deckId", "subject", "title", "questions"):
        if key not in deck:
            errors.append(f"{path}: 머리말 '{key}' 없음")
    did = deck.get("deckId")
    if did in seen_deck_ids:
        errors.append(f"{path}: deckId '{did}'가 {seen_deck_ids[did]}와 중복")
    seen_deck_ids[did] = path
    ids = set()
    for q in deck.get("questions", []):
        qid = q.get("id")
        if qid in ids:
            errors.append(f"{path} (id {qid}): id 중복")
        ids.add(qid)
        if not q.get("question") or not q.get("answer"):
            errors.append(f"{path} (id {qid}): question 또는 answer 비어 있음")
        ch = q.get("choices")
        if ch is not None:
            if len(ch) < 2 or len(set(ch)) != len(ch):
                errors.append(f"{path} (id {qid}): 선지가 2개 미만이거나 중복")
            if q.get("answer") not in ch:
                errors.append(f"{path} (id {qid}): 정답이 선지에 없음")
        texts = [q.get("question", ""), q.get("explanation", "")] + (ch or [])
        for t in texts:
            for img in re.findall(r"\[\[img:([^|\]]+)", str(t)):
                if not os.path.exists(os.path.join("decks", img.strip())):
                    errors.append(f"{path} (id {qid}): 그림 없음 — {img.strip()}")

if errors:
    print("\n".join(errors))
    print(f"\n❌ 문제 {len(errors)}건 — 배포 중단")
    sys.exit(1)
print(f"✅ 덱 {len(index['decks'])}개 검사 통과")
