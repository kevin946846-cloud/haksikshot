// 한국어·영어 전환: 학교에 외국인 유학생이 많아 영어로도 쓸 수 있게
// - 문구는 코드 안에서 L("한국어","English")로 바로 옆에 둠 (번역이 빠지거나 어긋난 곳이 한눈에 보이게)
// - HTML의 고정 문구는 data-en 속성에 영어를 적고 applyStatic()이 바꿈
// - DB에 저장하는 값(분류·끼니·태그·평가 선택지)은 한국어 그대로 두고 화면에 보일 때만 바꿈
const LANG_KEY="haksikshot-lang";
let LANG=(()=>{try{const s=localStorage.getItem(LANG_KEY);if(s==="ko"||s==="en")return s}catch(e){}
  return /^ko\b/i.test(navigator.language||"ko")?"ko":"en"})();   // 처음 오면 기기 언어를 따름
const L=(ko,en)=>LANG==="en"?en:ko;
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
const tr=s=>LANG==="en"&&EN[s]?EN[s]:s;              // 저장된 한국어 값 → 화면 표시
const info=m=>MENU_INFO[m.id]||null;
const mname=m=>LANG==="en"&&info(m)?info(m).en:m.name; // 메뉴 이름 (영어일 때 영문 이름)
// 영어 화면에서도 키오스크에서 찾을 수 있게 한국어 이름을 작게 같이 보여 줌
const mnameHtml=m=>LANG==="en"&&info(m)?`${esc(info(m).en)}<span class="kname" lang="ko">${esc(m.name)}</span>`:esc(m.name);
const WD={ko:"일월화수목금토",en:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function applyStatic(root=document){
  document.documentElement.lang=LANG;
  root.querySelectorAll("[data-en]").forEach(el=>{
    if(el.dataset.ko===undefined)el.dataset.ko=el.innerHTML;
    el.innerHTML=LANG==="en"?el.dataset.en:el.dataset.ko;
  });
  root.querySelectorAll("[data-en-label]").forEach(el=>{
    if(el.dataset.koLabel===undefined)el.dataset.koLabel=el.getAttribute("aria-label")||"";
    el.setAttribute("aria-label",LANG==="en"?el.dataset.enLabel:el.dataset.koLabel);
  });
  root.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===LANG));
}
function setLang(l){
  if(l!=="ko"&&l!=="en"||l===LANG)return;
  LANG=l;try{localStorage.setItem(LANG_KEY,l)}catch(e){}
  applyStatic();
  if(typeof onLang==="function")onLang();   // 화면마다 다시 그리기 (events.js·sync.js에서 연결)
}
