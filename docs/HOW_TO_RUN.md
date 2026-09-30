# 퀴즈 앱 켜는 방법

> `index.html`을 더블클릭해서 열면 **동작하지 않습니다**(`file://` 주소에서는 덱 파일을 못 읽음).
> 아래 두 방법 중 하나로 켜세요.

## 방법 1. Live Server (VS Code, 추천)

1. VS Code에서 이 프로젝트 폴더(`quiz_system_project`)를 엽니다.
2. 왼쪽 파일 목록에서 `index.html`을 **마우스 오른쪽 클릭** → **"Open with Live Server"** 를 누릅니다.
   - 또는 VS Code 오른쪽 아래 상태 표시줄의 **"Go Live"** 를 누릅니다.
3. 브라우저가 자동으로 열립니다. (주소 예: `http://127.0.0.1:5500/index.html`)
4. 끌 때: 오른쪽 아래 **"Port : 5500"** 을 누르면 꺼집니다.

※ "Open with Live Server"가 안 보이면: 왼쪽 확장(Extensions, 네모 4개 아이콘) → `Live Server` 검색 → 설치.

## 방법 2. 터미널 명령어

1. VS Code에서 **Ctrl + `** (백틱, 숫자 1 왼쪽 키)로 터미널을 엽니다.
2. 아래를 입력하고 Enter:
   ```
   python3 -m http.server 8000
   ```
3. 브라우저 주소창에 `http://localhost:8000` 을 입력합니다.
4. 끌 때: 터미널을 클릭하고 **Ctrl + C**.

## 파일을 고친 뒤에는

- 브라우저에서 **새로고침(F5)**. 바뀐 게 안 보이면 **Ctrl + Shift + R**(강력 새로고침).

## 폰에서 풀 때

- GitHub에 올린(push) 뒤 GitHub Pages 주소로 접속합니다:
  `https://neojun6007.github.io/quiz_system_project/`
