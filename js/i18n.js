// 다국어: 한국어·English·中文·Tiếng Việt·日本語 (학교에 외국인 유학생이 많아서)
// - 코드 안에서는 L("한국어","English")로 두 언어를 바로 옆에 둠 (빠진 곳이 한눈에 보이게)
// - 중국어·베트남어·일본어는 영어 문구를 열쇠로 js/i18n-more.js 사전에서 찾음.
//   숫자·이름이 들어가는 문구는 사전에 {0},{1} 자리로 적어 두고, 실제 문구와 맞춰 끼워 넣음 (어순이 달라도 됨)
// - HTML의 고정 문구는 data-en 속성(영어)으로 같은 사전을 씀
// - DB에 저장하는 값(분류·끼니·태그·평가 선택지)은 한국어 그대로 두고 화면에 보일 때만 바꿈 → 언어가 달라도 기록이 한곳에 모임
const LANG_KEY="haksikshot-lang";
const LANGS={ko:"한국어",en:"English",zh:"中文",vi:"Tiếng Việt",ja:"日本語"};
const HTML_LANG={ko:"ko",en:"en",zh:"zh-CN",vi:"vi",ja:"ja"};
const LOCALE={ko:"ko-KR",en:"en-US",zh:"zh-CN",vi:"vi-VN",ja:"ja-JP"};
let LANG=(()=>{try{const s=localStorage.getItem(LANG_KEY);if(LANGS[s])return s}catch(e){}
  const n=(navigator.language||"ko").toLowerCase().slice(0,2);   // 처음 오면 기기 언어를 따름
  return LANGS[n]?n:"en"})();

// 영어 → 현재 언어 (사전에 없으면 영어 그대로)
const DICT={};            // {zh:{en:zh}, ...} — i18n-more.js가 채움
const PAT={};             // {} 자리가 있는 문구를 정규식으로 바꿔 둔 캐시
function tx(en){
  if(LANG==="en"||LANG==="ko"||typeof en!=="string")return en;   // 숫자 등은 그대로
  const d=DICT[LANG];if(!d)return en;
  if(d[en]!==undefined)return d[en];
  const pats=PAT[LANG]||(PAT[LANG]=Object.keys(d).filter(k=>/\{\d\}/.test(k)).map(k=>{
    const order=[];const re=new RegExp("^"+k.replace(/[.*+?^$()|[\]\\]/g,"\\$&").replace(/\{(\d)\}/g,(_,i)=>{order.push(+i);return "([\\s\\S]*?)"})+"$");
    return {re,order,to:d[k]}}));
  for(const p of pats){const m=en.match(p.re);if(m){const a=[];p.order.forEach((i,j)=>a[i]=tx(m[j+1]));return p.to.replace(/\{(\d)\}/g,(_,i)=>a[i]??"")}}
  return en;
}
const L=(ko,en)=>LANG==="ko"?ko:LANG==="en"?en:tx(en);
const EN={
  // 분류·끼니
  "일품":"Korean","양식":"Western","분식":"Snacks",
  "아침":"Breakfast","점심":"Lunch","저녁":"Dinner",
  // 맛 태그
  "밥":"rice","국물":"soup","고기":"meat","면":"noodles","매콤":"spicy","단짠":"sweet&salty","해산물":"seafood","채소":"veggie","튀김":"fried","치즈":"cheese",
  // 평가 항목·선택지
  "양":"Portion","적음":"Small","보통":"Normal","많음":"Large",
  "간":"Saltiness","싱거움":"Bland","딱 좋음":"Just right","짬":"Salty",
  "맵기":"Spiciness","순함":"Mild","적당":"Medium","매움":"Hot",
  "냄새":"Smell","괜찮음":"Fine","느끼함":"Greasy","기름 냄새":"Oily smell","고기 잡내":"Gamey",
  "또 먹을래?":"Again?","또 먹을래요":"Would eat again","글쎄요":"Not sure","다신 안 먹어요":"Never again",
  // 목표
  "다이어트":"Diet","벌크업":"Bulk up","가성비":"Best value",
  // 사람
  "나":"Me","익명":"Anonymous"
};
const tr=s=>LANG==="ko"||!EN[s]?s:L(s,EN[s]);        // 저장된 한국어 값 → 화면 표시
const info=m=>MENU_INFO[m.id]||null;
const mi18n=m=>typeof MENU_I18N!=="undefined"&&MENU_I18N[LANG]&&MENU_I18N[LANG][m.id];
// 메뉴 이름·소개: 한국어 외에는 그 언어로 (없으면 영어)
const mname=m=>{const i=info(m);if(LANG==="ko"||!i)return m.name;const t=mi18n(m);return t?t[0]:i.en};
const mdesc=m=>{const i=info(m);if(!i)return "";if(LANG==="ko")return i.ko;const t=mi18n(m);return t?t[1]:i.d};
// 다른 언어 화면에서도 키오스크에서 찾을 수 있게 한국어 이름을 작게 같이 보여 줌
const mnameHtml=m=>LANG!=="ko"&&info(m)?`${esc(mname(m))}<span class="kname" lang="ko">${esc(m.name)}</span>`:esc(m.name);
const WD={ko:"일월화수목금토",en:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],zh:"日一二三四五六",ja:"日月火水木金土",vi:["CN","T2","T3","T4","T5","T6","T7"]};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const VI_WD=["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
// 날짜 (한국 시간 기준 k = {mo,d,w})
const fmtDate=k=>({ko:`${k.mo}월 ${k.d}일 (${WD.ko[k.w]})`,en:`${WD.en[k.w]}, ${MON[k.mo-1]} ${k.d}`,zh:`${k.mo}月${k.d}日 周${WD.zh[k.w]}`,ja:`${k.mo}月${k.d}日(${WD.ja[k.w]})`,vi:`${VI_WD[k.w]}, ${k.d}/${k.mo}`})[LANG];

function applyStatic(root=document){
  document.documentElement.lang=HTML_LANG[LANG];
  root.querySelectorAll("[data-en]").forEach(el=>{
    if(el.dataset.ko===undefined)el.dataset.ko=el.innerHTML;
    el.innerHTML=LANG==="ko"?el.dataset.ko:LANG==="en"?el.dataset.en:tx(el.dataset.en);
  });
  root.querySelectorAll("[data-en-label]").forEach(el=>{
    if(el.dataset.koLabel===undefined)el.dataset.koLabel=el.getAttribute("aria-label")||"";
    el.setAttribute("aria-label",L(el.dataset.koLabel,el.dataset.enLabel));
  });
  root.querySelectorAll("[data-langsel]").forEach(s=>{s.value=LANG});
}
function setLang(l){
  if(!LANGS[l]||l===LANG)return;
  LANG=l;try{localStorage.setItem(LANG_KEY,l)}catch(e){}
  applyStatic();
  if(typeof onLang==="function")onLang();   // 화면마다 다시 그리기 (events.js·sync.js에서 연결)
}
