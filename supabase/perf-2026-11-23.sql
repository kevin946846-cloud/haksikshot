-- 성능 개선 (2026-11-23) — 운영 DB에 적용 완료 (마이그레이션 perf_indexes_and_rls_initplan_20261123)
-- 기준: 앱이 30초마다 다시 부르는 쿼리(sync.js hydrate)에서 '많이 찾는' 조건 컬럼

create index if not exists meals_created_at_idx  on meals (created_at desc);   -- weekly_sales: 최근 7일 먹음 집계
create index if not exists votes_week_idx        on votes (week, menu_id);     -- 이번 주·지난주 투표 조회
create index if not exists sold_created_at_idx   on sold (created_at desc);    -- 오늘 19시 이후 품절 조회
create index if not exists wc_runs_user_id_idx   on wc_runs (user_id);         -- 복구 코드로 기록 옮길 때(FK)
create index if not exists photos_created_at_idx on photos (created_at desc);  -- 최근 7일 사진 확인

-- RLS 정책의 auth.uid()를 행마다가 아니라 쿼리당 한 번만 계산 (Supabase 성능 점검 권고)
alter policy "meals own"   on meals   using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "reviews own" on reviews using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "votes own"   on votes   using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "wc insert"   on wc_runs with check (user_id = (select auth.uid()));
