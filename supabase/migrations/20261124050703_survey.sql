-- 사용 평가 설문 (2026-11-24)
-- 왜: 최종 평가의 '실제 사용자 테스트' 근거. 앱과 같은 익명 로그인으로 응답 → 1인 1응답(다시 내면 수정)
-- 개인정보(이름·학번·연락처)는 묻지 않음. 결과는 survey_summary()로 집계만 공개
create table public.survey_responses (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint survey_answers_size check (octet_length(answers::text) < 8000),
  -- 사용성 척도(SUS) 10문항은 1~5점 정수 10개
  constraint survey_sus_shape check (
    jsonb_typeof(answers->'sus') = 'array' and jsonb_array_length(answers->'sus') = 10
    and not jsonb_path_exists(answers->'sus', '$[*] ? (@.type() != "number" || @ < 1 || @ > 5 || @ != @.floor())')),
  constraint survey_nps_range check ((answers->>'nps')::int between 0 and 10)
);
alter table public.survey_responses enable row level security;
create policy "survey own" on public.survey_responses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.survey_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger survey_touch before update on public.survey_responses for each row execute function public.survey_touch();
revoke execute on function public.survey_touch() from public, anon, authenticated;

-- SUS 점수(0~100): 홀수 문항은 (점수-1), 짝수 문항은 (5-점수), 합계 × 2.5
create or replace function public.sus_score(a jsonb) returns numeric language sql immutable set search_path = public as $$
  select sum(case when i % 2 = 1 then v - 1 else 5 - v end) * 2.5
  from jsonb_array_elements_text(a->'sus') with ordinality as t(x, i), lateral (select x::int v) s $$;

-- 결과 집계 (누구나 볼 수 있음, 응답자 id는 내보내지 않음)
create or replace function public.survey_summary() returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (select s.*, public.sus_score(s.answers) sus, (s.answers->>'nps')::int nps from survey_responses s),
  cnt as (select k, jsonb_object_agg(v, n) obj from (
            select k, v, count(*) n from r, lateral (values ('freq', r.answers->>'freq'), ('device', r.answers->>'device'), ('days', r.answers->>'days')) x(k, v)
            where v is not null group by k, v) y group by k),
  used as (select jsonb_object_agg(f, n order by n desc) obj from (
            select f, count(*) n from r, jsonb_array_elements_text(coalesce(r.answers->'used', '[]')) f group by f) z),
  app as (select jsonb_object_agg(k, round(a, 2)) obj from (
            select k, avg(v::numeric) a from r, jsonb_each_text(coalesce(r.answers->'app', '{}')) e(k, v)
            where v ~ '^[1-5]$' group by k) z),
  txt as (select jsonb_object_agg(k, arr) obj from (
            select k, jsonb_agg(v order by t desc) arr from (
              select k, left(btrim(r.answers->>k), 500) v, r.updated_at t from r, unnest(array['good', 'bad', 'wish']) k
              where coalesce(btrim(r.answers->>k), '') <> '') q group by k) z)
  select jsonb_build_object(
    'n', (select count(*) from r),
    'sus_avg', (select round(avg(sus), 1) from r),
    'sus_list', (select coalesce(jsonb_agg(sus order by sus), '[]') from r),
    'nps', (select jsonb_build_object(
              'promoters', count(*) filter (where nps >= 9), 'passives', count(*) filter (where nps between 7 and 8),
              'detractors', count(*) filter (where nps <= 6),
              'score', case when count(*) = 0 then null
                       else round(100.0 * (count(*) filter (where nps >= 9) - count(*) filter (where nps <= 6)) / count(*)) end) from r),
    'counts', coalesce((select jsonb_object_agg(k, obj) from cnt), '{}'),
    'used', coalesce((select obj from used), '{}'),
    'app', coalesce((select obj from app), '{}'),
    'texts', coalesce((select obj from txt), '{}'),
    -- 실제로 앱을 쓴 응답자 (먹음 체크나 평가를 한 번이라도 남김) → '써 보지 않고 답한 응답'과 구분
    'active', (select count(*) from r where exists (select 1 from meals m where m.user_id = r.user_id)
                                         or exists (select 1 from reviews v where v.user_id = r.user_id)),
    'first_at', (select min(created_at) from r), 'last_at', (select max(updated_at) from r)) $$;
revoke execute on function public.survey_summary() from public;
grant execute on function public.survey_summary() to anon, authenticated;
