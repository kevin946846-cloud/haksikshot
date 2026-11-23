// 휴대폰 시간대가 한국이 아니어도(해외, 시간대 설정이 바뀐 기기) 날짜·끼니·주차가 한국 시간 기준인지
const { test, expect } = require("@playwright/test");
const { ctxOpts, openApp, db, cleanup, eat, closeDialogs, openMenu, serverRows } = require("../helpers");

for (const tz of ["America/Los_Angeles", "Europe/London"]) {
  test(`시간대 ${tz} 기기에서도 한국 시간 기준으로 동작한다`, async ({ browser }, info) => {
    const ctx = await browser.newContext({ ...ctxOpts(info.project.use), timezoneId: tz });
    const page = await ctx.newPage();
    try {
      await openApp(page);
      const r = await db(page, () => {
        const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hourCycle: "h23",
          year: "numeric", month: "numeric", day: "numeric", hour: "numeric", weekday: "short" })
          .formatToParts(new Date()).map((x) => [x.type, x.value]));
        const h = +p.hour;
        return {
          browserTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slot: nowSlot(), expectSlot: h < 11 ? "아침" : h < 16 ? "점심" : "저녁",
          today: document.getElementById("today").textContent, expectToday: `${p.month}월 ${p.day}일`,
          resetHourKst: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(lastReset()),
          weekStartDay: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short", hour: "numeric", hourCycle: "h23" }).format(weekStart()),
          isTodayNow: isToday(Date.now()),
        };
      });
      expect(r.browserTz).toBe(tz);
      expect(r.slot).toBe(r.expectSlot);
      expect(r.today).toContain(r.expectToday);
      expect(r.resetHourKst).toBe("19");
      expect(r.weekStartDay).toBe("Mon, 00");                 // 주 시작 = 한국 월요일 0시
      expect(r.isTodayNow).toBe(true);

      // 서버(한국 시간 주차 검사)가 앱이 만든 주차 키를 받아들이는지
      const voteErr = await db(page, async () => (await sb.from("votes").insert({ user_id: me, week: wkKey(), menu_id: "i4", v: 1 })).error?.message || null);
      expect(voteErr).toBeNull();

      // 먹음 체크 → 오늘(한국 날짜)로 저장 → 취소하면 지워짐
      await eat(page, "i8", "점심");
      await expect.poll(() => serverRows(page, "meals", { menu_id: "i8" }).then((x) => x.length)).toBe(1);
      await closeDialogs(page);
      await expect(page.locator("#slotbar")).toContainText("1/3");
      await openMenu(page, "i8");
      await page.locator('#detail [data-a="uneat"]').click();
      await expect.poll(() => serverRows(page, "meals", { menu_id: "i8" }).then((x) => x.length)).toBe(0);
    } finally { await cleanup(page).catch(() => {}); await ctx.close(); }
  });
}
