-- 학식샷 DB. Supabase SQL Editor에서 한 번에 실행하세요.
create table meals(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  menu_id text not null,
  slot text not null check (slot in ('아침','점심','저녁')),
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, day, slot),      -- 하루 최대 3끼
  unique (user_id, day, menu_id)
);
create table reviews(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  menu_id text not null,
  stars int not null check (stars between 1 and 5),
  body text not null default '' check (char_length(body) <= 200),
  feedback jsonb not null default '{}',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, menu_id)         -- 1인 1평가
);
create table photos(                      -- 쓰기는 Edge Function(service role)만
  menu_id text primary key, path text not null, uploaded_by uuid,
  created_at timestamptz not null default now(),
  verified boolean not null default false, nutrition jsonb, portion text
);
create table sold(                        -- 쓰기는 Edge Function, 삭제(다시 있어요)는 누구나
  menu_id text primary key, reported_by uuid,
  created_at timestamptz not null default now(),
  verified boolean not null default true, proof_path text, reason text
);
create table votes(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week text not null, menu_id text not null, v int not null check (v in (1,-1)),
  primary key (user_id, week, menu_id)
);
create table rank_hist(week text primary key, ord jsonb not null);
create table wc_runs(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  theme text not null, winner text not null, log jsonb not null,
  created_at timestamptz not null default now()
);

-- 먹음 체크한 메뉴의 후기는 '먹음 인증'. 서버가 계산하므로 클라이언트가 조작할 수 없음
create function reviews_bi() returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' or (new.stars,new.body,new.feedback) is distinct from (old.stars,old.body,old.feedback) then
    new.updated_at := now();
  end if;
  new.verified := exists(select 1 from meals where user_id=new.user_id and menu_id=new.menu_id);
  return new;
end $$;
create trigger reviews_bi before insert or update on reviews for each row execute function reviews_bi();

create function meals_ad() returns trigger language plpgsql security definer set search_path=public as $$
begin  -- 후기 행을 한 번 건드려 reviews_bi가 verified를 다시 계산하게 함
  update reviews set verified=verified
   where user_id=coalesce(new.user_id,old.user_id) and menu_id=coalesce(new.menu_id,old.menu_id);
  return null;
end $$;
create trigger meals_ad after insert or delete on meals for each row execute function meals_ad();

-- 이번 주 메뉴별 먹음 체크 수 (개인 기록은 노출하지 않고 합계만)
create function weekly_sales() returns table(menu_id text, n bigint)
language sql security definer set search_path=public as $$
  select menu_id, count(*) from meals where created_at > now() - interval '7 days' group by 1 $$;

-- RLS
alter table meals enable row level security;     alter table reviews enable row level security;
alter table photos enable row level security;    alter table sold enable row level security;
alter table votes enable row level security;     alter table rank_hist enable row level security;
alter table wc_runs enable row level security;

create policy "meals own"   on meals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "reviews read" on reviews for select using (true);
create policy "reviews own"  on reviews for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "photos read" on photos for select using (true);
create policy "sold read"   on sold for select using (true);
create policy "sold restock" on sold for delete to authenticated using (true);
create policy "votes read"  on votes for select using (true);
create policy "votes own"   on votes for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "rank read"   on rank_hist for select using (true);
create policy "rank insert" on rank_hist for insert to authenticated with check (true);
create policy "wc read"     on wc_runs for select using (true);
create policy "wc insert"   on wc_runs for insert to authenticated with check (user_id=auth.uid());

-- 사진 저장소 (공개 읽기, 업로드는 Edge Function만)
insert into storage.buckets(id,name,public) values('photos','photos',true) on conflict do nothing;

-- 실시간 갱신
alter publication supabase_realtime add table reviews, photos, sold, votes, wc_runs;

-- ───────── 복구 코드: 기기를 바꾸거나 브라우저 데이터를 지워도 기록 이어 쓰기 ─────────
create table recovery(
  user_id uuid primary key references auth.users on delete cascade,
  code_hash text not null unique,          -- 코드 자체는 저장하지 않고 해시만 저장
  created_at timestamptz not null default now()
);
alter table recovery enable row level security;   -- 정책 없음: 아래 함수로만 접근

create function hash_code(c text) returns text language sql immutable as $$
  select encode(sha256(convert_to(upper(regexp_replace(c,'[^0-9A-Fa-f]','','g')),'UTF8')),'hex') $$;

-- 16자리(64비트) 무작위 코드를 만들어 해시만 저장하고, 코드는 이때 한 번만 돌려줌
create function create_recovery_code() returns text language plpgsql security definer set search_path=public as $$
declare raw text; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login required'; end if;
  raw := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12) || substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into recovery(user_id, code_hash) values (uid, hash_code(raw))
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return substr(raw,1,4)||'-'||substr(raw,5,4)||'-'||substr(raw,9,4)||'-'||substr(raw,13,4);
end $$;

create function recovery_created_at() returns timestamptz language sql stable security definer set search_path=public as $$
  select created_at from recovery where user_id = auth.uid() $$;

-- 코드가 맞으면 옛 계정의 기록을 지금 계정으로 옮김 (이 기기의 현재 기록은 대체됨)
create function restore_account(p_code text) returns boolean language plpgsql security definer set search_path=public as $$
declare new_uid uuid := auth.uid(); old_uid uuid;
begin
  if new_uid is null then raise exception 'login required'; end if;
  select user_id into old_uid from recovery where code_hash = hash_code(p_code);
  if old_uid is null then return false; end if;
  if old_uid = new_uid then return true; end if;
  delete from meals where user_id = new_uid;   delete from reviews where user_id = new_uid;
  delete from votes where user_id = new_uid;   delete from wc_runs where user_id = new_uid;
  delete from recovery where user_id = new_uid;
  update meals   set user_id = new_uid where user_id = old_uid;   -- meals 먼저: 후기의 '먹음 인증' 재계산에 필요
  update reviews set user_id = new_uid where user_id = old_uid;
  update votes   set user_id = new_uid where user_id = old_uid;
  update wc_runs set user_id = new_uid where user_id = old_uid;
  update recovery set user_id = new_uid where user_id = old_uid;  -- 같은 코드를 계속 쓸 수 있음
  return true;
end $$;

revoke execute on function create_recovery_code(), restore_account(text), recovery_created_at() from public, anon;
grant  execute on function create_recovery_code(), restore_account(text), recovery_created_at() to authenticated;
