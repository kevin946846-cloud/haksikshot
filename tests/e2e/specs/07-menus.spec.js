// 메뉴판을 DB(menus 표)에서 받기: 기본 목록과 운영 DB가 같은지, DB를 바꾸면 화면이 따라가는지
const { test, expect } = require("@playwright/test");
const { openApp, db, cleanup } = require("../helpers");
const vm = require("vm"), fs = require("fs"), path = require("path");

// 앱에 내장된 기본 메뉴 목록 (js/data.js를 그대로 실행해서 꺼냄)
function builtinMenus() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../../js/data.js"), "utf8") + ";this.MENUS=MENUS;", ctx);
  return ctx.MENUS.map((m) => ({ id: m.id, cat: m.cat, name: m.name, price: m.price, market: m.market, n: { ...m.n }, tags: [...m.tags] }));
}

test("앱 내장 기본 메뉴판과 운영 DB menus 표가 같다", async ({ page }) => {
  await openApp(page);
  const rows = await db(page, async () => (await sb.from("menus").select("*").eq("on_sale", true).order("sort_order")).data);
  const fromDb = rows.map((r) => ({ id: r.id, cat: r.category, name: r.name, price: r.price, market: r.market_price,
    n: { kcal: r.kcal, protein: r.protein, carbs: r.carbs, sugar: r.sugar }, tags: r.tags }));
  expect(fromDb).toEqual(builtinMenus());
});

test("앱(익명 사용자)은 메뉴판을 고칠 수 없다", async ({ page }) => {
  await openApp(page);
  const r = await db(page, async () => {
    const before = (await sb.from("menus").select("price").eq("id", "i4").single()).data.price;
    const up = await sb.from("menus").update({ price: 100 }).eq("id", "i4").select();
    const ins = await sb.from("menus").insert({ id: "i99", category: "일품", name: "가짜", price: 1 });
    const after = (await sb.from("menus").select("price").eq("id", "i4").single()).data.price;
    return { changed: up.data?.length ?? 0, insErr: ins.error?.code, same: before === after };
  });
  expect(r).toEqual({ changed: 0, insErr: "42501", same: true });
});

test("DB에서 가격 변경·새 메뉴·판매 중단을 하면 다시 배포하지 않아도 화면에 반영된다", async ({ page }) => {
  // 운영 DB는 건드리지 않고, 서버 응답만 바꿔서 'DB가 이렇게 바뀌었다'고 가정
  await page.route(/\/rest\/v1\/menus\?/, async (route) => {
    const res = await route.fetch(), rows = await res.json();
    const i4 = rows.find((r) => r.id === "i4"); i4.price = 3900; i4.name = "날치알밥(가격 인하)";
    rows.find((r) => r.id === "y9").on_sale = false;
    rows.push({ id: "i14", category: "일품", name: "E2E 신메뉴 덮밥", price: 5200, market_price: 9000, kcal: 700, protein: 30, carbs: 90, sugar: 8, tags: ["밥", "고기"], sort_order: 99, on_sale: true });
    await route.fulfill({ response: res, json: rows });
  });
  await openApp(page);
  try {
    await expect(page.locator('#ticketbar .tc[data-c="일품"] b')).toHaveText("14");
    await expect(page.locator('#ticketbar .tc[data-c="양식"] b')).toHaveText("8");
    await page.locator('.cat[data-c="일품"]').click();
    await expect(page.locator('#menus [data-open="i4"]')).toContainText("날치알밥(가격 인하)");
    await expect(page.locator('#menus [data-open="i4"]')).toContainText("3,900원");
    await expect(page.locator('#menus [data-open="i14"]')).toContainText("E2E 신메뉴 덮밥");
    await page.locator('.cat[data-c="양식"]').click();
    await expect(page.locator('#menus [data-open="y9"]')).toHaveCount(0);
    expect(await db(page, () => byId("y9")?.name)).toBe("피카츄오므라이스");   // 판매 중단돼도 예전 기록용 이름은 남음
    // 새 메뉴 상세가 열리고 할인율도 새 가격으로 계산됨
    await page.locator('.cat[data-c="일품"]').click();
    await page.locator('#menus [data-open="i14"]').click();
    await expect(page.locator("#detail")).toContainText("5,200원");
    await expect(page.locator("#detail")).toContainText("42% 저렴");   // (1 - 5200/9000) = 42%
  } finally { await cleanup(page); }
});
