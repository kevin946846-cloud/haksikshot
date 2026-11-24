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
    expect(keys).toEqual({ i6: "stew", i4: "albap", i8: "albap", y3: "rice", i11: "gukbap", b11: "noodle", b6: "kimbap", y1: "cutlet", y7: "omurice", b4: "tteok", b2: "plainrice" });

    // 메뉴 43개가 모두 서로 다른 그림 (45도 구도, 그릇 + 내용물)
    const all = await db(page, () => MENUS.map((m) => potKey(m.name) || restKey(m.name)));
    expect(all.every(Boolean)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
    // 이름으로 못 찾는 새 메뉴도 종류별 대표 그림이 나옴
    expect(await db(page, () => foodIcon(M("b30", "분식", "짬뽕", 6000, [0, 0, 0, 0])).includes("<g"))).toBe(true);

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

test("메뉴 아이콘 43개가 모두 48×48 틀 안에 그려진다 (잘림 없음)", async ({ page }) => {
  await openApp(page);
  // 아이콘을 바깥 여백을 둔 큰 캔버스에 그려서, 틀 밖으로 나간 픽셀이 있는지 셈
  const over = await db(page, async () => {
    const out = [];
    for (const m of MENUS) {
      const N = 192, pad = 24;
      const svg = foodIcon(m).replace('<svg class="fi"', `<svg xmlns="http://www.w3.org/2000/svg" width="${N + 2 * pad}" height="${N + 2 * pad}"`)
        .replace('viewBox="0 0 48 48"', `viewBox="${-pad / 4} ${-pad / 4} ${48 + pad / 2} ${48 + pad / 2}"`)
        .replace(/var\(--tofu,#fff\)/g, "#fff").replace(/currentColor/g, "#000");
      const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
      const c = document.createElement("canvas"); c.width = c.height = N + 2 * pad;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++)
        if (!(x >= pad && x < pad + N && y >= pad && y < pad + N) && d[(y * c.width + x) * 4 + 3] > 40) n++;
      if (n) out.push(`${m.name}(${n})`);
    }
    return out;
  });
  expect(over, "틀 밖으로 나간 아이콘").toEqual([]);
});
