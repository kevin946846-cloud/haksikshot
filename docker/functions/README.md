# 로컬 서버 함수 라우터

`main/`은 Supabase가 공개한 self-hosting 구성(Apache-2.0, https://github.com/supabase/supabase/tree/master/docker/volumes/functions)의
라우터를 그대로 가져온 것입니다. `/functions/v1/<이름>` 요청을 `supabase/functions/<이름>`으로 넘겨 줍니다.
학식샷 코드가 아니며, 로컬 Docker Compose에서만 쓰입니다. (운영은 Supabase 클라우드가 이 역할을 함)
