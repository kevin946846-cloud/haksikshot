// 메뉴 카드는 SVG 아이콘, 사진은 카드를 눌러 상세에서 보기
const { test, expect } = require("@playwright/test");
const { openApp, db, cleanup, openMenu, closeDialogs } = require("../helpers");

test("메뉴 카드는 SVG 아이콘으로, 사진은 눌렀을 때 상세에서 보인다", async ({ page }) => {
  await openApp(page);
  try {
    for (const c of ["일품", "양식", "분식"]) {                       // 모든 카드에 아이콘, 카드에는 사진 없음
      await page.locator(`.cat[data-c="${c}"]`).click();
      const n = await page.locator("#menus .tile").count();
      await expect(page.locator("#menus .tile .tt svg.fi")).toHaveCount(n);
      await expect(page.locator("#menus .tile .tt img")).toHaveCount(0);
    }
    // 메뉴 종류별로 맞는 아이콘
    const keys = await db(page, () => Object.fromEntries(["i6", "i4", "i8", "y3", "i11", "b11", "b6", "y1", "y7", "b4", "b2"].map((id) => [id, iconKey(byId(id))])));
    expect(keys).toEqual({ i6: "stew", i4: "albap", i8: "albap", y3: "rice", i11: "soup", b11: "noodle", b6: "kimbap", y1: "cutlet", y7: "omurice", b4: "tteok", b2: "plainrice" });

    // 사진 없는 메뉴: 상세에 큰 아이콘
    await openMenu(page, "i4");
    await expect(page.locator("#detail .hero svg.big-ic")).toBeVisible();
    await closeDialogs(page);

    // 사진 있는 메뉴: 카드에는 아이콘 + 사진 표시 점, 상세에서 사진
    await db(page, () => { st.photos.i5 = { src: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", at: Date.now(), verified: true }; render(); });
    await page.locator('.cat[data-c="일품"]').click();
    await expect(page.locator('#menus [data-open="i5"] .tt svg.fi')).toBeVisible();
    await expect(page.locator('#menus [data-open="i5"] .hasph')).toBeVisible();
    await expect(page.locator('#menus [data-open="i5"] img')).toHaveCount(0);
    await openMenu(page, "i5");
    await expect(page.locator("#detail .hero img")).toHaveAttribute("alt", /치즈날치알밥 최근 사진/);
  } finally { await cleanup(page); }
});
