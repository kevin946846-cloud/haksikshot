-- 앱이 사진을 직접 올리던 시절 정책. 지금은 verify-photo 서버 함수(service_role)만 올리고 지움.
-- 남겨 두면 로그인한 누구나 자기 폴더에 아무 파일(2MB까지)이나 올릴 수 있음.
drop policy if exists "photos upload own folder" on storage.objects;
drop policy if exists "photos delete own" on storage.objects;
