// 사용 평가 결과: DB 함수 survey_summary()가 집계한 숫자만 받아서 그림 (응답자 id는 오지 않음)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sb = window.supabase.createClient(CFG.url, CFG.key);
const bars = (el, rows, max, fmt = (v) => v) => {
  $(el).innerHTML = rows.length ? rows.map(([k, v]) =>
    `<li><span>${esc(k)}</span><span class="bar" role="img" aria-label="${esc(k)} ${fmt(v)}"><i style="width:${max ? Math.round((v / max) * 100) : 0}%"></i></span><em>${fmt(v)}</em></li>`).join("")
    : '<li class="rs-empty">아직 응답이 없어요</li>';
};
const dayStr = (t) => new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

async function load() {
  const { data: s, error } = await sb.rpc("survey_summary");
  if (error) { $("#period").textContent = "결과를 불러오지 못했어요"; console.error(error); return; }
  $("#k-n").textContent = s.n;
  $("#k-active").textContent = s.n ? `${s.active}명` : "–";
  $("#k-sus").textContent = s.sus_avg ?? "–";
  if (s.sus_avg != null) $("#k-sus-l").textContent = `사용성 점수 SUS · ${susGrade(+s.sus_avg)}`;
  $("#k-nps").textContent = s.nps.score ?? "–";
  if (s.n) $("#k-nps-l").textContent = `추천 지수 NPS · 추천 ${s.nps.promoters} / 중립 ${s.nps.passives} / 비추천 ${s.nps.detractors}`;
  $("#period").textContent = s.n ? `${dayStr(s.first_at)} ~ ${dayStr(s.last_at)} · ${s.n}명 응답` : "아직 응답이 없어요. 설문 링크를 공유해 주세요.";
  if (!s.n) $("#period").insertAdjacentHTML("afterbegin", BAP("sad", "bap bap-e"));

  const buckets = [["0~50 개선 필요", 0, 51], ["51~67 보통 이하", 51, 68], ["68~71 평균 이상", 68, 72], ["72~84 좋음", 72, 85], ["85~100 매우 좋음", 85, 101]];
  const dist = buckets.map(([k, a, b]) => [k, s.sus_list.filter((x) => x >= a && x < b).length]);
  bars("#sus-dist", s.n ? dist : [], Math.max(1, ...dist.map((d) => d[1])), (v) => `${v}명`);
  bars("#app", Object.entries(SURVEY.app).filter(([k]) => s.app[k] != null).map(([k, t]) => [t, +s.app[k]]), 5, (v) => v.toFixed(1));
  bars("#used", Object.entries(s.used), s.n, (v) => `${v}명`);
  for (const k of ["days", "freq", "device"]) {
    const c = s.counts[k] || {};
    bars(`#${k}`, SURVEY[k].filter((o) => c[o]).map((o) => [o, c[o]]), s.n, (v) => `${v}명`);
  }
  for (const k of ["good", "bad", "wish"]) {
    const list = s.texts[k] || [];
    $(`#t-${k}`).innerHTML = list.length ? list.map((t) => `<li>${esc(t)}</li>`).join("") : '<li class="rs-empty">아직 없어요</li>';
  }
}
load();
setInterval(() => { if (!document.hidden) load(); }, 30000);   // 열어 두면 30초마다 새 응답 반영
