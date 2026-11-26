// 테스트 공통 도우미
const { expect } = require("@playwright/test");

// 앱이 익명 로그인을 마치고 첫 데이터까지 받을 때까지 기다림
// 첫 화면(밥톨이 인트로)은 사용자처럼 '메뉴판 보기'를 눌러 넘김. keepIntro면 인트로에 머묾
async function openApp(page, { keepIntro = false } = {}) {
  page.on("dialog", (d) => d.accept());   // 앱의 confirm()은 '확인'으로
  await page.goto("/");
  await page.waitForFunction(() => typeof me !== "undefined" && !!me, null, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");   // 첫 hydrate(서버 데이터 받기)가 끝날 때까지
  if (keepIntro) { await expect(page.locator("#intro")).toBeVisible(); return; }
  await passIntro(page);
  await expect(page.locator("#menus .tile").first()).toBeVisible();
}
async function passIntro(page) {
  if (await page.locator("#intro").isVisible()) await page.locator("#intro [data-intro-go]").click();
  await expect(page.locator("#intro")).toBeHidden();
}

// 브라우저 안에서 Supabase 클라이언트(sb)로 직접 조회·쓰기
const db = (page, fn, arg) => page.evaluate(fn, arg);

// 이 테스트 사용자가 남긴 기록 지우기 (RLS상 자기 행만 지울 수 있음)
async function cleanup(page) {
  await db(page, async () => {
    for (const t of ["reviews", "votes", "meals", "wc_runs", "survey_responses"]) await sb.from(t).delete().eq("user_id", me);
    try { st.meals = []; st.mine = {}; st.plans = {}; save(); } catch (_) {}
  });
}

async function closeDialogs(page) {
  for (const sel of ["#detail", "#wc"]) {
    if (await page.locator(`${sel}[open]`).count()) { await page.keyboard.press("Escape"); await expect(page.locator(`${sel}[open]`)).toHaveCount(0); }
  }
}

async function openMenu(page, id) {
  await closeDialogs(page);
  await page.locator(".tab", { hasText: /^메뉴$/ }).click();
  const tile = page.locator(`#menus [data-open="${id}"]`);
  if (!(await tile.isVisible())) {
    const cat = id[0] === "i" ? "일품" : id[0] === "y" ? "양식" : "분식";
    await page.locator(`.cat[data-c="${cat}"]`).click();
  }
  await tile.click();
  await expect(page.locator("#detail")).toHaveAttribute("open", "");
}

async function eat(page, id, slot) {
  await openMenu(page, id);
  await page.locator('#detail [data-a="eat"]').click();
  await page.locator(`#detail [data-slot="${slot}"]`).click();
  await expect(page.locator('#detail [data-a="uneat"]')).toBeVisible();
}

const serverRows = (page, table, filter = {}) =>
  db(page, async ([t, f]) => {
    let q = sb.from(t).select("*").eq("user_id", me);
    for (const [k, v] of Object.entries(f)) q = q.eq(k, v);
    return (await q).data || [];
  }, [table, filter]);

const ctxOpts = (u) => ({ viewport: u.viewport, userAgent: u.userAgent, deviceScaleFactor: u.deviceScaleFactor,
  isMobile: u.isMobile, hasTouch: u.hasTouch, locale: u.locale, timezoneId: u.timezoneId, baseURL: u.baseURL });

module.exports = { ctxOpts, openApp, passIntro, db, cleanup, closeDialogs, openMenu, eat, serverRows };
