-- 학식샷 DB 기준점 (2026-11-24, 운영 DB 카탈로그에서 그대로 뽑음)
-- 검증: 빈 Postgres에 이 파일을 적용한 결과가 운영과 같음 (테이블·제약·인덱스·정책·트리거, 함수 본문 해시까지)
-- 이전에 흩어져 있던 schema.sql + fix/perf/limit SQL 파일과 운영 DB에서 직접 고친 내용을 이 파일 하나로 합침.
-- 새 Supabase 프로젝트에 이 폴더의 파일을 순서대로 적용하면 운영과 같은 구조가 됨.
-- (auth, storage 스키마와 anon/authenticated/service_role 역할은 Supabase가 기본 제공)

create extension if not exists pgcrypto with schema extensions;

-- ───────────── 테이블 ─────────────
create table public.menus (           -- 메뉴판 (앱은 내장 목록을 먼저 그리고, 이 표 값으로 덮어씀)
  id text not null,
  category text not null,
  name text not null,
  price integer not null,
  market_price integer,
  kcal integer,
  protein integer,
  carbs integer,
  sugar integer,
  tags text[] default '{}'::text[] not null,
  sort_order integer
);
create table public.meals (           -- 먹음 체크: 한 사람 하루 끼니당 1개
  user_id uuid default auth.uid() not null,
  menu_id text not null,
  slot text not null,
  day date default ((now() at time zone 'Asia/Seoul'::text))::date not null,
  created_at timestamp with time zone default now() not null
);
create table public.reviews (         -- 별점·후기: 한 사람 메뉴당 1개
  user_id uuid default auth.uid() not null,
  menu_id text not null,
  stars integer not null,
  body text default ''::text not null,
  feedback jsonb default '{}'::jsonb not null,
  verified boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create table public.votes (           -- 가성비 투표: 이번 주(한국 시간)만
  user_id uuid default auth.uid() not null,
  week text not null,
  menu_id text not null,
  v integer not null
);
create table public.photos (          -- 메뉴 사진 (verify-photo 서버 함수만 씀)
  menu_id text not null,
  path text not null,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null,
  verified boolean default false not null,
  nutrition jsonb,
  portion text
);
create table public.sold (            -- 품절 표시 (등록은 서버 함수, 해제는 누구나)
  menu_id text not null,
  reported_by uuid,
  created_at timestamp with time zone default now() not null,
  verified boolean default true not null,
  proof_path text,
  reason text
);
create table public.rank_hist (       -- 주차별 랭킹 순서 기록
  week text not null,
  ord jsonb not null
);
create table public.wc_runs (         -- 메뉴 월드컵 결과
  id bigint generated always as identity not null,
  user_id uuid default auth.uid() not null,
  theme text not null,
  winner text not null,
  log jsonb not null,
  created_at timestamp with time zone default now() not null
);
create table public.recovery (        -- 복구 코드 (해시만 저장)
  user_id uuid not null,
  code_hash text not null,
  created_at timestamp with time zone default now() not null
);
create table public.ai_calls (        -- AI 확인 횟수 (하루 제한용)
  id bigint generated always as identity not null,
  user_id uuid not null,
  kind text not null,
  created_at timestamp with time zone default now() not null
);

-- ───────────── 제약 조건 ─────────────
alter table public.menus    add constraint menus_pkey PRIMARY KEY (id);
alter table public.menus    add constraint menus_category_check CHECK ((category = ANY (ARRAY['일품'::text, '양식'::text, '분식'::text])));
alter table public.meals    add constraint meals_pkey PRIMARY KEY (user_id, day, slot);
alter table public.meals    add constraint meals_user_id_day_menu_id_key UNIQUE (user_id, day, menu_id);
alter table public.meals    add constraint meals_slot_check CHECK ((slot = ANY (ARRAY['아침'::text, '점심'::text, '저녁'::text])));
alter table public.meals    add constraint meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.reviews  add constraint reviews_pkey PRIMARY KEY (user_id, menu_id);
alter table public.reviews  add constraint reviews_stars_check CHECK (((stars >= 1) AND (stars <= 5)));
alter table public.reviews  add constraint reviews_body_check CHECK ((char_length(body) <= 200));
alter table public.reviews  add constraint reviews_menu_id_format CHECK ((menu_id ~ '^[iyb][0-9]{1,2}$'::text));
alter table public.reviews  add constraint reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.votes    add constraint votes_pkey PRIMARY KEY (user_id, week, menu_id);
alter table public.votes    add constraint votes_v_check CHECK ((v = ANY (ARRAY[1, '-1'::integer])));
alter table public.votes    add constraint votes_menu_id_format CHECK ((menu_id ~ '^[iyb][0-9]{1,2}$'::text));
alter table public.votes    add constraint votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.photos   add constraint photos_pkey PRIMARY KEY (menu_id);
alter table public.sold     add constraint sold_pkey PRIMARY KEY (menu_id);
alter table public.rank_hist add constraint rank_hist_pkey PRIMARY KEY (week);
alter table public.wc_runs  add constraint wc_runs_pkey PRIMARY KEY (id);
alter table public.wc_runs  add constraint wc_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.recovery add constraint recovery_pkey PRIMARY KEY (user_id);
alter table public.recovery add constraint recovery_code_hash_key UNIQUE (code_hash);
alter table public.recovery add constraint recovery_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.ai_calls add constraint ai_calls_pkey PRIMARY KEY (id);
alter table public.ai_calls add constraint ai_calls_kind_check CHECK ((kind = ANY (ARRAY['food'::text, 'sold'::text])));

-- ───────────── 인덱스 (자주 찾는 조회) ─────────────
CREATE INDEX meals_created_at_idx  ON public.meals    USING btree (created_at DESC);           -- weekly_sales
CREATE INDEX votes_week_idx        ON public.votes    USING btree (week, menu_id);
CREATE INDEX sold_created_at_idx   ON public.sold     USING btree (created_at DESC);
CREATE INDEX photos_created_at_idx ON public.photos   USING btree (created_at DESC);
CREATE INDEX wc_runs_user_id_idx   ON public.wc_runs  USING btree (user_id);
CREATE INDEX ai_calls_user_kind_at ON public.ai_calls USING btree (user_id, kind, created_at);

-- ───────────── 함수 ─────────────
CREATE OR REPLACE FUNCTION public.hash_code(c text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select encode(sha256(convert_to(upper(regexp_replace(c,'[^0-9A-Fa-f]','','g')),'UTF8')),'hex') $function$;

-- 후기의 '먹음 인증'은 서버가 계산 (먹음 체크가 있으면 verified)
CREATE OR REPLACE FUNCTION public.reviews_bi()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  if tg_op='INSERT' or (new.stars,new.body,new.feedback) is distinct from (old.stars,old.body,old.feedback) then
    new.updated_at := now();
  end if;
  new.verified := exists(select 1 from meals where user_id=new.user_id and menu_id=new.menu_id);
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.meals_ad()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin  -- 후기 행을 한 번 건드려 reviews_bi가 verified를 다시 계산하게 함
  update reviews set verified=verified
   where user_id=coalesce(new.user_id,old.user_id) and menu_id=coalesce(new.menu_id,old.menu_id);
  return null;
end $function$;

-- 투표는 이번 주(한국 시간 월요일 시작)만
CREATE OR REPLACE FUNCTION public.votes_week_is_current()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare cur text := to_char(date_trunc('week', now() at time zone 'Asia/Seoul')::date, 'YYYY-FMMM-FMDD');
begin
  if new.week <> cur then raise exception 'week must be current week (%), got %', cur, new.week; end if;
  return new;
end $function$;

-- 최근 7일 메뉴별 먹음 수 (모든 사람 기록을 세야 해서 security definer)
CREATE OR REPLACE FUNCTION public.weekly_sales()
 RETURNS TABLE(menu_id text, n bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select menu_id, count(*) as n from meals where created_at >= now() - interval '7 days' group by menu_id
$function$;

-- 복구 코드: 만들기 / 만든 시각 / 다른 기기에서 기록 옮기기
CREATE OR REPLACE FUNCTION public.create_recovery_code()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare raw text; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login required'; end if;
  raw := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12) || substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into recovery(user_id, code_hash) values (uid, hash_code(raw))
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return substr(raw,1,4)||'-'||substr(raw,5,4)||'-'||substr(raw,9,4)||'-'||substr(raw,13,4);
end $function$;

CREATE OR REPLACE FUNCTION public.recovery_created_at()
 RETURNS timestamp with time zone LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select created_at from recovery where user_id = auth.uid() $function$;

CREATE OR REPLACE FUNCTION public.restore_account(p_code text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
end $function$;

-- AI 확인 하루 횟수 (verify-photo 서버 함수만 호출)
CREATE OR REPLACE FUNCTION public.ai_quota_take(p_user uuid, p_kind text, p_lim integer)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'; used int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_user::text));
  select count(*) into used from ai_calls where user_id = p_user and kind = p_kind and created_at >= day_start;
  if used >= p_lim then return false; end if;
  insert into ai_calls(user_id, kind) values (p_user, p_kind);
  delete from ai_calls where created_at < now() - interval '3 days';
  return true;
end $function$;

-- 집계 함수 (앱이 30초마다 메뉴별 결과만 받음, 내 기록은 제외)
CREATE OR REPLACE FUNCTION public.menu_rating()
 RETURNS TABLE(menu_id text, n_all integer, avg_all numeric, n_wk integer, avg_wk numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  select r.menu_id,
         count(*)::int, round(avg(r.stars), 3),
         (count(*) filter (where r.updated_at > now() - interval '7 days'))::int,
         coalesce(round(avg(r.stars) filter (where r.updated_at > now() - interval '7 days'), 3), 0)
  from reviews r
  where r.user_id is distinct from (select auth.uid())
  group by r.menu_id $function$;

CREATE OR REPLACE FUNCTION public.recent_reviews(p_per integer DEFAULT 20)
 RETURNS TABLE(menu_id text, stars integer, body text, feedback jsonb, verified boolean, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  select menu_id, stars, body, feedback, verified, updated_at from (
    select r.*, row_number() over (partition by r.menu_id order by r.updated_at desc) rn
    from reviews r where r.user_id is distinct from (select auth.uid())
  ) x where rn <= least(greatest(p_per, 1), 50)
  order by updated_at desc $function$;

CREATE OR REPLACE FUNCTION public.vote_counts(p_weeks text[])
 RETURNS TABLE(week text, menu_id text, up integer, down integer)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  select v.week, v.menu_id, (count(*) filter (where v.v = 1))::int, (count(*) filter (where v.v = -1))::int
  from votes v
  where v.week = any(p_weeks) and v.user_id is distinct from (select auth.uid())
  group by v.week, v.menu_id $function$;

CREATE OR REPLACE FUNCTION public.wc_stats()
 RETURNS TABLE(theme text, menu_id text, w integer, l integer, champ integer)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  with pairs as (
    select r.theme, p->>0 a, p->>1 b from wc_runs r, jsonb_array_elements(coalesce(r.log, '[]'::jsonb)) p
  ), rows as (
    select theme, a menu_id, 1 w, 0 l, 0 champ from pairs
    union all select theme, b, 0, 1, 0 from pairs
    union all select theme, winner, 0, 0, 1 from wc_runs
  )
  select theme, menu_id, sum(w)::int, sum(l)::int, sum(champ)::int from rows
  where menu_id is not null group by theme, menu_id $function$;

-- ───────────── 트리거 ─────────────
CREATE TRIGGER reviews_bi BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION reviews_bi();
CREATE TRIGGER meals_ad AFTER INSERT OR DELETE ON public.meals FOR EACH ROW EXECUTE FUNCTION meals_ad();
CREATE TRIGGER votes_week_check BEFORE INSERT OR UPDATE ON public.votes FOR EACH ROW EXECUTE FUNCTION votes_week_is_current();

-- ───────────── 함수 실행 권한 ─────────────
revoke execute on function public.meals_ad(), public.ai_quota_take(uuid, text, integer) from public, anon, authenticated;
grant  execute on function public.ai_quota_take(uuid, text, integer) to service_role;
revoke execute on function public.create_recovery_code(), public.recovery_created_at(), public.restore_account(text),
  public.menu_rating(), public.recent_reviews(integer), public.vote_counts(text[]), public.wc_stats(), public.weekly_sales() from public, anon;
grant  execute on function public.create_recovery_code(), public.recovery_created_at(), public.restore_account(text),
  public.menu_rating(), public.recent_reviews(integer), public.vote_counts(text[]), public.wc_stats() to authenticated;
grant  execute on function public.weekly_sales() to anon, authenticated;

-- ───────────── RLS ─────────────
alter table public.menus     enable row level security;
alter table public.meals     enable row level security;
alter table public.reviews   enable row level security;
alter table public.votes     enable row level security;
alter table public.photos    enable row level security;
alter table public.sold      enable row level security;
alter table public.rank_hist enable row level security;
alter table public.wc_runs   enable row level security;
alter table public.recovery  enable row level security;   -- 정책 없음: 함수로만 접근
alter table public.ai_calls  enable row level security;   -- 정책 없음: 서버 함수만

create policy "menus read"    on public.menus     for select to public using (true);
create policy "meals own"     on public.meals     for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews read"  on public.reviews   for select to public using (true);
create policy "reviews own"   on public.reviews   for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "votes read"    on public.votes     for select to public using (true);
create policy "votes own"     on public.votes     for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "photos read"   on public.photos    for select to public using (true);   -- 쓰기는 서버 함수만
create policy "sold read"     on public.sold      for select to public using (true);   -- 등록은 서버 함수만
create policy "sold restock"  on public.sold      for delete to authenticated using (true);
create policy "rank read"     on public.rank_hist for select to public using (true);
create policy "rank insert"   on public.rank_hist for insert to authenticated with check (true);
create policy "wc read"       on public.wc_runs   for select to public using (true);
create policy "wc insert"     on public.wc_runs   for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wc delete own" on public.wc_runs   for delete to authenticated using (user_id = (select auth.uid()));

-- ───────────── 사진 저장소 ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- 아래 두 정책은 앱이 직접 올리던 시절 것 → 다음 마이그레이션(storage_policies_cleanup)에서 삭제
create policy "photos upload own folder" on storage.objects for insert to authenticated
  with check ((bucket_id = 'photos'::text) and ((storage.foldername(name))[1] = (auth.uid())::text));
create policy "photos delete own" on storage.objects for delete to authenticated
  using ((bucket_id = 'photos'::text) and (owner = auth.uid()));
