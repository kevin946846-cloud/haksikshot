# 학식샷

다래락 학식 메뉴의 실제 사진·평가·품절 정보를 모두가 함께 채우는 웹 서비스.
화면은 정적 HTML, 데이터·사진·익명 로그인·AI 확인은 Supabase, 배포는 Vercel.

```
index.html                           화면 뼈대 (HTML만)
css/app.css                          스타일
js/data.js                           메뉴 기본 목록·맛 태그·시중 가격
js/core.js                           상태 저장, 한국 시간 날짜, 공통 도우미
js/icons.js                          메뉴 아이콘 SVG 11종 (이름으로 자동 선택)
js/views.js                          계산(추천·가성비)과 탭·상세 화면 그리기
js/worldcup.js / js/events.js        메뉴 월드컵 / 버튼·탭 이벤트
sync.js / config.js                  서버 연동 / Supabase 주소·공개 키
supabase/migrations/                 DB 구조 전체 (테이블, 보안 규칙, 함수, 사진 저장소)
supabase/functions/verify-photo      사진·품절 제보 AI 확인 (서버에서 실행)
```

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
   모델이 바뀌면 `supabase secrets set GEMINI_MODEL=<모델명>` (기본 `gemini-2.5-flash`).
5. **GitHub에 올리기**
   ```bash
   git init && git add . && git commit -m "학식샷 첫 배포"
   git branch -M main
   git remote add origin https://github.com/<아이디>/haksikshot.git
   git push -u origin main
   ```
6. **Vercel 배포**: vercel.com > Add New Project > 위 저장소 Import > Framework `Other` > Deploy. 이후 `git push`마다 자동 배포됩니다.

## 도커로 실행하기 (다른 컴퓨터에서 바로 띄우기)

Docker만 설치돼 있으면 Node나 다른 도구 없이 같은 화면이 뜹니다. 데이터는 Supabase 클라우드를 그대로 쓰므로 인터넷 연결이 필요합니다.

```bash
git clone https://github.com/kevin946846-cloud/haksikshot.git
cd haksikshot
docker compose up -d --build
# 브라우저에서 http://localhost:8080
```

- 끄기: `docker compose down`
- 다른 Supabase 프로젝트로 띄우기: `docker-compose.yml`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 주석을 풀고 값 입력 (공개 anon 키만)
- GitHub Actions(`.github/workflows/docker.yml`)가 push마다 깨끗한 환경에서 이미지 빌드 → 실행 → 응답 확인을 자동으로 합니다

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

PR을 올릴 때마다 GitHub Actions가 앱을 도커로 띄우고, 실제 브라우저(Playwright)로 눌러 보며 31개 시나리오를 확인합니다.

| 묶음 | 내용 |
|---|---|
| 일반 흐름 (10) | 히어로, 식권 스텁, 아래 탭, 정렬, 먹음 체크, 평가, 투표, 월드컵 |
| 크리티컬 (5) | 하루 3끼 초과, 같은 메뉴 중복 평가, 19시 품절 초기화, 복구 코드로 기록 옮기기, 서버 장애 시 화면 |
| 서버 규칙 (7) | 화면을 거치지 않고 직접 요청해도 RLS·제약 조건·AI 횟수 제한이 막는지 |
| 서버 집계 (2) | 다른 사람 별점·후기·투표·월드컵 결과가 서버에서 합산돼 보이는지 |
| 시간대 (2) | 휴대폰 시간대가 미국·영국이어도 끼니·19시 초기화·주차·오늘 날짜가 한국 시간 기준인지 |
| 메뉴판 (3) | 내장 기본 목록 = 운영 DB, 앱은 메뉴판을 못 고침, DB 변경(가격·신메뉴·판매 중단)이 배포 없이 반영 |
| 메뉴 아이콘 (1) | 카드는 SVG 아이콘, 사진은 눌러서 상세에서 |
| 오프라인 대비 (1) | Supabase 말고 바깥 주소를 모두 막아도 화면·글꼴·로그인이 되는지 |

내 컴퓨터에서 돌리기:

```bash
docker compose up -d
cd tests/e2e && npm ci && npx playwright install chromium
npx playwright test
```

테스트마다 새 익명 사용자로 들어가고, 끝나면 자기 기록을 지웁니다.
