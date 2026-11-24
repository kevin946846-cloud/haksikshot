-- AI 확인 횟수 제한 (2026-11-24) — 운영 DB에 마이그레이션 ai_quota_20261124 로 적용
-- 왜: 한 사람이 사진·품절 확인을 수백 번 부르면 Gemini 무료 한도가 바닥나 다른 사람이 확인을 못 받음.
-- verify-photo 함수가 Gemini를 부르기 직전에 ai_quota_take()로 한 번씩 차감한다.

create table if not exists public.ai_calls(
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null check (kind in ('food','sold')),
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_user_kind_at on public.ai_calls(user_id, kind, created_at);
alter table public.ai_calls enable row level security;   -- 정책 없음: 앱에서는 읽기·쓰기 불가, 서버 함수만

-- 오늘(한국 시간) 이 사용자가 kind를 lim번 미만 썼으면 1회 기록하고 true, 아니면 false
create or replace function public.ai_quota_take(p_user uuid, p_kind text, p_lim int)
returns boolean language plpgsql security definer set search_path=public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'; used int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_user::text));   -- 같은 사람이 동시에 여러 번 눌러도 정확히 셈
  select count(*) into used from ai_calls where user_id = p_user and kind = p_kind and created_at >= day_start;
  if used >= p_lim then return false; end if;
  insert into ai_calls(user_id, kind) values (p_user, p_kind);
  delete from ai_calls where created_at < now() - interval '3 days';   -- 오래된 기록은 그때그때 정리
  return true;
end $$;
revoke execute on function public.ai_quota_take(uuid, text, int) from public, anon, authenticated;
grant  execute on function public.ai_quota_take(uuid, text, int) to service_role;
