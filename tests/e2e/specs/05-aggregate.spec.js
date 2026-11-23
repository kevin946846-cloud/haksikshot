// 집계 함수: 다른 사람 평가·투표·월드컵 결과가 서버에서 합산돼 내 화면에 맞게 보이는지
const { test, expect } = require("@playwright/test");
const { ctxOpts, openApp, db, cleanup, closeDialogs, openMenu } = require("../helpers");

async function rateMenu(page, id, stars, text) {
  await openMenu(page, id);
  await page.locator(`#detail [data-star="${stars}"]`).click();
  await page.locator("#rv-text").fill(text);
  await page.locator('#detail [data-a="submit"]').click();
  await expect(page.locator("#toast")).toContainText("평가를 등록했어요");
  await closeDialogs(page);
}

test("두 사람의 별점이 합쳐진 평균, 남의 후기 글, 남의 투표 수가 보인다", async ({ browser }, info) => {
  const A = await browser.newContext(ctxOpts(info.project.use)), B = await browser.newContext(ctxOpts(info.project.use));
  const a = await A.newPage(), b = await B.newPage();
  try {
    await openApp(a); await openApp(b);
    await rateMenu(a, "b9", 5, "E2E 집계 테스트 A");
    await db(a, async () => sb.from("votes").upsert({ user_id: me, week: wkKey(), menu_id: "b9", v: 1 }, { onConflict: "user_id,week,menu_id" }));
    await rateMenu(b, "b9", 3, "E2E 집계 테스트 B");

    await db(b, async () => { lastSig = ""; await hydrate(); });          // 30초 기다리지 않고 바로 다시 받기
    await openMenu(b, "b9");
    await expect(b.locator("#detail")).toContainText("4.0 · 평가 2개");  // (5 + 3) / 2
    await expect(b.locator("#detail")).toContainText("E2E 집계 테스트 A");
    await expect(b.locator("#detail h4", { hasText: "후기" })).toContainText("후기 2개");
    const votes = await db(b, () => votesFor("b9"));
    expect(votes).toMatchObject({ up: 1, down: 0, mine: 0 });            // A의 추천 1개, 내 투표 없음
  } finally {
    await cleanup(a).catch(() => {}); await cleanup(b).catch(() => {});
    await A.close(); await B.close();
  }
});

test("월드컵 결승까지 마치면 승·우승 수가 서버 집계에 반영된다", async ({ page }) => {
  await openApp(page);
  try {
    await page.locator(".tab", { hasText: /^랭킹$/ }).click();
    await page.locator('[data-wcstart="fav"]').first().click();
    for (let i = 0; i < 15; i++) {                                       // 16강 → 결승: 15경기
      const pick = page.locator("#wc-body [data-wcpick]").first();
      await expect(pick).toBeVisible({ timeout: 5_000 });
      await pick.click();
    }
    await expect(page.locator("#wc-body .wcwin")).toBeVisible();
    const champ = await db(page, () => wc.champ);
    await expect.poll(async () => db(page, async (id) => {
      const { data } = await sb.rpc("wc_stats");
      return data.filter((r) => r.theme === "fav" && r.menu_id === id).reduce((s, r) => s + r.champ, 0);
    }, champ)).toBeGreaterThan(0);
  } finally {
    await cleanup(page);
  }
});
