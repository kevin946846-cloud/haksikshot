-- QA 수정 (2026-11-23) — 운영 DB에 적용 완료 (Supabase 마이그레이션 2개)
--   qa_fix_rls_and_recovery_20261123, qa_fix_advisor_warnings_20261123
-- 새 프로젝트를 만들 때는 schema.sql 다음에 이 파일을 실행한다.

-- ── 원인 ──
-- 운영 DB에 schema.sql에 없는 "Public …" 정책(모든 역할에 ALL, true/true)이 7개 테이블에 추가돼 있었고,
-- 복구 함수 3개는 임시 코드(SELECT TRUE / NOW() / 저장 안 하는 코드)였다.

-- ── B1·B2 등: 누구나 모든 작업을 허용하던 정책 제거 ──
drop policy if exists "Public Meals"    on meals;
drop policy if exists "Public Photos"   on photos;
drop policy if exists "Public RankHist" on rank_hist;
drop policy if exists "Public Reviews"  on reviews;
drop policy if exists "Public Sold"     on sold;
drop policy if exists "Public Votes"    on votes;
drop policy if exists "Public WcRuns"   on wc_runs;

-- 주간 판매 집계는 모든 사람의 먹음 기록을 세야 하므로 security definer
create or replace function public.weekly_sales()
returns table(menu_id text, n bigint) language sql stable security definer set search_path = public as $$
  select menu_id, count(*) as n from meals where created_at >= now() - interval '7 days' group by menu_id
$$;
revoke execute on function public.weekly_sales() from public;
grant execute on function public.weekly_sales() to anon, authenticated;

-- ── B5: 복구 코드 함수 (schema.sql 정의 + 16자리가 아닌 코드는 바로 false) ──
create or replace function public.create_recovery_code() returns text language plpgsql security definer set search_path=public as $$
declare raw text; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login required'; end if;
  raw := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12) || substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into recovery(user_id, code_hash) values (uid, hash_code(raw))
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return substr(raw,1,4)||'-'||substr(raw,5,4)||'-'||substr(raw,9,4)||'-'||substr(raw,13,4);
end $$;

create or replace function public.recovery_created_at() returns timestamptz language sql stable security definer set search_path=public as $$
  select created_at from recovery where user_id = auth.uid() $$;

create or replace function public.restore_account(p_code text) returns boolean language plpgsql security definer set search_path=public as $$
declare new_uid uuid := auth.uid(); old_uid uuid;
begin
  if new_uid is null then raise exception 'login required'; end if;
  if length(regexp_replace(coalesce(p_code,''),'[^0-9A-Fa-f]','','g')) <> 16 then return false; end if;
  select user_id into old_uid from recovery where code_hash = hash_code(p_code);
  if old_uid is null then return false; end if;
  if old_uid = new_uid then return true; end if;
  delete from meals where user_id = new_uid;   delete from reviews where user_id = new_uid;
  delete from votes where user_id = new_uid;   delete from wc_runs where user_id = new_uid;
  delete from recovery where user_id = new_uid;
  update meals   set user_id = new_uid where user_id = old_uid;
  update reviews set user_id = new_uid where user_id = old_uid;
  update votes   set user_id = new_uid where user_id = old_uid;
  update wc_runs set user_id = new_uid where user_id = old_uid;
  update recovery set user_id = new_uid where user_id = old_uid;
  return true;
end $$;

revoke execute on function public.create_recovery_code(), public.restore_account(text), public.recovery_created_at() from public, anon;
grant  execute on function public.create_recovery_code(), public.restore_account(text), public.recovery_created_at() to authenticated;

-- ── B6: 메뉴 ID 형식, 투표 주차 검사 ──
alter table reviews add constraint reviews_menu_id_format check (menu_id ~ '^[iyb][0-9]{1,2}$');
alter table votes   add constraint votes_menu_id_format   check (menu_id ~ '^[iyb][0-9]{1,2}$');
create or replace function public.votes_week_is_current() returns trigger language plpgsql set search_path=public as $$
declare cur text := to_char(date_trunc('week', now() at time zone 'Asia/Seoul')::date, 'YYYY-FMMM-FMDD');
begin
  if new.week <> cur then raise exception 'week must be current week (%), got %', cur, new.week; end if;
  return new;
end $$;
drop trigger if exists votes_week_check on votes;
create trigger votes_week_check before insert or update on votes for each row execute function public.votes_week_is_current();

-- ── 보안 점검(advisors) 경고 정리 ──
revoke execute on function public.meals_ad() from public, anon, authenticated;        -- 트리거 전용
revoke execute on function public.rls_auto_enable() from public, anon, authenticated; -- 이벤트 트리거 전용
alter function public.reviews_bi() set search_path = public;
alter function public.hash_code(text) set search_path = public;
