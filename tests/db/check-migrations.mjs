// supabase/migrations 의 파일을 이름 순서대로 빈 Postgres(PGlite)에 적용하고, 핵심 규칙이 살아 있는지 확인
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "fs";
import path from "path";

const dir = path.resolve(import.meta.dirname, "../../supabase/migrations");
const db = new PGlite({ extensions: { pgcrypto } });
// Supabase가 기본 제공하는 것 흉내 (auth, storage, 역할)
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema extensions; create schema auth; create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
`);
const files = fs.readdirSync(dir).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();
for (const f of files) {
  try { await db.exec(fs.readFileSync(path.join(dir, f), "utf8")); console.log("✓ 적용", f); }
  catch (e) { console.error("✘ 실패", f, "\n ", e.message); process.exit(1); }
}

const one = async (sql) => Object.values((await db.query(sql)).rows[0] ?? {})[0];
const fails = [];
const check = async (name, sql, want) => {
  let got; try { got = await one(sql); } catch (e) { got = "ERROR: " + e.message; }
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(ok ? "✓" : "✘", name, ok ? "" : `(기대 ${JSON.stringify(want)}, 실제 ${JSON.stringify(got)})`);
  if (!ok) fails.push(name);
};
await check("모든 public 테이블에 RLS", `select count(*)::int from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity`, 0);
await check("앱 테이블 10개", `select count(*)::int from pg_class where relnamespace='public'::regnamespace and relkind='r'`, 10);
await check("AI 횟수 함수는 서버만 실행", `select has_function_privilege('authenticated','public.ai_quota_take(uuid,text,integer)','execute')`, false);
await check("저장소에 앱 직접 업로드 정책 없음", `select count(*)::int from pg_policies where schemaname='storage'`, 0);
// AI 횟수 제한이 실제로 5번에서 막히는지
await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111')`);
await check("하루 사진 확인 5번 제한", `select array_agg(public.ai_quota_take('11111111-1111-1111-1111-111111111111','food',5)) from generate_series(1,6)`, [true, true, true, true, true, false]);
// 후기 별점 범위
try { await db.exec(`insert into public.reviews(user_id, menu_id, stars) values ('11111111-1111-1111-1111-111111111111','i4',6)`); fails.push("별점 6점 거절"); console.log("✘ 별점 6점이 들어감"); }
catch { console.log("✓ 별점 6점 insert 거절"); }

if (fails.length) { console.error(`\n실패 ${fails.length}개:`, fails.join(", ")); process.exit(1); }
console.log(`\n마이그레이션 ${files.length}개 적용, 확인 모두 통과`);
await db.close();
process.exit(0);
