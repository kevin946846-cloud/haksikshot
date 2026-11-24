// 사용 평가 설문: 화면에서 답하고 제출 → DB 저장 → 결과 화면 집계에 반영, 다시 내면 수정(1인 1응답)
const { test, expect } = require("@playwright/test");
const { db, cleanup } = require("../helpers");

const pick = (page, name, value) => page.locator(`[name="${name}"][value="${value}"]`).check({ force: true });

test("설문 제출 → 결과 집계 반영, 다시 내면 1명 그대로 수정", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await expect(page.locator("#survey-link")).toHaveAttribute("href", "survey.html");   // 앱에서 설문으로 가는 길
  await page.locator("#survey-link").click();
  await expect(page).toHaveURL(/survey\.html$/);
  await page.waitForFunction(() => typeof me !== "undefined" && !!me, null, { timeout: 30_000 });
  const before = await db(page, async () => (await sb.rpc("survey_summary")).data.n);

  // 필수 문항을 빼고 내면 막힘
  await page.locator("#submit").click();
  await expect(page.locator("#err")).toContainText("사용성 1, 2, 3");

  await pick(page, "days", "2~3일"); await pick(page, "freq", "주 3~4회"); await pick(page, "device", "안드로이드");
  await pick(page, "used", "메뉴판 보기"); await pick(page, "used", "먹음 체크");
  for (let i = 0; i < 10; i++) await pick(page, `sus${i}`, i % 2 === 0 ? "4" : "2");   // SUS 75점이 나오는 답
  await pick(page, "app_help", "5"); await pick(page, "nps", "9");
  await page.locator('textarea[name="good"]').fill("E2E 설문 테스트: 아이콘이 좋아요 <b>굵게</b>");
  await page.locator("#submit").click();
  await expect(page.locator("#done-msg")).toContainText("75점");

  const row = await db(page, async () => (await sb.from("survey_responses").select("answers").eq("user_id", me).single()).data.answers);
  expect(row).toMatchObject({ days: "2~3일", used: ["메뉴판 보기", "먹음 체크"], nps: 9, app: { help: 5 } });

  // 다시 들어와서 고쳐 내기 → 예전 답이 채워져 있고, 응답 수는 그대로
  await page.reload();
  await expect(page.locator('[name="nps"][value="9"]')).toBeChecked();
  await pick(page, "nps", "6");
  await page.locator("#submit").click();
  await expect(page.locator("#done")).toBeVisible();
  const after = await db(page, async () => (await sb.rpc("survey_summary")).data);
  expect(after.n).toBe(before + 1);
  expect(after.texts.good).toContain("E2E 설문 테스트: 아이콘이 좋아요 <b>굵게</b>");

  // 다른 사람 응답은 읽거나 대신 쓸 수 없음
  const sec = await db(page, async () => ({
    others: (await sb.from("survey_responses").select("user_id").neq("user_id", me)).data.length,
    forge: (await sb.from("survey_responses").insert({ user_id: "00000000-0000-0000-0000-000000000000", answers: { sus: [3,3,3,3,3,3,3,3,3,3], nps: 5 } })).error?.code,
    bad: (await sb.from("survey_responses").upsert({ user_id: me, answers: { sus: [9,3,3,3,3,3,3,3,3,3], nps: 5 } }, { onConflict: "user_id" })).error?.code,
  }));
  expect(sec).toEqual({ others: 0, forge: "42501", bad: "23514" });
  // 결과 화면: 숫자가 보이고, 주관식 HTML은 글자로만
  await page.getByRole("link", { name: "결과 보기" }).click();
  await expect(page.locator("#k-n")).toHaveText(String(after.n));
  await expect(page.locator("#t-good")).toContainText("<b>굵게</b>");
  await expect(page.locator("#t-good b")).toHaveCount(0);

  await page.goBack();                                     // 설문 화면(로그인 정보 있음)으로 돌아가 정리
  await page.waitForFunction(() => typeof me !== "undefined" && !!me);
  await cleanup(page);
});
