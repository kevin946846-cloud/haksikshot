# 학식샷

다래락 학식 메뉴의 실제 사진·평가·품절 정보를 모두가 함께 채우는 웹 서비스.
화면은 정적 HTML, 데이터·사진·익명 로그인·AI 확인은 Supabase, 배포는 Vercel.

```
index.html / sync.js / config.js     화면 + 서버 연동
supabase/schema.sql                  테이블, 보안 규칙(RLS), 사진 저장소
supabase/functions/verify-photo      사진·품절 제보 AI 확인 (서버에서 실행)
```

## 설정 순서

1. **Supabase 프로젝트 만들기** (리전: Seoul). `Authentication > Sign In / Providers`에서 **Allow anonymous sign-ins**를 켭니다.
2. **DB 만들기**: `SQL Editor`에 `supabase/schema.sql` 전체를 붙여넣고 Run.
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
| 마지막으로 받은 데이터 캐시 | 브라우저 localStorage (`haksikshot-snap-v1`) | 앱을 다시 열면 네트워크를 기다리지 않고 바로 그림, 그 뒤 새 데이터로 교체 |
| 스크립트 캐시 | `vercel.json`, `docker/nginx.conf` | `sync.js`·`config.js`는 10분 캐시, `index.html`은 항상 새 버전 확인 |
| 백그라운드 탭 | `sync.js` | 탭이 안 보일 때는 30초마다 다시 받지 않음 |
| DB 인덱스 | `supabase/perf-2026-11-23.sql` | 주간 집계(meals.created_at), 투표(votes.week), 품절·사진(created_at) |

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
- 메뉴 목록·영양 추정치는 `index.html` 안에 있습니다. 메뉴가 바뀌면 이 파일을 고치세요.
- 사용자별 업로드 횟수 제한(rate limit)은 아직 없습니다.

## 자동 E2E 테스트

PR을 올릴 때마다 GitHub Actions가 앱을 도커로 띄우고, 실제 브라우저(Playwright)로 눌러 보며 20개 시나리오를 확인합니다.

| 묶음 | 내용 |
|---|---|
| 일반 흐름 (10) | 히어로, 식권 스텁, 아래 탭, 정렬, 먹음 체크, 평가, 투표, 월드컵 |
| 크리티컬 (5) | 하루 3끼 초과, 같은 메뉴 중복 평가, 19시 품절 초기화, 복구 코드로 기록 옮기기, 서버 장애 시 화면 |
| 서버 규칙 (5) | 화면을 거치지 않고 직접 요청해도 RLS·제약 조건이 막는지 |

내 컴퓨터에서 돌리기:

```bash
docker compose up -d
cd tests/e2e && npm ci && npx playwright install chromium
npx playwright test
```

테스트마다 새 익명 사용자로 들어가고, 끝나면 자기 기록을 지웁니다.
