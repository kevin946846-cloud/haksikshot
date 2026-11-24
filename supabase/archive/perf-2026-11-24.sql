-- 집계 함수 (2026-11-24) — 운영 DB에 마이그레이션 perf_aggregate_20261124 로 적용
-- 왜: 앱이 30초마다 후기 최대 3,000개, 월드컵 기록 최대 1,500개, 2주치 투표 전체를 받아
--     브라우저에서 평균·횟수를 계산했음. 데이터가 늘수록 매번 받는 양이 커짐.
--     → 계산은 DB에서 하고, 앱은 메뉴별 결과(최대 메뉴 수 × 몇 줄)만 받는다.
-- 모두 security invoker: 기존 RLS(읽기 정책)를 그대로 따름. 내 기록은 앱이 따로 받으므로 집계에서 뺌.

-- 메뉴별 별점 평균·개수 (전체 / 최근 7일)
create or replace function public.menu_rating()
returns table(menu_id text, n_all int, avg_all numeric, n_wk int, avg_wk numeric)
language sql stable set search_path=public as $$
  select r.menu_id,
         count(*)::int, round(avg(r.stars), 3),
         (count(*) filter (where r.updated_at > now() - interval '7 days'))::int,
         coalesce(round(avg(r.stars) filter (where r.updated_at > now() - interval '7 days'), 3), 0)
  from reviews r
  where r.user_id is distinct from (select auth.uid())
  group by r.menu_id $$;

-- 메뉴별 최근 후기 p_per개 (상세 화면 목록용, 작성자 id는 보내지 않음)
create or replace function public.recent_reviews(p_per int default 20)
returns table(menu_id text, stars int, body text, feedback jsonb, verified boolean, updated_at timestamptz)
language sql stable set search_path=public as $$
  select menu_id, stars, body, feedback, verified, updated_at from (
    select r.*, row_number() over (partition by r.menu_id order by r.updated_at desc) rn
    from reviews r where r.user_id is distinct from (select auth.uid())
  ) x where rn <= least(greatest(p_per, 1), 50)
  order by updated_at desc $$;

-- 주차·메뉴별 추천/비추천 수 (내 투표 제외)
create or replace function public.vote_counts(p_weeks text[])
returns table(week text, menu_id text, up int, down int)
language sql stable set search_path=public as $$
  select v.week, v.menu_id, (count(*) filter (where v.v = 1))::int, (count(*) filter (where v.v = -1))::int
  from votes v
  where v.week = any(p_weeks) and v.user_id is distinct from (select auth.uid())
  group by v.week, v.menu_id $$;

-- 월드컵 테마·메뉴별 승/패/우승 수 (기록 log = [[이긴 메뉴, 진 메뉴], ...])
create or replace function public.wc_stats()
returns table(theme text, menu_id text, w int, l int, champ int)
language sql stable set search_path=public as $$
  with pairs as (
    select r.theme, p->>0 a, p->>1 b from wc_runs r, jsonb_array_elements(coalesce(r.log, '[]'::jsonb)) p
  ), rows as (
    select theme, a menu_id, 1 w, 0 l, 0 champ from pairs
    union all select theme, b, 0, 1, 0 from pairs
    union all select theme, winner, 0, 0, 1 from wc_runs
  )
  select theme, menu_id, sum(w)::int, sum(l)::int, sum(champ)::int from rows
  where menu_id is not null group by theme, menu_id $$;

revoke execute on function public.menu_rating(), public.recent_reviews(int), public.vote_counts(text[]), public.wc_stats() from public, anon;
grant  execute on function public.menu_rating(), public.recent_reviews(int), public.vote_counts(text[]), public.wc_stats() to authenticated;

-- 자기 월드컵 기록은 지울 수 있게 (테스트 정리용, 마이그레이션 wc_runs_delete_own_20261124)
drop policy if exists "wc delete own" on public.wc_runs;
create policy "wc delete own" on public.wc_runs for delete to authenticated using (user_id = (select auth.uid()));
