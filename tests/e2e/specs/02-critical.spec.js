// 크리티컬 케이스: 틀리면 데이터가 꼬이거나 사용자가 기록을 잃는 경우
const { test, expect } = require("@playwright/test");
const { ctxOpts, openApp, db, cleanup, closeDialogs, openMenu, eat, serverRows } = require("../helpers");

test.describe("크리티컬 케이스", () => {
  test("C1. 하루 3끼를 다 체크하면 4번째는 화면에서도 서버에서도 막힌다", async ({ page }) => {
    await openApp(page);
    try {
      await eat(page, "i4", "아침");
      await eat(page, "i5", "점심");
      await eat(page, "i6", "저녁");
      await expect.poll(() => serverRows(page, "meals").then((r) => r.length)).toBe(3);
      await closeDialogs(page);
      await expect(page.locator("#slotbar")).toContainText("3/3");

      await openMenu(page, "i7");
      await expect(page.locator("#detail")).toContainText("아침·점심·저녁 먹음 체크를 모두 했어요");
      await expect(page.locator('#detail [data-a="eat"]')).toHaveCount(0);

      // 화면을 우회해서 서버에 바로 넣어도 거절돼야 함 (meals 기본키: user_id, day, slot)
      const err = await db(page, async () => (await sb.from("meals").insert({ user_id: me, menu_id: "i7", slot: "아침" })).error?.code);
      expect(err).toBe("23505");
      expect((await serverRows(page, "meals")).length).toBe(3);
    } finally { await cleanup(page); }
  });

  test("C2. 같은 메뉴를 두 번 평가하면 한 줄로 덮어쓴다(중복 평가 없음)", async ({ page }) => {
    await openApp(page);
    try {
      for (const [stars, text] of [[2, "첫 평가"], [5, "다시 먹어보니 맛있음"]]) {
        await openMenu(page, "y1");
        await page.locator(`#detail [data-star="${stars}"]`).click();
        await page.locator("#rv-text").fill(text);
        await page.locator('#detail [data-a="submit"]').click();
        await expect.poll(() => serverRows(page, "reviews", { menu_id: "y1" }).then((r) => r[0]?.stars)).toBe(stars);
      }
      const rows = await serverRows(page, "reviews", { menu_id: "y1" });
      expect(rows).toHaveLength(1);
      expect(rows[0].body).toBe("다시 먹어보니 맛있음");
      await openMenu(page, "y1");
      await expect(page.locator('#detail [data-a="submit"]')).toHaveText(/수정하기/);
      // 서버에 직접 두 번째 insert를 해도 거절 (user_id, menu_id 유일)
      const err = await db(page, async () => (await sb.from("reviews").insert({ user_id: me, menu_id: "y1", stars: 1 })).error?.code);
      expect(err).toBe("23505");
    } finally { await cleanup(page); }
  });

  test("C3. 품절 표시는 매일 19시에 초기화된다 (18:59엔 유지, 19:01엔 삭제)", async ({ page }) => {
    await openApp(page);
    const r = await db(page, () => {
      const Real = Date;
      const at = (iso, fn) => {     // 잠깐 시계를 바꿔서 앱 함수를 실행
        const t = new Real(iso).getTime();
        window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [t])) } static now() { return t } };
        try { return fn() } finally { window.Date = Real }
      };
      const keep = st.sold;
      const soldAt = new Real("2026-11-23T12:30:00+09:00").getTime();   // 점심에 품절 제보
      const out = {};
      out.reset1859 = new Real(at("2026-11-23T18:59:00+09:00", lastReset)).toISOString();
      out.reset1901 = new Real(at("2026-11-23T19:01:00+09:00", lastReset)).toISOString();
      st.sold = { i4: { at: soldAt, who: "test" } };
      at("2026-11-23T18:59:00+09:00", purgeSold); out.kept = !!st.sold.i4;
      at("2026-11-23T19:01:00+09:00", purgeSold); out.purged = !st.sold.i4;
      st.sold = { i4: { at: new Real("2026-11-23T19:30:00+09:00").getTime(), who: "test" } };   // 19시 이후 제보
      at("2026-11-24T08:00:00+09:00", purgeSold); out.nextMorningKept = !!st.sold.i4;
      st.sold = keep;
      return out;
    });
    expect(r.reset1859).toBe("2026-11-22T10:00:00.000Z");   // 전날 19:00 KST
    expect(r.reset1901).toBe("2026-11-23T10:00:00.000Z");   // 당일 19:00 KST
    expect(r.kept).toBe(true);
    expect(r.purged).toBe(true);
    expect(r.nextMorningKept).toBe(true);                    // 저녁 품절은 다음 날 아침까지 유지
  });

  test("C4. 복구 코드로 다른 기기에 기록을 옮긴다", async ({ browser }, info) => {
    const A = await browser.newContext(ctxOpts(info.project.use));
    const B = await browser.newContext(ctxOpts(info.project.use));
    const a = await A.newPage(), b = await B.newPage();
    try {
      await openApp(a);
      await eat(a, "b3", "점심");
      await a.locator('#detail [data-star="5"]').click();
      await a.locator('#detail [data-a="submit"]').click();
      await expect.poll(() => serverRows(a, "reviews", { menu_id: "b3" }).then((r) => r.length)).toBe(1);
      await closeDialogs(a);

      await a.locator(".tab", { hasText: /^내 입맛$/ }).click();
      await a.locator('[data-acct="make"]').click();
      const code = (await a.locator("#acct").textContent()).match(/[0-9a-f]{4}(-[0-9a-f]{4}){3}/i)?.[0];
      expect(code, "복구 코드가 화면에 보여야 함").toBeTruthy();

      await openApp(b);
      const meB = await db(b, () => me);
      await b.locator(".tab", { hasText: /^내 입맛$/ }).click();
      await b.locator('[data-acct="open"]').click();
      await b.locator("#acct-in").fill("0000-0000-0000-0000");   // 틀린 코드 먼저
      await b.locator('[data-acct="restore"]').click();
      await expect(b.locator("#toast")).toContainText("코드가 맞지 않아요");
      await b.locator("#acct-in").fill(code);
      await b.locator('[data-acct="restore"]').click();
      await expect(b.locator("#toast")).toContainText("기록을 복구했어요");

      expect(await serverRows(b, "meals", { menu_id: "b3" })).toHaveLength(1);
      expect(await serverRows(b, "reviews", { menu_id: "b3" })).toHaveLength(1);
      expect(await db(b, () => me)).toBe(meB);                     // B는 자기 계정 그대로, 기록만 옮겨 옴
      expect(await serverRows(a, "meals")).toHaveLength(0);         // A에는 더 이상 없음
      await openMenu(b, "b3");
      await expect(b.locator('#detail [data-a="uneat"]')).toBeVisible();
    } finally {
      await cleanup(b).catch(() => {});
      await cleanup(a).catch(() => {});
      await A.close(); await B.close();
    }
  });

  test("C5. 서버가 죽어도 메뉴판은 뜨고, 사용자에게 알려 준다", async ({ browser }, info) => {
    const ctx = await browser.newContext(ctxOpts(info.project.use));
    await ctx.route(/supabase\.co\//, (r) => r.abort("connectionrefused"));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto("/");
      await expect(page.locator("section.tkt")).toBeVisible();
      await expect(page.locator("#menus .tile")).not.toHaveCount(0);
      await expect(page.locator("#toast")).toContainText(/서버에 연결하지 못했어요|불러오지 못했어요/, { timeout: 20_000 });
      // 로그인 전에 먹음 체크를 눌러도 앱이 멈추지 않고 안내만 함
      await page.locator('[data-open="i4"]').click();
      await page.locator('#detail [data-a="eat"]').click();
      await page.locator('#detail [data-slot="점심"]').click();
      await expect(page.locator("#toast")).toBeVisible();
      expect(errors, "처리 안 된 JS 오류가 없어야 함").toEqual([]);
    } finally { await ctx.close(); }
  });
});
