// CDN이 막힌 학교망 가정: Supabase 말고 바깥 주소는 전부 차단해도 화면·글꼴·로그인이 정상인지
const { test, expect } = require("@playwright/test");
const { ctxOpts, openApp, cleanup } = require("../helpers");

test("외부 CDN이 막혀도 앱이 뜨고 글꼴과 로그인이 된다", async ({ browser }, info) => {
  const ctx = await browser.newContext(ctxOpts(info.project.use));
  const blocked = [];
  await ctx.route("**/*", (r) => {
    const host = new URL(r.request().url()).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".supabase.co")) return r.continue();
    blocked.push(r.request().url()); return r.abort("blockedbyclient");
  });
  const page = await ctx.newPage();
  try {
    await openApp(page);                                   // supabase-js가 로드돼야 로그인(me)이 생김
    await expect(page.locator("section.tkt")).toBeVisible();
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return { jua: document.fonts.check("16px Jua", "오늘 뭐 먹지"), noto: document.fonts.check("16px 'Noto Sans KR'", "학식") };
    });
    expect(fonts).toEqual({ jua: true, noto: true });
    expect(blocked, "앱이 바깥 주소를 부르면 안 됨").toEqual([]);
  } finally { await cleanup(page).catch(() => {}); await ctx.close(); }
});
