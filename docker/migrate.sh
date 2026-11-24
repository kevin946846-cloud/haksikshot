#!/bin/sh
# 로컬 DB에 supabase/migrations/*.sql 을 이름 순서대로 적용하고, 처음 한 번만 seed.sql(메뉴 43개)을 넣는다.
# 이미 적용한 파일은 supabase_migrations.schema_migrations 에 기록해서 건너뜀 (Supabase CLI와 같은 표)
# → docker compose up 을 여러 번 해도 안전
set -eu
export PGHOST=db PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD="$POSTGRES_PASSWORD"
psql_q() { psql -v ON_ERROR_STOP=1 -X -q "$@"; }

psql_q -c "create schema if not exists supabase_migrations;
           create table if not exists supabase_migrations.schema_migrations(version text primary key, name text, statements text[]);"

first_run=$(psql -X -tA -c "select count(*) = 0 from supabase_migrations.schema_migrations")
for f in /migrations/*.sql; do
  base=$(basename "$f" .sql); ver=${base%%_*}; name=${base#*_}
  done_already=$(psql -X -tA -c "select count(*) from supabase_migrations.schema_migrations where version = '$ver'")
  if [ "$done_already" = "1" ]; then echo "건너뜀 $base"; continue; fi
  echo "적용 $base"
  psql_q -1 -f "$f" -c "insert into supabase_migrations.schema_migrations(version, name) values ('$ver', '$name')"
done

if [ "$first_run" = "t" ]; then echo "적용 seed.sql (메뉴 43개)"; psql_q -1 -f /seed.sql; fi

# Supabase 클라우드 기본값과 같게: 앱 역할이 public 표에 접근 (실제 허용 범위는 RLS가 정함). 함수 권한은 건드리지 않음
psql_q -c "grant usage on schema public to anon, authenticated, service_role;
           grant all on all tables in schema public to anon, authenticated, service_role;
           grant all on all sequences in schema public to anon, authenticated, service_role;"
psql_q -c "notify pgrst, 'reload schema'"   # API(PostgREST)가 새 표·함수를 바로 알게
echo "DB 준비 완료"
