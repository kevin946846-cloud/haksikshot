// 학식샷 E2E 테스트 설정
// - BASE_URL: 테스트할 주소 (CI에서는 도커로 띄운 http://localhost:8080)
// - 운영 Supabase를 그대로 쓰므로 한 번에 하나씩(workers 1) 실행하고, 각 테스트는 자기가 만든 기록을 지운다
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    ...devices["Pixel 7"],          // 휴대폰 화면 기준 (학생들이 폰으로 씀)
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",       // 끼니·19시 초기화·주 시작이 한국 시간 기준
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
