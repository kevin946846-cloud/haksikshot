// 외국인 유학생용 영어 화면 + 메뉴 소개 + 첫 화면(인트로) 동작
const { test, expect } = require("@playwright/test");
const { openApp, passIntro, db, cleanup } = require("../helpers");

test("메뉴 43개 모두 영문 이름·한/영 소개·맵기·재료 정보가 있다", async ({ page }) => {
  await openApp(page);
  const bad = await db(page, () => MENUS.filter((m) => {
    const i = MENU_INFO[m.id];
    return !i || !i.en || !i.ko || !i.d || ![0, 1, 2, 3].includes(i.hot) || !Array.isArray(i.has) || i.has.some((h) => !HAS[h]);
  }).map((m) => m.id));
  expect(bad).toEqual([]);
});

test("한국어 상세에 메뉴 소개·맵기·재료와 '직원에게 확인' 안내가 보인다", async ({ page }) => {
  await openApp(page);
  await page.locator('#menus [data-open="i6"]').click();   // 김치찌개
  const about = page.locator("#detail .about");
  await expect(about.locator("h4")).toContainText("메뉴 소개");
  await expect(about).toContainText("매워요");
  await expect(about.locator(".pill", { hasText: "돼지고기" })).toBeVisible();
  await expect(about).toContainText("직원에게 꼭 확인하세요");
});

test("English: 인트로에서 언어를 바꾸면 메뉴판·상세·탭이 영어로, 키오스크용 한국어 이름은 같이 보인다", async ({ page }) => {
  await openApp(page, { keepIntro: true });
  try {
    await page.locator('#intro [data-lang="en"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#intro-q")).toHaveText(/^What's for (breakfast|lunch|dinner) today\?$/);
    await expect(page.locator('#ticketbar .tc[data-c="일품"] small')).toHaveText("Korean");
    await page.locator('#ticketbar .tc[data-c="일품"]').click();

    await expect(page.locator(".tab", { hasText: /^Menu$/ })).toBeVisible();
    await expect(page.locator('.cat[data-c="양식"]')).toContainText("Western");
    const tile = page.locator('#menus [data-open="i11"]');
    await expect(tile.locator(".tn")).toHaveText("Pork and Rice Soup (Dwaeji-gukbap)");
    await expect(tile.locator(".kn")).toHaveText("돼지국밥");                  // 키오스크에서 찾을 한국어 이름
    await expect(tile.locator(".tp")).toContainText("₩");

    // 영어 화면의 메뉴판에 한국어가 남아 있으면 안 됨 (로고·한국어 이름·건물 이름은 일부러 남김)
    const korean = await page.evaluate(() => {
      const out = [], w = document.createTreeWalker(document.querySelector(".app"), NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        const el = n.parentElement, t = n.textContent.trim();
        if (!t || !/[가-힣]/.test(t) || !el.offsetParent || el.closest("h1,.kn,.kname,[lang=ko],#today,.lang,#acct,#view-reco,#view-taste,#view-rank")) continue;
        out.push(t);
      }
      return out;
    });
    expect(korean).toEqual([]);

    await tile.click();
    const about = page.locator("#detail .about");
    await expect(about.locator("h4")).toContainText("About this dish");
    await expect(about).toContainText("Busan's signature dish");
    await expect(about.locator(".pill", { hasText: "Pork" })).toBeVisible();
    await expect(about).toContainText("halal");
    await expect(page.locator('#detail [data-a="eat"]')).toContainText("I ate this");
    await page.keyboard.press("Escape");

    // 다른 탭도 영어
    await page.locator(".tab", { hasText: /^For you$/ }).click();
    await expect(page.locator('[data-goal="value"] b')).toHaveText("Best value");
    await page.locator(".tab", { hasText: /^Ranking$/ }).click();
    await expect(page.locator("#view-rank h2").first()).toHaveText("Cafeteria World Cup");

    // 새로고침해도 영어 유지 (같은 탭이라 인트로는 건너뜀), 헤더에서 한국어로 되돌리기
    await page.reload();
    await page.waitForFunction(() => typeof me !== "undefined" && !!me);
    await expect(page.locator("#intro")).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator('header [data-lang="ko"]').click();
    await expect(page.locator(".tab", { hasText: /^메뉴$/ })).toBeVisible();
    await expect(page.locator('#menus [data-open="i11"] .tn')).toHaveText("돼지국밥");
  } finally { await cleanup(page); }
});

test("English: 먹음 체크 알림과 AI 사진 확인 서버 응답도 영어", async ({ page }) => {
  await openApp(page, { keepIntro: true });
  try {
    await page.locator('#intro [data-lang="en"]').click();
    await passIntro(page);
    // 서버 함수: 먹음 체크 안 한 메뉴 사진 → 규칙에 걸린 이유가 영어로 (AI까지 가지 않음)
    const r = await db(page, async () => (await sb.functions.invoke("verify-photo", { body: { kind: "food", menuId: "i4", menuName: "날치알밥", cat: "일품", image: "data:image/jpeg;base64,AAAA", lang: "en" } })).data);
    expect(r).toMatchObject({ ok: false, reason: "You can only post photos of menus you checked today" });
    const k = await db(page, async () => (await sb.functions.invoke("verify-photo", { body: { kind: "food", menuId: "i4", menuName: "날치알밥", cat: "일품", image: "data:image/jpeg;base64,AAAA" } })).data);
    expect(k.reason).toBe("오늘 먹음 체크한 메뉴만 사진을 올릴 수 있어요");   // lang이 없으면 예전처럼 한국어

    await page.locator('#menus [data-open="i4"]').click();
    await page.locator('#detail [data-a="eat"]').click();
    await page.locator('#detail [data-slot="점심"]').click();
    await expect(page.locator("#toast")).toContainText("Lunch checked!");
  } finally { await cleanup(page); }
});
