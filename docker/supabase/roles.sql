-- Supabase 공식 self-hosting 구성의 roles.sql (Apache-2.0)에서 가져옴. 로컬 Compose 전용
-- 학식샷은 DB 웹훅(supabase_functions_admin 역할)을 쓰지 않아 그 줄은 뺐음 (없는 역할이라 초기화가 멈췄음)
-- NOTE: change to your own passwords for production environments
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
