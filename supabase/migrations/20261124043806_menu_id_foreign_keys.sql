-- 메뉴를 가리키는 모든 표에 외래 키: 없는 메뉴 id는 저장 불가, ERD의 관계와 실제 제약을 일치
-- 메뉴는 지우지 않고 on_sale=false로 내리므로 삭제는 막고(restrict), id를 바꾸면 따라 바뀜(cascade)
-- 주의: 새 환경에서는 seed.sql(메뉴 43개)을 먼저 넣어야 먹음 체크·후기를 저장할 수 있음
alter table public.meals   add constraint meals_menu_id_fkey   foreign key (menu_id) references public.menus(id) on update cascade on delete restrict;
alter table public.reviews add constraint reviews_menu_id_fkey foreign key (menu_id) references public.menus(id) on update cascade on delete restrict;
alter table public.votes   add constraint votes_menu_id_fkey   foreign key (menu_id) references public.menus(id) on update cascade on delete restrict;
alter table public.photos  add constraint photos_menu_id_fkey  foreign key (menu_id) references public.menus(id) on update cascade on delete restrict;
alter table public.sold    add constraint sold_menu_id_fkey    foreign key (menu_id) references public.menus(id) on update cascade on delete restrict;
-- 외래 키 쪽 조회용 인덱스 (meals·reviews·votes는 기본키/유일키에 menu_id가 앞에 없어 따로)
create index if not exists meals_menu_id_idx   on public.meals (menu_id);
create index if not exists reviews_menu_id_idx on public.reviews (menu_id);
