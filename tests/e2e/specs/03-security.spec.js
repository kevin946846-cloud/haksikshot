// 보안: 화면을 거치지 않고 서버에 직접 요청해도 규칙(RLS·제약)이 지켜지는지
const { test, expect } = require("@playwright/test");
const { openApp, db, cleanup } = require("../helpers");

test.describe("서버 규칙", () => {
  test.beforeEach(async ({ page }) => { await openApp(page); });
  test.afterEach(async ({ page }) => { await cleanup(page); });

  test("품절·사진은 서버 함수(AI 확인)를 거쳐야만 쓸 수 있다", async ({ page }) => {
    const codes = await db(page, async () => [
      (await sb.from("sold").insert({ menu_id: "i4" })).error?.code,
      (await sb.from("photos").insert({ menu_id: "i4", path: "food/x.jpg" })).error?.code,
    ]);
    expect(codes).toEqual(["42501", "42501"]);
  });

  test("다른 사람 이름(user_id)으로는 기록을 쓸 수 없다", async ({ page }) => {
    const code = await db(page, async () =>
      (await sb.from("meals").insert({ user_id: "00000000-0000-0000-0000-000000000000", menu_id: "i4", slot: "점심" })).error?.code);
    expect(code).toBe("42501");
  });

  test("없는 메뉴, 범위 밖 별점, 200자 넘는 후기는 거절된다", async ({ page }) => {
    const codes = await db(page, async () => [
      (await sb.from("reviews").insert({ user_id: me, menu_id: "x99", stars: 3 })).error?.code,
      (await sb.from("reviews").insert({ user_id: me, menu_id: "i4", stars: 6 })).error?.code,
      (await sb.from("reviews").insert({ user_id: me, menu_id: "i4", stars: 3, body: "가".repeat(201) })).error?.code,
    ]);
    expect(codes).toEqual(["23514", "23514", "23514"]);
  });

  test("지난주·다음 주 투표는 거절되고 이번 주만 된다", async ({ page }) => {
    const r = await db(page, async () => {
      const ins = async (week) => (await sb.from("votes").insert({ user_id: me, week, menu_id: "i4", v: 1 })).error;
      return { past: !!(await ins("2020-1-6")), future: !!(await ins("2099-1-5")), now: (await ins(wkKey()))?.message || null };
    });
    expect(r).toEqual({ past: true, future: true, now: null });
  });

  test("틀린 복구 코드는 false, 형식이 틀리면 바로 false", async ({ page }) => {
    const r = await db(page, async () => [
      (await sb.rpc("restore_account", { p_code: "ffff-ffff-ffff-ffff" })).data,
      (await sb.rpc("restore_account", { p_code: "' or 1=1 --" })).data,
    ]);
    expect(r).toEqual([false, false]);
  });
});
