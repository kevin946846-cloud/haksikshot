-- QA 수정 (2026-11-23): Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run
-- 운영 DB가 schema.sql과 달라진 부분을 schema.sql 기준으로 되돌린다.

-- ── B1·B2: photos / sold 는 클라이언트가 직접 쓸 수 없어야 함 ──
-- 1) 두 테이블의 정책을 모두 지우고 schema.sql의 정책만 다시 만든다
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('photos', 'sold')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table photos enable row level security;
alter table sold   enable row level security;
create policy "photos read"  on photos for select using (true);
create policy "sold read"    on sold   for select using (true);
create policy "sold restock" on sold   for delete to authenticated using (true);   -- '다시 있어요'
-- insert/update는 정책이 없으므로 service role(Edge Function)만 가능

-- ── B6: 없는 메뉴 ID, 엉뚱한 주차 막기 ──
-- 메뉴 ID 형식: i(일품)·y(양식)·b(분식) + 숫자 1~2자리
alter table reviews add constraint reviews_menu_id_format check (menu_id ~ '^[iyb][0-9]{1,2}$') not valid;
alter table votes   add constraint votes_menu_id_format   check (menu_id ~ '^[iyb][0-9]{1,2}$') not valid;
-- 투표 주차는 이번 주 월요일(한국 시간)만 허용
create or replace function votes_week_is_current() returns trigger language plpgsql as $$
declare mon date := date_trunc('week', (now() at time zone 'Asia/Seoul'))::date;
begin
  if new.week <> to_char(mon, 'YYYY-FMMM-FMDD') then
    raise exception 'week must be current week (%), got %', to_char(mon, 'YYYY-FMMM-FMDD'), new.week;
  end if;
  return new;
end $$;
drop trigger if exists votes_week_check on votes;
create trigger votes_week_check before insert or update on votes
  for each row execute function votes_week_is_current();
-- 이미 들어간 잘못된 행 정리
delete from reviews where menu_id !~ '^[iyb][0-9]{1,2}$';
delete from votes   where menu_id !~ '^[iyb][0-9]{1,2}$';

-- ── B5: 복구 함수가 schema.sql과 같은지 확인 (결과만 보고, 바꾸지 않음) ──
-- 아래 두 결과를 schema.sql의 restore_account / hash_code 정의와 비교한다.
select pg_get_functiondef('public.restore_account(text)'::regprocedure);
select pg_get_functiondef('public.hash_code(text)'::regprocedure);
-- 코드가 4자리 같은 짧은 값인 행이 있는지 (정상이면 0)
select count(*) as short_code_rows from recovery where length(code_hash) <> 64;
