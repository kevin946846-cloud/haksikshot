// 배포 전 점검: 개인정보 안내 페이지, 링크 미리보기·파비콘 메타, 문서 구조(제목은 head 안)
const { test, expect } = require("@playwright/test");

test("앱에서 개인정보 안내로 이동, 모으는 정보·지우는 방법 안내", async ({ page }) => {
  await page.goto("/");
  await page.locator("#intro [data-intro-go]").click();
  await page.locator('.proto a[href="privacy"]').click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator("h1 small")).toHaveText("개인정보 안내");
  for (const h of ["모으는 정보", "어디에 보관하나요", "지우는 방법", "사진 올릴 때 주의"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await expect(page.getByText("이름·학번·이메일·전화번호는 받지 않아요")).toBeVisible();
});

test("메인 화면 메타: 제목·설명·공유 이미지·파비콘이 head 안에 있음", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/학식샷/);
  const m = await page.evaluate(() => ({
    titleInHead: !!document.head.querySelector("title"),
    desc: document.head.querySelector('meta[name="description"]')?.content,
    og: document.head.querySelector('meta[property="og:image"]')?.content,
    icon: document.head.querySelector('link[rel="icon"]')?.getAttribute("href"),
    css: document.head.querySelectorAll('link[rel="stylesheet"]').length,
  }));
  expect(m.titleInHead).toBe(true);
  expect(m.desc).toContain("학식");
  expect(m.og).toMatch(/og\.png$/);
  expect(m.css).toBe(2);
  expect((await page.request.get("/" + m.icon)).ok()).toBe(true);
  expect((await page.request.get("/og.png")).headers()["content-type"]).toContain("image/png");
});
