// 학식샷 서버 연동: 프로토타입의 st(로컬 상태)를 Supabase 데이터로 채우고, 내 변경은 서버에 씁니다.
const sb = supabase.createClient(CFG.url, CFG.key);
let me = null, lastSig = "", pendingRender = false;
const Q = [], AGG = { votes: {} };
const pub = p => p ? sb.storage.from("photos").getPublicUrl(p).data.publicUrl : null;
const hy = ms => { clearTimeout(hy.t); hy.t = setTimeout(hydrate, ms) };

function track(p, quiet) {  // 쓰기 요청: 실패하면 서버 상태로 되돌림
  const x = Promise.resolve(p).then(r => { if (r && r.error) throw r.error })
    .catch(e => { console.error(e); if (!quiet) { toast("저장하지 못했어요. 다시 시도해 주세요"); lastSig = "" } });
  Q.push(x); x.finally(() => { Q.splice(Q.indexOf(x), 1); if (!quiet) hy(500) }); return x;
}

const API = {
  eat: (id, slot) => {
    if (!me) { toast("로그인 세션을 불러오는 중이에요. 잠시 후 다시 시도해 주세요."); return Promise.resolve(); }
    return track(sb.from("meals").insert({ user_id: me, menu_id: id, slot }));
  },
  uneat: id => {
    // 오늘(한국 날짜) 기록만 지움
    if (!me) { toast("로그인 세션을 불러오는 중이에요. 잠시 후 다시 시도해 주세요."); return Promise.resolve(); }
    return track(sb.from("meals").delete().eq("user_id", me).eq("menu_id", id).eq("day", new Date(kDay0() + KST).toISOString().slice(0, 10)));
  },
  review: (id, r) => {
    if (!me) { toast("로그인 세션을 불러오는 중이에요. 잠시 후 다시 시도해 주세요."); return Promise.resolve(); }
    return track(sb.from("reviews").upsert({ user_id: me, menu_id: id, stars: r.s, body: r.t, feedback: r.f }, { onConflict: "user_id,menu_id" }));
  },
  vote: (k, v) => {
    if (!me) { toast("로그인 세션을 불러오는 중이에요. 잠시 후 다시 시도해 주세요."); return Promise.resolve(); }
    const [week, id] = k.split("|"); 
    return track(v ? sb.from("votes").upsert({ user_id: me, week, menu_id: id, v }, { onConflict: "user_id,week,menu_id" }) : sb.from("votes").delete().eq("user_id", me).eq("week", week).eq("menu_id", id));
  },
  restock: id => track(sb.from("sold").delete().eq("menu_id", id)),
  rankHist: (week, ord) => track(sb.from("rank_hist").upsert({ week, ord }, { onConflict: "week", ignoreDuplicates: true }), true),
  wc: (theme, winner, log) => track(sb.from("wc_runs").insert({ theme, winner, log }))
};

// AI 사진 확인: 프로토타입의 aiCheckFood/aiCheckSold를 서버 함수 호출로 교체
async function callVerify(kind, file, m) {
  try {
    const image = await shrink(file);
    const call = sb.functions.invoke("verify-photo", { body: { kind, menuId: m.id, menuName: m.name, cat: m.cat, n: m.n, image } });
    const late = new Promise(r => setTimeout(() => r("timeout"), 25000));   // 서버가 오래 걸려도 화면은 25초 뒤 풀어 줌
    const res = await Promise.race([call, late]);
    if (res === "timeout") { hy(5000); return { ok: false, reason: "확인이 오래 걸리고 있어요. 잠시 뒤 새로고침하면 결과가 반영돼요" } }
    const { data, error } = res;
    hy(800);
    return error || !data ? { ok: false, reason: "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요" } : data;
  } catch (e) { return { ok: false, reason: "사진을 읽지 못했어요. 다른 사진을 골라 주세요" } }
}
aiCheckFood = async (file, m) => { const r = await callVerify("food", file, m); if (!r.ok) return { match: false, reason: r.reason }; return r.verified ? { match: true, reason: r.reason, portion: r.portion, nutrition: r.nutrition } : { skipped: true } };
aiCheckSold = async (file, m) => { const r = await callVerify("sold", file, m); return r.ok ? { ok: true, reason: r.reason } : { ok: false, reason: r.reason } };

async function hydrate() {
  await Promise.allSettled([...Q]);
  try {
    const now = Date.now(), t = x => new Date(x).getTime(), wks = [wkKey(), wkKey(now - 7 * DAY)];
    // 평균·개수·승패는 DB 집계 함수로 계산해서 메뉴별 결과만 받음 (예전: 후기 3,000개·월드컵 1,500판을 통째로)
    const res = await Promise.all([
      sb.from("reviews").select("menu_id,stars,body,feedback,verified,updated_at").eq("user_id", me),   // 내 후기
      sb.rpc("menu_rating"),                       // 남들 별점: 메뉴별 평균·개수
      sb.rpc("recent_reviews", { p_per: 20 }),     // 남들 후기 글: 메뉴별 최근 20개
      sb.from("photos").select("*"),
      sb.from("sold").select("*").gte("created_at", new Date(lastReset()).toISOString()),
      sb.from("meals").select("menu_id,slot,created_at").eq("user_id", me).order("created_at", { ascending: false }).limit(200),
      sb.rpc("weekly_sales"),
      sb.from("votes").select("week,menu_id,v").eq("user_id", me).in("week", wks),   // 내 투표
      sb.rpc("vote_counts", { p_weeks: wks }),     // 남들 투표: 주차·메뉴별 추천/비추천 수
      sb.from("rank_hist").select("week,ord").in("week", wks),
      sb.rpc("wc_stats")]);                        // 월드컵: 테마·메뉴별 승/패/우승 수
    res.forEach(r => { if (r.error) throw r.error });
    const data = res.map(r => r.data || []);
    const sig = JSON.stringify(data);
    if (sig === lastSig) return; lastSig = sig;
    saveSnap(data);
    applySnap(data);
  } catch (e) { console.error(e); lastSig = ""; if (!hydrate.warned) { hydrate.warned = true; toast("서버에서 데이터를 불러오지 못했어요") } }
}

// ── 캐시: 마지막으로 받은 서버 데이터를 기기에 저장 → 다음에 열 때 네트워크를 기다리지 않고 바로 그림 ──
const SNAP = "haksikshot-snap-v2";   // v2: 집계 결과 형식
function saveSnap(data) { try { localStorage.removeItem("haksikshot-snap-v1"); localStorage.setItem(SNAP, JSON.stringify({ me, at: Date.now(), data })) } catch (_) { } }
function loadSnap() {
  try {
    const s = JSON.parse(localStorage.getItem(SNAP) || "null");
    if (s && s.me === me && Date.now() - s.at < 7 * DAY) { applySnap(s.data); return true }
  } catch (_) { }
  return false;
}

function applySnap([my, rt, rc, ph, so, ml, ws, mv, vc, rh, wcs]) {
  try {
    const now = Date.now(), t = x => new Date(x).getTime();

    st.mine = {}; Object.keys(SEED_RV).forEach(k => delete SEED_RV[k]); Object.keys(RATE).forEach(k => delete RATE[k]);
    my.forEach(r => st.mine[r.menu_id] = { s: r.stars, t: r.body || "", f: r.feedback || {}, at: t(r.updated_at), verified: r.verified });
    rc.forEach(r => (SEED_RV[r.menu_id] = SEED_RV[r.menu_id] || []).push({ s: r.stars, t: r.body || "", f: r.feedback || {}, who: "익명", d: (now - t(r.updated_at)) / DAY, v: r.verified }));
    rt.forEach(r => RATE[r.menu_id] = { all: [Number(r.avg_all), r.n_all], wk: [Number(r.avg_wk), r.n_wk] });

    st.photos = {}; ph.forEach(r => st.photos[r.menu_id] = { src: pub(r.path), at: t(r.created_at), verified: r.verified, nutrition: r.nutrition, portion: r.portion });
    st.sold = {}; so.forEach(r => st.sold[r.menu_id] = { at: t(r.created_at), who: r.reported_by === me ? "나" : "익명", verified: r.verified, proof: pub(r.proof_path), reason: r.reason || "" });
    st.meals = ml.map(r => ({ id: r.menu_id, slot: r.slot, at: t(r.created_at) }));
    Object.keys(SALES).forEach(k => delete SALES[k]);
    ws.forEach(r => SALES[r.menu_id] = Number(r.n) - st.meals.filter(x => x.id === r.menu_id && now - x.at < 7 * DAY).length);

    st.votes = {}; AGG.votes = {};
    mv.forEach(r => st.votes[r.week + "|" + r.menu_id] = r.v);
    vc.forEach(r => AGG.votes[r.week + "|" + r.menu_id] = { up: r.up, down: r.down });
    st.rankHist = {}; rh.forEach(r => st.rankHist[r.week] = r.ord);

    st.wc.byTheme = {}; st.wc.history = [];
    wcs.forEach(r => wcStats(r.theme)[r.menu_id] = { w: r.w, l: r.l, champ: r.champ });
    if (document.activeElement && document.activeElement.tagName === "TEXTAREA") { pendingRender = true; return }
    render();
  } catch (e) { console.error(e); lastSig = ""; if (!hydrate.warned) { hydrate.warned = true; toast("서버에서 데이터를 불러오지 못했어요") } }
}

(async () => {
  if (CFG.url.includes("YOUR-")) { toast("config.js에 Supabase 주소와 키를 넣어 주세요"); return }
  let { data: { session } } = await sb.auth.getSession();
  if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) { toast("서버에 연결하지 못했어요"); return } session = r.data.session }
  me = session.user.id; loadSnap(); await hydrate(); loadAcct();
  sb.channel("live").on("postgres_changes", { event: "*", schema: "public" }, () => hy(500)).subscribe();
  setInterval(() => { if (!document.hidden) hy(0) }, 30000);   // 탭이 안 보일 때는 다시 받지 않음
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hy(0) });
  document.addEventListener("focusout", () => { if (pendingRender) { pendingRender = false; setTimeout(render, 0) } });
})();

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
