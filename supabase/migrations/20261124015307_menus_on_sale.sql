-- 메뉴판을 DB에서 관리 (2026-11-24)
-- 왜: 가격·메뉴가 바뀌면 코드를 고쳐 다시 배포해야 했음. 이제 menus 표만 고치면 앱이 받아서 반영.
-- on_sale = false: 판매 중단 (행을 지우지 않아야 예전 먹음 기록·후기가 메뉴 이름을 계속 찾음)
alter table public.menus add column if not exists on_sale boolean not null default true;
alter table public.menus add constraint menus_id_format check (id ~ '^[iyb][0-9]{1,2}$');   -- 후기·투표 표와 같은 형식
alter table public.menus add constraint menus_price_check check (price > 0 and (market_price is null or market_price > 0));
