// 학식샷 서버 연동: 프로토타입의 st(로컬 상태)를 Supabase 데이터로 채우고, 내 변경은 서버에 씁니다.
const sb = supabase.createClient(CFG.url, CFG.key);
let me = null, lastSig = "", pendingRender = false;
const Q = [], AGG = { votes: {} };
const pub = p => p ? sb.storage.from("photos").getPublicUrl(p).data.publicUrl : null;
const hy = ms => { clearTimeout(hy.t); hy.t = setTimeout(hydrate, ms) };

function track(p, quiet) {   // 쓰기 요청: 실패하면 서버 상태로 되돌림
  const x = Promise.resolve(p).then(r => { if (r && r.error) throw r.error })
    .catch(e => { console.error(e); if (!quiet) { toast("저장하지 못했어요. 다시 시도해 주세요"); lastSig = "" } });
  Q.push(x); x.finally(() => { Q.splice(Q.indexOf(x), 1); if (!quiet) hy(500) }); return x;
}
const API = {
  eat: (id, slot) => track(sb.from("meals").insert({ menu_id: id, slot })),
  uneat: id => track(sb.from("meals").delete().eq("user_id", me).eq("menu_id", id).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())),
  review: (id, r) => track(sb.from("reviews").upsert({ user_id: me, menu_id: id, stars: r.s, body: r.t, feedback: r.f }, { onConflict: "user_id,menu_id" })),
  vote: (k, v) => { const [week, id] = k.split("|"); return track(v ? sb.from("votes").upsert({ user_id: me, week, menu_id: id, v }, { onConflict: "user_id,week,menu_id" }) : sb.from("votes").delete().eq("user_id", me).eq("week", week).eq("menu_id", id)) },
  restock: id => track(sb.from("sold").delete().eq("menu_id", id)),
  rankHist: (week, ord) => track(sb.from("rank_hist").upsert({ week, ord }, { onConflict: "week", ignoreDuplicates: true }), true),
  wc: (theme, winner, log) => track(sb.from("wc_runs").insert({ theme, winner, log }))
};

// AI 사진 확인: 프로토타입의 aiCheckFood/aiCheckSold를 서버 함수 호출로 교체
async function callVerify(kind, file, m) {
  try {
    const image = await shrink(file);
    const { data, error } = await sb.functions.invoke("verify-photo", { body: { kind, menuId: m.id, menuName: m.name, cat: m.cat, n: m.n, image } });
    hy(800);
    return error || !data ? { ok: false, reason: "서버에 연결하지 못했어요" } : data;
  } catch (e) { return { ok: false, reason: "사진을 읽지 못했어요. 다른 사진을 골라 주세요" } }
}
aiCheckFood = async (file, m) => { const r = await callVerify("food", file, m); if (!r.ok) return { match: false, reason: r.reason }; return r.verified ? { match: true, reason: r.reason, portion: r.portion, nutrition: r.nutrition } : { skipped: true } };
aiCheckSold = async (file, m) => { const r = await callVerify("sold", file, m); return r.ok ? { ok: true, reason: r.reason } : { ok: false, reason: r.reason } };

async function hydrate() {
  await Promise.allSettled([...Q]);
  try {
    const now = Date.now(), t = x => new Date(x).getTime(), wks = [wkKey(), wkKey(now - 7 * DAY)];
    const res = await Promise.all([
      sb.from("reviews").select("user_id,menu_id,stars,body,feedback,verified,updated_at").order("updated_at", { ascending: false }).limit(3000),
      sb.from("photos").select("*"),
      sb.from("sold").select("*").gte("created_at", new Date(lastReset()).toISOString()),
      sb.from("meals").select("menu_id,slot,created_at").eq("user_id", me).order("created_at", { ascending: false }).limit(200),
      sb.rpc("weekly_sales"),
      sb.from("votes").select("user_id,week,menu_id,v").in("week", wks),
      sb.from("rank_hist").select("week,ord").in("week", wks),
      sb.from("wc_runs").select("theme,winner,log").order("id", { ascending: false }).limit(1500)]);
    res.forEach(r => { if (r.error) throw r.error });
    const [rv, ph, so, ml, ws, vt, rh, wr] = res.map(r => r.data || []);
    const sig = JSON.stringify([rv, ph, so, ml, ws, vt, rh, wr.length, wr[0]]);
    if (sig === lastSig) return; lastSig = sig;

    // 후기: 내 것은 st.mine, 다른 사람 것은 SEED_RV / RATE(내 것 제외 평균)
    st.mine = {}; Object.keys(SEED_RV).forEach(k => delete SEED_RV[k]); Object.keys(RATE).forEach(k => delete RATE[k]);
    const acc = {};
    rv.forEach(r => {
      const at = t(r.updated_at), f = r.feedback || {};
      if (r.user_id === me) { st.mine[r.menu_id] = { s: r.stars, t: r.body || "", f, at, verified: r.verified }; return }
      (SEED_RV[r.menu_id] = SEED_RV[r.menu_id] || []).push({ s: r.stars, t: r.body || "", f, who: "익명", d: (now - at) / DAY, v: r.verified });
      const a = acc[r.menu_id] = acc[r.menu_id] || { s: 0, n: 0, ws: 0, wn: 0 };
      a.s += r.stars; a.n++; if (now - at < 7 * DAY) { a.ws += r.stars; a.wn++ }
    });
    Object.entries(acc).forEach(([id, a]) => RATE[id] = { all: [a.s / a.n, a.n], wk: [a.wn ? a.ws / a.wn : 0, a.wn] });

    st.photos = {}; ph.forEach(r => st.photos[r.menu_id] = { src: pub(r.path), at: t(r.created_at), verified: r.verified, nutrition: r.nutrition, portion: r.portion });
    st.sold = {}; so.forEach(r => st.sold[r.menu_id] = { at: t(r.created_at), who: r.reported_by === me ? "나" : "익명", verified: r.verified, proof: pub(r.proof_path), reason: r.reason || "" });
    st.meals = ml.map(r => ({ id: r.menu_id, slot: r.slot, at: t(r.created_at) }));
    Object.keys(SALES).forEach(k => delete SALES[k]);
    ws.forEach(r => SALES[r.menu_id] = Number(r.n) - st.meals.filter(x => x.id === r.menu_id && now - x.at < 7 * DAY).length);

    st.votes = {}; AGG.votes = {};
    vt.forEach(r => { const k = r.week + "|" + r.menu_id; if (r.user_id === me) st.votes[k] = r.v; else { const a = AGG.votes[k] = AGG.votes[k] || { up: 0, down: 0 }; r.v === 1 ? a.up++ : a.down++ } });
    st.rankHist = {}; rh.forEach(r => st.rankHist[r.week] = r.ord);

    st.wc.byTheme = {}; st.wc.history = [];
    wr.forEach(r => {
      const S = wcStats(r.theme);
      (r.log || []).forEach(([a, b]) => { S[a] = S[a] || { w: 0, l: 0, champ: 0 }; S[b] = S[b] || { w: 0, l: 0, champ: 0 }; S[a].w++; S[b].l++ });
      S[r.winner] = S[r.winner] || { w: 0, l: 0, champ: 0 }; S[r.winner].champ++;
    });
    if (document.activeElement && document.activeElement.tagName === "TEXTAREA") { pendingRender = true; return }  // 입력 중엔 화면을 건드리지 않음
    render();
  } catch (e) { console.error(e); lastSig = ""; if (!hydrate.warned) { hydrate.warned = true; toast("서버에서 데이터를 불러오지 못했어요") } }
}

(async () => {
  if (CFG.url.includes("YOUR-")) { toast("config.js에 Supabase 주소와 키를 넣어 주세요"); return }
  let { data: { session } } = await sb.auth.getSession();
  if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) { toast("서버에 연결하지 못했어요"); return } session = r.data.session }
  me = session.user.id; await hydrate(); loadAcct();
  sb.channel("live").on("postgres_changes", { event: "*", schema: "public" }, () => hy(500)).subscribe();
  setInterval(() => hy(0), 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hy(0) });
  document.addEventListener("focusout", () => { if (pendingRender) { pendingRender = false; setTimeout(render, 0) } });
})();

// ── 복구 코드 UI (내 입맛 탭 맨 아래) ──
document.getElementById("view-taste").insertAdjacentHTML("beforeend", '<div id="acct"></div>');
const acct = { made: null, code: null, restoring: false };
const BOX = "background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px";
const INP = "font:inherit;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);text-transform:uppercase";
function renderAcct() {
  $("#acct").innerHTML = `<h2>기록 보관</h2><div style="${BOX}">
    <span class="hint">폰을 바꾸거나 브라우저 데이터를 지워도, 복구 코드가 있으면 내 기록(먹음 체크·평가·투표)을 되찾을 수 있어요. 가입은 필요 없어요.</span>
    ${acct.code
      ? `<div style="font:700 22px/1.2 ui-monospace,monospace;text-align:center;padding:10px 0;user-select:all">${acct.code}</div>
         <span class="hint" style="color:var(--sold)">이 코드는 다시 볼 수 없어요. 지금 캡처하거나 메모해 두세요. 코드를 아는 사람은 누구나 내 기록을 가져갈 수 있어요.</span>
         <button class="btn" data-acct="copy">코드 복사</button>`
      : `<button class="btn primary" data-acct="make">${acct.made ? "복구 코드 다시 만들기" : "복구 코드 만들기"}</button>
         ${acct.made ? '<span class="hint">이미 만든 코드가 있어요. 다시 만들면 이전 코드는 쓸 수 없어요.</span>' : ""}`}
    ${acct.restoring
      ? `<input id="acct-in" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" style="${INP}"><button class="btn primary" data-acct="restore">입장하기</button>`
      : `<button class="btn" data-acct="open">복구 코드로 입장</button>`}
  </div>`;
}
async function loadAcct() { const { data } = await sb.rpc("recovery_created_at"); acct.made = data || null; renderAcct() }
document.getElementById("acct").addEventListener("click", async e => {
  const b = e.target.closest("[data-acct]"); if (!b) return; const a = b.dataset.acct;
  if (a === "open") { acct.restoring = true; renderAcct(); return }
  if (a === "copy") { try { await navigator.clipboard.writeText(acct.code); toast("복사했어요") } catch (_) { toast("코드를 길게 눌러 직접 복사해 주세요") } return }
  if (a === "make") {
    if (acct.made && !confirm("다시 만들면 이전 코드는 쓸 수 없어요. 계속할까요?")) return;
    const { data, error } = await sb.rpc("create_recovery_code");
    if (error || !data) { toast("코드를 만들지 못했어요. 다시 시도해 주세요"); return }
    acct.code = data; acct.made = new Date().toISOString(); renderAcct(); return;
  }
  if (a === "restore") {
    const code = $("#acct-in").value.trim();
    if (code.replace(/[^0-9a-f]/gi, "").length !== 16) { toast("코드 16자리를 확인해 주세요"); return }
    if ((st.meals.length || Object.keys(st.mine).length) && !confirm("이 기기의 현재 기록은 복구 코드의 기록으로 바뀌어요. 계속할까요?")) return;
    const { data, error } = await sb.rpc("restore_account", { p_code: code });
    if (error) { toast("복구하지 못했어요. 다시 시도해 주세요"); return }
    if (!data) { toast("코드가 맞지 않아요"); return }
    acct.restoring = false; acct.code = null; lastSig = ""; await hydrate(); await loadAcct(); toast("기록을 복구했어요");
  }
});
renderAcct();
