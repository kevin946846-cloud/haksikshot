// 사진/품절 제보 검증: 규칙 확인 → AI 판정 → 저장. 보는 사람의 계정과 무관하게 서버가 처리.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const J = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });
const num = (v: unknown, max = 3000) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

async function ask(prompt: string, b64: string) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  // 빠른 모델(gemini-3.6-flash, 실측 1.7~2.6초)을 먼저, 실패하면 GEMINI_MODEL(3.8, 과부하·9초 이상 잦음)로.
  // 전체 19초 안에 끝냄(화면은 25초에 풀림), 다 실패하면 '미확인'. 순서는 GEMINI_PRIMARY_MODEL secret으로 바꿀 수 있음
  const models = [...new Set([Deno.env.get("GEMINI_PRIMARY_MODEL") ?? "gemini-3.6-flash", Deno.env.get("GEMINI_MODEL"), Deno.env.get("GEMINI_FALLBACK_MODEL")].filter(Boolean))] as string[];
  const deadline = Date.now() + 19_000;
  for (let attempt = 1; attempt <= models.length; attempt++) {
    const model = models[attempt - 1], left = deadline - Date.now();
    if (left < 4_000) break;
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(attempt < models.length ? Math.min(left, 9_000) : left),
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: b64 } }] }],
          // 사진 한 장 판정은 깊은 추론이 필요 없음 → thinkingLevel low로 응답 시간 단축
          generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
        }),
      });
      if (r.ok) {
        const out = JSON.parse((await r.json()).candidates[0].content.parts[0].text);
        console.log("gemini ok", model, Date.now() - t0, "ms");
        return out;
      }
      console.error("gemini", model, r.status, Date.now() - t0, "ms", (await r.text()).slice(0, 200));
      if (![404, 429, 500, 503].includes(r.status)) return null;   // 그 외(키 오류 등)는 다른 모델도 같으므로 중단
    } catch (e) { console.error("gemini", model, String(e), Date.now() - t0, "ms"); }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const authed = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return J({ ok: false, reason: "로그인 정보가 없어요. 새로고침해 주세요" });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { kind, menuId, menuName, cat, n, image } = await req.json().catch(() => ({}));
  if (!["food", "sold"].includes(kind) || !/^[iyb]\d{1,2}$/.test(menuId ?? "") || typeof image !== "string" || image.length > 600_000)
    return J({ ok: false, reason: "잘못된 요청이에요" });
  const name = String(menuName ?? "").slice(0, 30), b64 = image.replace(/^data:image\/jpeg;base64,/, "");
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // KST 날짜

  if (kind === "food") {
    const ate = await admin.from("meals").select("menu_id").eq("user_id", user.id).eq("menu_id", menuId).eq("day", today);
    if (!ate.data?.length) return J({ ok: false, reason: "오늘 먹음 체크한 메뉴만 사진을 올릴 수 있어요" });
    const recent = await admin.from("photos").select("menu_id").eq("menu_id", menuId).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
    if (recent.data?.length) return J({ ok: false, reason: "최근 7일 안에 올라온 사진이 있어요" });
  }

  const prompt = kind === "food"
    ? `학식 메뉴 사진 검증 작업이야. 메뉴 이름: "${name}" (분류: ${cat}). 1) 사진이 이 메뉴의 실제 음식 사진인지 판단해. 음식이 아니거나, 누가 봐도 다른 메뉴거나, 부적절한 사진이면 match=false. 같은 계열의 음식이면 match=true. 2) match=true면 사진에 보이는 1인분 양을 기준으로 영양성분을 추정해. 메뉴 이름 기준 기본 추정치는 ${num(n?.kcal)}kcal, 단백질 ${num(n?.protein)}g, 탄수화물 ${num(n?.carbs)}g, 당 ${num(n?.sugar)}g 이야. JSON만 답해: {"match":true,"reason":"한국어 한 문장","portion":"적음|보통|많음","nutrition":{"kcal":0,"protein":0,"carbs":0,"sugar":0}}`
    : `학식 품절 제보 검증 작업이야. 사진이 식당 키오스크나 메뉴판이고, 그 안에 "${name}" 메뉴가 품절로 표시되어 있는지 판단해. 메뉴 이름과 품절 표시가 함께 보이면 ok=true, 다른 메뉴만 품절이거나 판단할 수 없으면 ok=false. JSON만 답해: {"ok":true,"reason":"한국어 한 문장"}`;
  const ai = await ask(prompt, b64);

  if (kind === "sold" && !ai) return J({ ok: false, reason: "지금은 AI 확인이 어려워 품절 제보를 받을 수 없어요" });
  if (kind === "sold" && ai.ok !== true) return J({ ok: false, reason: ai.reason || "키오스크에서 이 메뉴의 품절 표시가 보이게 찍어 주세요" });
  if (kind === "food" && ai && ai.match !== true) return J({ ok: false, reason: ai.reason || `${name} 사진이 아닌 것 같아요` });

  const path = `${kind}/${menuId}-${Date.now()}.jpg`;
  const up = await admin.storage.from("photos").upload(path, Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { contentType: "image/jpeg" });
  if (up.error) return J({ ok: false, reason: "사진을 저장하지 못했어요" });
  const now = new Date().toISOString();

  if (kind === "sold") {
    await admin.from("sold").upsert({ menu_id: menuId, reported_by: user.id, created_at: now, verified: true, proof_path: path, reason: ai.reason ?? "" }, { onConflict: "menu_id" });
    return J({ ok: true, verified: true, reason: ai.reason });
  }
  const nut = ai?.nutrition && typeof ai.nutrition.kcal === "number"
    ? { kcal: num(ai.nutrition.kcal), protein: num(ai.nutrition.protein, 300), carbs: num(ai.nutrition.carbs, 500), sugar: num(ai.nutrition.sugar, 300) } : null;
  const portion = ["적음", "보통", "많음"].includes(ai?.portion) ? ai.portion : null;
  await admin.from("photos").upsert({ menu_id: menuId, path, uploaded_by: user.id, created_at: now, verified: !!ai, nutrition: nut, portion }, { onConflict: "menu_id" });
  return J({ ok: true, verified: !!ai, reason: ai?.reason, portion, nutrition: nut });
});
