# 구조식 · 반응식 · 메커니즘 쓰는 법

`question`, `choices`, `explanation` 문자열 안 아무 데나 넣으면 그 자리에 그림이 나온다.

## 1. 구조식 `[[smi:SMILES]]`

```json
"question": "다음 화합물의 이름은? [[smi:c1ccccc1O]]"
```

- SMILES 예: 에탄올 `CCO` · 아세트산 `CC(=O)O` · 벤젠 `c1ccccc1` · L-알라닌 `N[C@@H](C)C(=O)O`
- 선지를 구조식으로 쓰면 `answer`도 똑같이 쓴다: `"answer": "[[smi:CC(=O)O]]"`
- 주관식 `answer`에는 쓰지 않는다(이름으로).

## 2. 반응식 `[[rxn:반응물>>생성물|위|아래]]`

```
[[rxn:C=CC>>CC(Br)C|HBr|CH₂Cl₂, 0 °C]]
```

- `>>` 왼쪽 반응물, 오른쪽 생성물. 여러 개면 `.`로 잇는다: `CCO.CC(=O)O>>CCOC(C)=O`
- `|위|아래`: 화살표 위·아래 글자(시약, 조건). 생략 가능. `?`를 쓰면 시약을 묻는 문제.
- 아래 첨자는 `₂ ₃` 문자로 직접 쓴다.

## 3. 전자 이동(굽은) 화살표 = 그림 파일 `[[img:경로|설명]]`

SMILES로는 굽은 화살표를 표현할 수 없으므로 그림으로 넣는다.

1. ChemDraw, Ketcher(무료) 등으로 메커니즘을 그려 **SVG 또는 PNG**로 저장
2. `decks/<과목>/images/`에 넣기 (예: `decks/orgchem/images/sn2-mechanism.svg`)
3. 문제에 경로 쓰기 (`decks/` 기준):
   ```
   [[img:orgchem/images/sn2-mechanism.svg|SN2 메커니즘]]
   ```

## 틀리면?

앱은 멈추지 않고, 홈 위쪽에 `파일명 (id N): 이유`가 뜨며 그 문제만 빠진다.
문법은 맞지만 **다른 분자**를 쓴 실수는 못 잡으니 그림을 눈으로 확인할 것.
