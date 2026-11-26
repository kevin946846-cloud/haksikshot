# 학식샷

[![e2e](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/e2e.yml/badge.svg)](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/e2e.yml) [![docker](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/docker.yml/badge.svg)](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/docker.yml) [![db](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/db.yml/badge.svg)](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/db.yml) [![secrets](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/secrets.yml/badge.svg)](https://github.com/kevin946846-cloud/haksikshot/actions/workflows/secrets.yml)

다래락 학식 메뉴의 실제 사진·평가·품절 정보를 모두가 함께 채우는 웹 서비스.
화면은 정적 HTML, 데이터·사진·익명 로그인·AI 확인은 Supabase, 배포는 Vercel.

**바로 써 보기: https://haksikshot.vercel.app**

**개발 블로그 (노션)**: [학식샷 개발 블로그](https://app.notion.com/p/4088857400b38157bf68e19c3e2fcd7a) · 1편 주제 제안 · 2편 GitHub·서버 연결 · 3편 테스트와 강의 적용 · 4편 자동 테스트·도커 전체 실행·사용 평가

<p>
  <img src="docs/screenshots/home.png" width="240" alt="첫 화면: 밥톨이가 오늘의 학식은? 하고 묻는 인트로">
  <img src="docs/screenshots/menu.png" width="240" alt="메뉴판: 메뉴마다 다른 SVG 아이콘">
  <img src="docs/screenshots/detail.png" width="240" alt="메뉴 상세: 사진이 있으면 사진, 없으면 큰 아이콘">
</p>

### 외국인 유학생도 쓰는 학식 앱 (한국어 / English)

부경대에는 외국인 유학생이 많지만 다래락 키오스크와 메뉴 이름은 한국어뿐이라, "이게 무슨 음식인지", "돼지고기가 들어가는지"를 알기 어렵습니다. 학식샷은 이걸 해결하는 것을 차별점으로 삼았습니다.

- **영어 화면**: 첫 화면이나 상단의 `KO / EN`으로 바꾸고, 처음 열 때는 기기 언어를 따릅니다. 메뉴판·추천·내 입맛·랭킹·월드컵·알림·AI 사진 확인 응답까지 영어로 나옵니다.
- **키오스크용 한국어 이름**: 영어 화면에서도 메뉴 이름 아래에 한국어 이름(예: Pork and Rice Soup → 돼지국밥)을 같이 보여 줘서, 키오스크에서 바로 찾을 수 있습니다.
- **메뉴 소개 43개**: 메뉴마다 한/영 한 줄 소개, 맵기(점 0~3개), 보통 들어가는 재료(돼지고기·소고기·닭고기·해산물·달걀·유제품·밀·메밀)를 붙였습니다. 할랄·채식·알레르기 확인에 도움이 되도록 했고, 일반 조리법 기준 추정이라 "직원에게 꼭 확인하세요" 안내를 함께 보여 줍니다. (`js/menu-info.js`)
- DB에 저장하는 값(분류·끼니·평가 선택지)은 한국어 그대로 두고 화면에서만 바꾸므로, 한국어 사용자와 영어 사용자의 기록·별점·랭킹이 하나로 합쳐집니다. (`js/i18n.js`)

<img src="docs/screenshots/english.png" width="720" alt="영어 화면: 첫 화면, 메뉴판(한국어 이름 함께), 메뉴 소개">

### 첫 화면: 밥톨이가 묻는다

앱을 열면 캐릭터 밥톨이가 가운데에서 "오늘의 학식은?" 하고 묻습니다. 밥톨이나 '메뉴판 보기'를 누르면 메뉴판으로, 분류(일품·양식·분식) 버튼을 누르면 그 분류로 바로 갑니다. 같은 탭에서 새로고침하면 첫 화면을 건너뜁니다.

### 메뉴 아이콘

메뉴 카드는 SVG 아이콘으로 보여 주고, 실제 사진은 카드를 눌러 상세 화면에서 봅니다.
아이콘 43개는 45도 위에서 내려다본 구도로, 그릇(뚝배기·면 그릇·접시·철판·공기)과 그 안의 내용물로 메뉴를 구분합니다.
메뉴 이름으로 자동 선택되므로 DB에 새 메뉴를 추가해도 가장 가까운 그림이 나옵니다. (`js/icons.js`)

<img src="docs/screenshots/icons.png" width="720" alt="메뉴 아이콘 43개 모음">

```
index.html                           화면 뼈대 (HTML만)
css/app.css                          스타일
js/data.js                           메뉴 기본 목록·맛 태그·시중 가격
js/core.js                           상태 저장, 한국 시간 날짜, 공통 도우미
js/icons.js                          메뉴 아이콘 SVG 43종 (45도 구도, 이름으로 자동 선택)
js/mascot.js                         캐릭터 밥톨이 (고민·환영·맛있음·아쉬움 표정)
js/i18n.js                           한국어/영어 전환 (L("한국어","English"), 저장값→표시 변환)
js/menu-info.js                      메뉴 소개 43개: 영문 이름, 한/영 소개, 맵기, 보통 들어가는 재료
js/views.js                          계산(추천·가성비)과 탭·상세 화면 그리기
js/worldcup.js / js/events.js        메뉴 월드컵 / 버튼·탭 이벤트
sync.js / config.js                  서버 연동 / Supabase 주소·공개 키
supabase/migrations/                 DB 구조 전체 (테이블, 보안 규칙, 함수, 사진 저장소)
supabase/functions/verify-photo      사진·품절 제보 AI 확인 (서버에서 실행)
docker-compose.yml, docker/          전체 스택 로컬 실행 (화면·게이트웨이·API·로그인·저장소·서버 함수·DB)
```

## 사용 평가 설문 (실사용자 테스트)

- 설문: https://haksikshot.vercel.app/survey (앱 화면과 분리된 페이지, 이 링크를 따로 공유)
- 결과: https://haksikshot.vercel.app/results (응답이 들어오면 30초마다 자동 갱신)

문항: 기본 정보(써 본 기간·학식 가는 횟수·기기) → 써 본 기능 → **사용성 척도 SUS 10문항**(필수) → 학식샷 기능 평가 5문항 → **추천 의향 NPS 0~10**(필수) → 주관식 3개.
앱과 같은 익명 로그인이라 1인 1응답(다시 내면 수정)이고, 이름·학번·연락처는 묻지 않습니다.
결과 화면은 DB 함수 `survey_summary()`가 집계한 숫자만 보여 주며, 응답자 중 실제로 앱에 먹음 체크·평가 기록이 있는 사람 수도 따로 셉니다.

## 설정 순서

1. **Supabase 프로젝트 만들기** (리전: Seoul). `Authentication > Sign In / Providers`에서 **Allow anonymous sign-ins**를 켭니다.
2. **DB 만들기**: `supabase/migrations/` 폴더의 파일을 이름 순서대로 `SQL Editor`에 붙여넣고 Run. (CLI가 있으면 `supabase db push`)
   그다음 `supabase/seed.sql`(기본 메뉴 43개)을 한 번 Run.
3. **키 넣기**: `config.js`에 Project URL과 anon key를 넣습니다. (`Project Settings > API`)
4. **AI 사진 확인** (선택, 없으면 사진은 '미확인'으로 올라가고 품절 제보는 막힘):
   [Google AI Studio](https://aistudio.google.com)에서 무료 Gemini 키를 발급받고
   ```bash
   npm i -g supabase && supabase login && supabase link --project-ref <프로젝트ID>
   supabase secrets set GEMINI_API_KEY=<키>
   supabase functions deploy verify-photo --no-verify-jwt
   ```
   모델 순서는 `GEMINI_PRIMARY_MODEL`(기본 `gemini-3.6-flash`) → `GEMINI_MODEL` secret으로 바꿀 수 있습니다.
5. **GitHub에 올리기**
   ```bash
   git init && git add . && git commit -m "학식샷 첫 배포"
   git branch -M main
   git remote add origin https://github.com/<아이디>/haksikshot.git
   git push -u origin main
   ```
6. **Vercel 배포**: vercel.com > Add New Project > 위 저장소 Import > Framework `Other` > Deploy. 이후 `git push`마다 자동 배포됩니다.

## 도커로 실행하기 (프론트·백엔드·DB 전부, 다른 컴퓨터에서 바로)

Docker만 설치돼 있으면 명령 하나로 학식샷 전체가 내 컴퓨터에서 뜹니다. Supabase 클라우드 계정·키가 없어도 됩니다.

```bash
git clone https://github.com/kevin946846-cloud/haksikshot.git
cd haksikshot
docker compose up -d --build      # 처음엔 이미지를 받느라 몇 분 걸림
# 브라우저에서 http://localhost:8080
```

```
브라우저 ──> web (nginx: 화면 + API 게이트웨이, :8080)
               ├─ /rest/v1      ──> rest      PostgREST: DB를 API로
               ├─ /auth/v1      ──> auth      GoTrue: 익명 로그인
               ├─ /storage/v1   ──> storage   사진 저장
               └─ /functions/v1 ──> functions edge-runtime: 사진 AI 확인(verify-photo) ──> Gemini
                                     │
                                    db (Postgres) <── migrate: 처음 뜰 때 supabase/migrations + seed.sql 적용
```

| 서비스 | 이미지 | 하는 일 |
|---|---|---|
| web | 이 저장소의 Dockerfile (nginx) | 화면, `/auth·rest·storage·functions/v1` 을 각 서비스로 넘기는 게이트웨이 |
| db | `supabase/postgres` | 데이터베이스 |
| rest | `postgrest/postgrest` | 앱의 `sb.from(...)`, `sb.rpc(...)` 요청을 SQL로 |
| auth | `supabase/gotrue` | 익명 로그인 |
| storage | `supabase/storage-api` | 메뉴 사진·품절 증거 파일 |
| functions | `supabase/edge-runtime` | `supabase/functions/verify-photo` 실행 |
| migrate | `supabase/postgres` | 마이그레이션·기본 메뉴 적용 후 종료 (다시 띄워도 이미 적용한 파일은 건너뜀) |

- 운영(haksikshot.vercel.app)과 **같은 코드·같은 DB 구조**입니다. 운영은 이 백엔드 부분을 Supabase 클라우드가 돌리고, 로컬은 같은 오픈소스 구성 요소를 Compose로 돌립니다. 데이터는 따로라 로컬에서 무엇을 해도 운영에 영향이 없습니다.
- 구성은 [Supabase 공식 self-hosting](https://github.com/supabase/supabase/tree/master/docker)에서 학식샷이 쓰는 것만 골랐습니다. 관리 화면·실시간·로그 분석은 빼서 가볍고, 실시간 갱신 대신 30초마다 다시 받기로 동작합니다.
- **사진 AI 확인**: `.env.example`을 `.env`로 복사하고 `GEMINI_API_KEY`를 넣은 뒤 `docker compose up -d`. 키가 없으면 사진은 '미확인'으로 올라가고 품절 제보는 막힙니다.
- 끄기: `docker compose down` / 데이터까지 지우고 처음부터: `docker compose down -v`
- 8080 포트가 이미 쓰이면 `.env`에 `WEB_PORT=8090`, `PUBLIC_URL=http://localhost:8090`
- 화면만 따로 띄우기(운영 Supabase에 연결): `docker build -t haksikshot . && docker run -p 8080:8080 haksikshot`
- GitHub Actions가 PR마다 Compose로 전체를 띄우고 E2E 테스트를 돌립니다 (`.github/workflows/e2e.yml`)

## 성능: 캐시와 인덱스

| 무엇 | 어디에 | 효과 |
| --- | --- | --- |
| 마지막으로 받은 데이터 캐시 | 브라우저 localStorage (`haksikshot-snap-v2`) | 앱을 다시 열면 네트워크를 기다리지 않고 바로 그림, 그 뒤 새 데이터로 교체 |
| 스크립트 캐시 | `vercel.json`, `docker/nginx.conf` | `css/`·`js/`·`sync.js`·`config.js`는 10분 캐시, `index.html`은 항상 새 버전 확인 |
| 백그라운드 탭 | `sync.js` | 탭이 안 보일 때는 30초마다 다시 받지 않음 |
| DB 인덱스 | `supabase/migrations/…_baseline.sql` | 주간 집계(meals.created_at), 투표(votes.week), 품절·사진(created_at) |

## 서버가 지키는 규칙
- 하루 3끼, 같은 메뉴 하루 1번 (DB 제약) / 1인 1메뉴 1평가
- '먹음 인증' 표시는 서버가 계산 (먹음 체크한 메뉴의 후기만)
- 사진은 오늘 먹음 체크한 사람만, 최근 7일 안 사진이 있으면 거절 (Edge Function)
- 사진·품절 기록은 클라이언트가 직접 쓸 수 없음 (service role만)
- 품절 표시는 매일 19시(한국 시간) 기준으로 이전 제보를 숨김

## 복구 코드
내 입맛 탭 맨 아래에서 코드를 만들고, 새 기기에서 "복구 코드로 입장"에 넣으면 먹음 체크·평가·투표 기록이 옮겨집니다. 이 기기의 현재 기록은 대체되며, 코드를 잃어버리면 복구할 수 없습니다.

## 알려진 한계
- 가입 없이 익명으로 쓰는 구조라, 복구 코드를 만들어 두지 않고 브라우저 데이터를 지우면 기록을 되찾을 수 없습니다.
- 복구 코드를 아는 사람은 그 기록을 가져갈 수 있습니다 (코드는 64비트 무작위, 서버에는 해시만 저장).
- 날짜·끼니·19시 초기화·주차는 휴대폰 시간대와 상관없이 모두 한국 시간 기준입니다 (서버와 같음).
- 메뉴 목록·영양 추정치는 `index.html` 안에 있습니다. 메뉴가 바뀌면 이 파일을 고치세요.
- AI 확인은 1인 하루(한국 시간) 사진 5번, 품절 제보 10번까지입니다. Edge Function secret `FOOD_DAILY_LIMIT`, `SOLD_DAILY_LIMIT`로 바꿀 수 있습니다.
- 사진이나 품절 증거가 바뀌면 예전 파일은 저장소에서 지웁니다. 표에서 가리키지 않는 파일(10분 지난 것)도 업로드 때마다 함께 정리합니다.

## 메뉴판 바꾸기 (코드 수정·배포 없이)

메뉴판은 Supabase `menus` 표에서 관리합니다. `Table Editor > menus`에서 고치면 앱이 10분 안에 받아서 반영합니다.

- 가격·이름·영양 추정치·맛 태그 변경: 해당 행을 고침
- 새 메뉴: 행 추가. id는 `일품 i숫자`, `양식 y숫자`, `분식 b숫자` 형식 (예: `i14`)
- 판매 중단: 행을 지우지 말고 `on_sale`을 `false`로 (예전 먹음 기록·후기가 메뉴 이름을 계속 찾을 수 있게)
- 앱에 내장된 기본 목록(`js/data.js`)은 첫 화면과 서버 장애 때만 쓰입니다. 앱 사용자는 이 표를 고칠 수 없습니다(읽기만 가능)

## DB 구조 관리 (마이그레이션)

테이블 관계: `menus`(메뉴판)를 `meals`(먹음 체크)·`reviews`(후기)·`votes`(가성비 투표)·`photos`(사진)·`sold`(품절)가 `menu_id` 외래 키로 참조하고,
사용자 기록(`meals`·`reviews`·`votes`·`wc_runs`·`recovery`)은 `auth.users`를 참조합니다. 없는 메뉴·없는 사용자 기록은 DB가 거절합니다.

DB 구조는 `supabase/migrations/` 폴더 하나에서 관리합니다. 파일 이름 앞의 숫자 순서대로 적용합니다.

- `20261124013700_baseline.sql`: 2026-11-24 운영 DB를 그대로 뽑은 기준점. 빈 Postgres에 적용해 운영과 같은지 비교해 확인함
- 그 뒤 파일: 기준점 이후 바뀐 것 하나씩
- 규칙: 운영 DB를 대시보드에서 직접 고치지 않고, 항상 이 폴더에 파일을 추가한 뒤 적용 (예전에는 이게 섞여서 버그가 생겼음)
- 예전에 흩어져 있던 SQL은 `supabase/archive/`에 참고용으로만 남김
- PR마다 GitHub Actions(`db`)가 빈 Postgres(PGlite)에 이 폴더를 적용해 보고, RLS·권한·횟수 제한 같은 핵심 규칙을 확인 (`tests/db`)

## 데이터 받는 양 줄이기 (집계 함수)

앱은 30초마다 서버 데이터를 다시 받습니다. 예전에는 후기 최대 3,000개, 월드컵 기록 최대 1,500판, 2주치 투표 전체를 받아 브라우저에서 평균을 계산했는데,
지금은 DB 함수(`menu_rating`, `recent_reviews`, `vote_counts`, `wc_stats`)가 계산해서 **메뉴별 결과만** 보냅니다.
데이터가 아무리 늘어도 받는 양은 "메뉴 수 × 몇 줄" 수준으로 고정됩니다. 후기 글은 메뉴별 최근 20개만 받습니다.

## 외부 CDN 없이 동작

supabase-js 라이브러리와 글꼴(Jua, Noto Sans KR)은 `vendor/`에 들어 있어 jsDelivr·Google Fonts에 접속하지 않습니다.
학교망처럼 CDN이 막힌 곳에서도 도커로 띄우면 화면이 뜹니다. (Supabase 주소 `*.supabase.co`만 열려 있으면 됩니다)
글꼴은 글자 범위별로 잘게 나뉘어 있어 화면에 쓰인 글자 파일만 내려받습니다.

## 자동 E2E 테스트

PR을 올릴 때마다 GitHub Actions가 `docker compose`로 학식샷 전체(화면·API·로그인·사진 저장·서버 함수·DB)를 띄우고, 실제 브라우저(Playwright)로 눌러 보며 36개 시나리오를 확인합니다. 테스트용 DB는 매번 새로 만들어졌다 사라지므로 **운영 DB를 전혀 건드리지 않습니다.**

| 묶음 | 내용 |
|---|---|
| 일반 흐름 (10) | 히어로, 식권 스텁, 아래 탭, 정렬, 먹음 체크, 평가, 투표, 월드컵 |
| 크리티컬 (5) | 하루 3끼 초과, 같은 메뉴 중복 평가, 19시 품절 초기화, 복구 코드로 기록 옮기기, 서버 장애 시 화면 |
| 서버 규칙 (7) | 화면을 거치지 않고 직접 요청해도 RLS·제약 조건·AI 횟수 제한이 막는지 |
| 서버 집계 (2) | 다른 사람 별점·후기·투표·월드컵 결과가 서버에서 합산돼 보이는지 |
| 시간대 (2) | 휴대폰 시간대가 미국·영국이어도 끼니·19시 초기화·주차·오늘 날짜가 한국 시간 기준인지 |
| 메뉴판 (3) | 내장 기본 목록 = DB 메뉴판, 앱은 메뉴판을 못 고침, DB 변경(가격·신메뉴·판매 중단)이 배포 없이 반영 |
| 메뉴 아이콘·캐릭터 (3) | 카드는 SVG 아이콘(43개 모두 다름), 사진은 눌러서 상세에서, 아이콘 잘림 없음, 캐릭터 밥톨이 |
| 사용 평가 설문 (1) | 설문 제출 → 결과 집계, 다시 내면 수정, 남의 응답 읽기·대신 쓰기 불가 |
| 오프라인 대비 (1) | Supabase 말고 바깥 주소를 모두 막아도 화면·글꼴·로그인이 되는지 |

내 컴퓨터에서 돌리기:

```bash
docker compose up -d --build
cd tests/e2e && npm ci && npx playwright install chromium
npx playwright test          # 기본 대상: http://localhost:8080 (로컬 Compose)
```

테스트마다 새 익명 사용자로 들어가고, 끝나면 자기 기록을 지웁니다.

## 개발 과정과 품질 관리

### 작업 흐름

```
기능 브랜치(feat/·fix/·docs/) → PR → CI 4종 통과 → squash 머지 → Vercel 자동 배포
```

- `main`에는 직접 푸시하지 않습니다. 보호 규칙으로 PR과 CI 통과(e2e·docker·secrets)가 있어야만 머지되고, 강제 푸시·삭제도 막혀 있습니다.
- 커밋 메시지는 `feat:` `fix:` `refactor:` `test:` `docs:` `chore:` 머리말과 함께 **왜 바꿨는지**를 한국어로 적습니다.
- PR 하나에 한 가지 목적만 담고, 본문에 변경 내용과 이유를 남깁니다. ([PR 목록](https://github.com/kevin946846-cloud/haksikshot/pulls?q=is%3Apr))

### CI (GitHub Actions)

| 워크플로 | 언제 | 하는 일 |
|---|---|---|
| `e2e` | 모든 PR, main 푸시 | `docker compose`로 전체 스택을 띄우고 Playwright로 36개 시나리오 확인 (운영 DB 미사용) |
| `docker` | 모든 PR, main 푸시 | 이미지 빌드 → 기본 설정으로 실행 → 화면·스크립트 응답 확인 |
| `db` | 마이그레이션·시드가 바뀐 PR | 빈 Postgres(PGlite)에 마이그레이션을 처음부터 적용해 깨지지 않는지, 두 번 적용해도 안전한지 확인 |
| `secrets` | 모든 PR, main 푸시 | gitleaks로 전체 커밋 이력의 API 키·토큰·비밀번호·개인 이메일 검사, PR 커밋 작성자 이메일이 noreply인지 확인 |

### CI가 머지 전에 잡아낸 문제 (실제 사례)

| PR | CI 실패 원인 | 고친 방법 |
|---|---|---|
| #19 메뉴 아이콘 43개 | 테스트 코드에 같은 이름 변수(`keys`)를 두 번 선언 | 변수 이름 분리 |
| #22 도커 전체 스택 | DB 볼륨이 이미지 데이터를 복사해 초기화 스크립트가 건너뛰어짐 | 볼륨에 `nocopy` 설정 |
| #22 도커 전체 스택 | 없는 역할(`supabase_functions_admin`)에 권한을 주는 SQL | 해당 줄 삭제 |
| #22 도커 전체 스택 | PostgREST 준비 확인(`--ready`)이 관리 서버 주소 없이 실패 | `PGRST_ADMIN_SERVER_HOST` 지정 |
| #23 사용 평가 설문 | 결과 화면 테스트가 로그인 전에 실행돼 사용자 정보가 비어 있음 | 테스트 단계 순서 조정 |

실패한 실행 기록은 [Actions](https://github.com/kevin946846-cloud/haksikshot/actions)에서 그대로 볼 수 있습니다.

### Docker 관리

- `docker compose up -d --build` 한 줄로 화면(nginx)·API 게이트웨이·PostgREST·Auth·Storage·Edge Function·Postgres·마이그레이션이 모두 뜹니다.
- 이미지 버전은 모두 고정(`supabase/postgres:17.6.1.136`, PostgREST `v14.18` 등)해 언제 띄워도 같은 환경이 됩니다.
- DB는 저장소의 `supabase/migrations/` + `seed.sql`로 매번 같은 상태로 만들어지고, 운영 DB와는 완전히 분리됩니다.
- 비밀값은 `.env`(커밋 안 됨)로 넣고, `.env.example`에 필요한 항목만 빈 값으로 둡니다.

### 비밀값·개인정보 원칙

- 서비스 롤 키, Gemini API 키 등 서버 비밀값은 저장소에 없습니다. 운영 값은 Supabase 대시보드(Edge Function secrets)에만 있습니다.
- `config.js`의 키는 브라우저용 **공개 키(anon/publishable)**이며, 실제 권한은 DB의 RLS 정책이 막습니다. (서버 규칙 E2E 7개가 직접 요청으로 검증)
- `docker-compose.yml`의 JWT 비밀값·키 기본값은 **로컬 실행 전용**으로 만든 값이라 운영 Supabase에서는 쓸 수 없습니다. (발급자 `supabase-local`)
- 커밋 작성자 이메일은 GitHub noreply 주소만 씁니다. 사용자 데이터는 익명 로그인으로만 모아 이름·학번·연락처를 받지 않습니다.
- 앱 안의 [개인정보 안내](https://haksikshot.vercel.app/privacy)에 모으는 정보, 보관 위치, 지우는 방법, 사진 공개 주의를 적었습니다.
- 배포 사이트는 보안 헤더(CSP: 스크립트는 자기 사이트만·외부 연결은 Supabase만, 다른 사이트에 끼워 넣기 금지, MIME 추측 금지, 카메라·위치 권한 차단)를 `vercel.json`에서 보냅니다.

