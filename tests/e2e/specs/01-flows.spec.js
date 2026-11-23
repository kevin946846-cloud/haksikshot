// 일반 흐름: 사용자가 매일 하는 동작을 처음부터 끝까지 (화면 → 서버 → DB → 다시 화면)
const { test, expect } = require("@playwright/test");
const { ctxOpts, openApp, db, cleanup, closeDialogs, openMenu, eat, serverRows } = require("../helpers");

test.describe.serial("일반 흐름", () => {
  let ctx, page;
  test.beforeAll(async ({ browser }, info) => {
    ctx = await browser.newContext(ctxOpts(info.project.use));
    page = await ctx.newPage();
    await openApp(page);
  });
  test.afterAll(async () => { await cleanup(page); await ctx.close(); });

  test("첫 화면이 식권 히어로로 시작한다", async () => {
    const hero = page.locator("section.tkt");
    await expect(hero).toBeVisible();
    await expect(hero.locator("h2")).toHaveText(/오늘\s*뭐 먹지\?/);
    await expect(hero.getByRole("link", { name: /메뉴 구경하기/ })).toBeVisible();
    const box = await hero.boundingBox();
    expect(box.y).toBeLessThan(400);   // 스크롤 없이 첫 화면에 보임
  });

  test("식권 스텁의 메뉴 수가 실제 메뉴 수와 같고, 누르면 그 탭으로 간다", async () => {
    const counts = await db(page, () => ["일품", "양식", "분식"].map((c) => MENUS.filter((m) => m.cat === c).length));
    for (const [i, c] of ["일품", "양식", "분식"].entries())
      await expect(page.locator(`#ticketbar .tc[data-c="${c}"] b`)).toHaveText(String(counts[i]));
    await page.locator('#ticketbar .tc[data-c="양식"]').click();
    await expect(page.locator('.cat[data-c="양식"]')).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#menus .tile")).toHaveCount(counts[1]);
    await page.locator('.cat[data-c="일품"]').click();
  });

  test("아래 탭 4개가 SVG 아이콘과 함께 전환된다", async () => {
    for (const name of ["메뉴 추천", "내 입맛", "랭킹", "메뉴"]) {
      const tab = page.locator(".tab", { hasText: new RegExp(`^${name}$`) });
      await expect(tab.locator("svg")).toHaveCount(1);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }
  });

  test("가격 낮은 순·높은 순 정렬", async () => {
    const prices = () => page.locator("#menus .tile .tp").allTextContents().then((a) => a.map((t) => +t.replace(/\D/g, "")));
    await page.locator('[data-sort="low"]').click();
    const lo = await prices(); expect(lo).toEqual([...lo].sort((a, b) => a - b));
    await page.locator('[data-sort="high"]').click();
    const hi = await prices(); expect(hi).toEqual([...hi].sort((a, b) => b - a));
    await page.locator('[data-sort="low"]').click();
  });

  test("메뉴 카드를 누르면 상세가 열리고 Esc로 닫힌다", async () => {
    await openMenu(page, "i4");
    await expect(page.locator("#detail h3")).toHaveText("날치알밥");
    await closeDialogs(page);
  });

  test("먹음 체크 → 서버 저장 → 오늘 먹음 체크 1/3", async () => {
    await eat(page, "i4", "저녁");
    await expect.poll(() => serverRows(page, "meals", { menu_id: "i4" }).then((r) => r.length)).toBe(1);
    await closeDialogs(page);
    await expect(page.locator("#slotbar")).toContainText("1/3");
  });

  test("별점 4점 + 코멘트 등록 → 서버 저장, 카드에 4.0, HTML은 글자로만 표시", async () => {
    await openMenu(page, "i4");
    await page.locator('#detail [data-star="4"]').click();
    await page.locator("#rv-text").fill("E2E 테스트 <img src=x onerror=window.__xss=1>");
    await page.locator('#detail [data-a="submit"]').click();
    await expect.poll(() => serverRows(page, "reviews", { menu_id: "i4" }).then((r) => r[0]?.stars)).toBe(4);
    await expect(page.locator("#detail")).toContainText("E2E 테스트 <img src=x");
    expect(await db(page, () => window.__xss || 0)).toBe(0);
    await closeDialogs(page);
    await expect(page.locator('#menus [data-open="i4"] .tr')).toContainText("4.0");
  });

  test("먹음 체크 취소 → 서버에서 삭제, 후기의 먹음 인증 해제", async () => {
    await openMenu(page, "i4");
    await page.locator('#detail [data-a="uneat"]').click();
    await expect.poll(() => serverRows(page, "meals", { menu_id: "i4" }).then((r) => r.length)).toBe(0);
    await expect.poll(() => serverRows(page, "reviews", { menu_id: "i4" }).then((r) => r[0]?.verified)).toBe(false);
    await closeDialogs(page);
  });

  test("가성비 투표: 추천 → 비추천 → 취소가 서버와 일치", async () => {
    await page.locator(".tab", { hasText: /^메뉴 추천$/ }).click();
    await page.locator('[data-goal="value"]').click();   // 투표 버튼은 '가성비' 목표에서만 보임
    const up = page.locator('[data-vote="1"]').first();
    const id = await up.getAttribute("data-id");
    const down = page.locator(`[data-vote="-1"][data-id="${id}"]`);
    const v = () => serverRows(page, "votes", { menu_id: id }).then((r) => r[0]?.v ?? 0);
    await up.click();   await expect.poll(v).toBe(1);
    await down.click(); await expect.poll(v).toBe(-1);
    await down.click(); await expect.poll(v).toBe(0);
  });

  test("월드컵: 시작해서 몇 판 고르고 그만두면 기록이 남지 않는다", async () => {
    await page.locator(".tab", { hasText: /^랭킹$/ }).click();
    await page.locator(".wct").first().click();
    await expect(page.locator("#wc")).toHaveAttribute("open", "");
    for (let i = 0; i < 3; i++) {
      const pick = page.locator("#wc-body [data-wcpick]").first();
      await expect(pick).toBeVisible({ timeout: 5_000 });   // 라운드 시작 화면(1.6초) 뒤에 나옴
      await pick.click();
    }
    await page.locator("[data-wcclose]").click();
    await expect(page.locator("#wc[open]")).toHaveCount(0);
    expect((await serverRows(page, "wc_runs")).length).toBe(0);
  });
});
