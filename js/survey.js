// 사용 평가 설문: 앱과 같은 익명 로그인으로 1인 1응답 (다시 내면 수정)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600); };
const sb = window.supabase.createClient(CFG.url, CFG.key);
let me = null;

// ── 문항 그리기 ──
const chip = (type, name, value, label = value) =>
  `<label class="chip-o"><input type="${type}" name="${name}" value="${esc(value)}"><span>${esc(label)}</span></label>`;
document.querySelectorAll(".q").forEach((q) => {
  const name = q.dataset.name, type = q.dataset.type === "many" ? "checkbox" : "radio";
  q.insertAdjacentHTML("beforeend", `<div class="opts" role="${type === "radio" ? "radiogroup" : "group"}" aria-label="${esc(q.querySelector("p")?.textContent || name)}">${SURVEY[name].map((v) => chip(type, name, v)).join("")}</div>`);
});
const scale = (name, label, n0, n1, req) => `<div class="lk"><p id="${name}-l">${label}${req ? ' <b aria-hidden="true">*</b>' : ""}</p>
  <div class="lk-row" role="radiogroup" aria-labelledby="${name}-l">${Array.from({ length: n1 - n0 + 1 }, (_, i) => n0 + i).map((v) =>
    `<label><input type="radio" name="${name}" value="${v}"><span>${v}</span></label>`).join("")}</div></div>`;
$("#sus").innerHTML = SURVEY.sus.map((t, i) => scale(`sus${i}`, `${i + 1}. ${t}`, 1, 5, true)).join("") +
  '<p class="lk-ends" aria-hidden="true"><span>1 전혀 아니다</span><span>5 매우 그렇다</span></p>';
$("#app").innerHTML = Object.entries(SURVEY.app).map(([k, t]) => scale(`app_${k}`, t, 1, 5)).join("");
$("#nps").innerHTML = scale("nps", "학식샷을 친구에게 추천할 의향", 0, 10, true) + '<p class="lk-ends" aria-hidden="true"><span>0 전혀 없음</span><span>10 꼭 추천</span></p>';

// ── 값 읽기·채우기 ──
const form = $("#sv");
const val = (n) => form.querySelector(`[name="${n}"]:checked`)?.value ?? null;
function collect() {
  const app = {};
  Object.keys(SURVEY.app).forEach((k) => { const v = val(`app_${k}`); if (v) app[k] = +v; });
  return {
    days: val("days"), freq: val("freq"), device: val("device"),
    used: [...form.querySelectorAll('[name="used"]:checked')].map((x) => x.value),
    sus: SURVEY.sus.map((_, i) => +val(`sus${i}`) || null),
    app, nps: val("nps") == null ? null : +val("nps"),
    good: form.good.value.trim(), bad: form.bad.value.trim(), wish: form.wish.value.trim(), v: 1,
  };
}
function fill(a) {
  const set = (n, v) => { const el = form.querySelector(`[name="${n}"][value="${CSS.escape(String(v))}"]`); if (el) el.checked = true; };
  ["days", "freq", "device"].forEach((k) => a[k] && set(k, a[k]));
  (a.used || []).forEach((v) => set("used", v));
  (a.sus || []).forEach((v, i) => v && set(`sus${i}`, v));
  Object.entries(a.app || {}).forEach(([k, v]) => set(`app_${k}`, v));
  if (a.nps != null) set("nps", a.nps);
  ["good", "bad", "wish"].forEach((k) => (form[k].value = a[k] || ""));
  progress();
}
function progress() {
  const a = collect(), need = a.sus.filter(Boolean).length + (a.nps != null ? 1 : 0);
  $("#prog").style.width = `${Math.round((need / 11) * 100)}%`;
  $("#submit").textContent = need === 11 ? "제출하기" : `제출하기 (필수 ${11 - need}개 남음)`;
}
form.addEventListener("change", progress);

// ── 제출 ──
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = collect(), err = $("#err");
  const miss = a.sus.map((v, i) => (v ? null : i + 1)).filter(Boolean);
  if (miss.length || a.nps == null) {
    err.textContent = miss.length ? `사용성 ${miss.join(", ")}번 문항을 골라 주세요.` : "추천 의향(0~10)을 골라 주세요.";
    err.hidden = false;
    (form.querySelector(miss.length ? `[name="sus${miss[0] - 1}"]` : '[name="nps"]'))?.closest(".lk")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  err.hidden = true;
  if (!me) { toast("로그인 중이에요. 잠시 후 다시 눌러 주세요"); return; }
  $("#submit").disabled = true;
  const { error } = await sb.from("survey_responses").upsert({ user_id: me, answers: a }, { onConflict: "user_id" });
  $("#submit").disabled = false;
  if (error) { console.error(error); toast("저장하지 못했어요. 다시 시도해 주세요"); return; }
  form.hidden = true; $(".sv-intro").hidden = true; $("#done").hidden = false; $("#bap-done").innerHTML = BAP("yum");
  $("#done-msg").textContent = `응답이 저장됐어요. 내 사용성 점수(SUS)는 ${susScore(a.sus)}점이에요.`;
  window.scrollTo(0, 0);
});
$("#edit").addEventListener("click", () => { form.hidden = false; $(".sv-intro").hidden = false; $("#done").hidden = true; });

// ── 로그인(앱과 같은 익명 계정) + 예전 응답 불러오기 ──
(async () => {
  progress();
  try {
    let { data: { session } } = await sb.auth.getSession();
    if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; session = r.data.session; }
    me = session.user.id;
    const { data } = await sb.from("survey_responses").select("answers").eq("user_id", me).maybeSingle();
    if (data?.answers) { fill(data.answers); toast("예전에 낸 답을 불러왔어요. 고쳐서 다시 제출할 수 있어요"); }
  } catch (e) { console.error(e); toast("서버에 연결하지 못했어요. 잠시 후 새로고침해 주세요"); }
})();
