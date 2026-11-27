// 공통: 상태 저장, 한국 시간 날짜, 아이콘·포맷 도우미, 화면 상태 변수

// ── 상태 (이 브라우저에만 저장) ──
const KEY="haksikshot-v1";
let st={plans:{},meals:[],mine:{},photos:{},sold:{},votes:{},rankHist:{},wc:{byTheme:{},history:[]}};
try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s)st=Object.assign(st,s)}catch(e){}
if(!st.soldReset){st.sold={};st.soldReset=true}
if(!st.rvReset){st.mine={};st.rvReset=true}
// 품절 표시는 매일 19시에 초기화
// ── 날짜는 모두 한국 시간(KST) 기준: 휴대폰 시간대가 달라도 서버(Asia/Seoul)와 같은 날·끼니·주차 ──
// 한국은 서머타임이 없어 항상 UTC+9 → 9시간 더한 뒤 UTC 값으로 읽으면 한국 날짜·시각
const KST=9*36e5;
const kst=(t=Date.now())=>{const d=new Date(t+KST);return {y:d.getUTCFullYear(),mo:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay(),h:d.getUTCHours()}};
const kDay0=(t=Date.now())=>Math.floor((t+KST)/864e5)*864e5-KST;   // 그날 한국 0시 (epoch ms)
function lastReset(){const now=Date.now(),r=kDay0(now)+19*36e5;return now<r?r-864e5:r}
function purgeSold(){const r=lastReset();let ch=false;Object.keys(st.sold).forEach(id=>{if(st.sold[id].at<r){delete st.sold[id];ch=true}});return ch}
purgeSold();
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){toast(L("저장 공간이 부족해 일부 사진이 저장되지 않았어요","Storage is full, so some photos weren't saved"))}}

const $=s=>document.querySelector(s);
const DAY=864e5,SLOTS=["아침","점심","저녁"];
const won=n=>LANG==="ko"?n.toLocaleString("ko-KR")+"원":"₩"+n.toLocaleString("en-US");
// 아이콘은 SVG로 한 곳에 정의해 재사용 (텍스트 기호는 기기·글꼴마다 모양이 달라짐)
const SVG_A='class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"',STAR_D="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95Z",STROKE='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const ICON={
  star:`<svg ${SVG_A} fill="currentColor"><path d="${STAR_D}"/></svg>`,
  starOff:`<svg ${SVG_A} ${STROKE}><path d="${STAR_D}"/></svg>`,
  up:`<svg ${SVG_A} ${STROKE}><path d="m6 15 6-6 6 6"/></svg>`,
  down:`<svg ${SVG_A} ${STROKE}><path d="m6 9 6 6 6-6"/></svg>`
};
const stars=n=>`<span role="img" aria-label="${L(`별점 ${n}점`,`${n} out of 5 stars`)}">${ICON.star.repeat(n)}${ICON.starOff.repeat(5-n)}</span>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ago=t=>{const m=Math.max(0,Math.round((Date.now()-t)/6e4));if(LANG==="ko")return m<1?"방금":m<60?m+"분 전":m<1440?Math.round(m/60)+"시간 전":Math.floor(m/1440)+"일 전";
  const r=new Intl.RelativeTimeFormat(LOCALE[LANG],{numeric:"auto"});return m<1?r.format(0,"minute"):m<60?r.format(-m,"minute"):m<1440?r.format(-Math.round(m/60),"hour"):r.format(-Math.floor(m/1440),"day")};
const dayLabel=t=>{const k=kst(t);return LANG==="vi"?`${k.d}/${k.mo} (${WD.vi[k.w]})`:`${k.mo}/${k.d} (${WD[LANG][k.w]})`};
const stampOf=t=>`${dayLabel(t)} ${new Date(t).toLocaleTimeString(LOCALE[LANG],{hour:"numeric",minute:"2-digit",timeZone:"Asia/Seoul"})}`;
const isToday=t=>kDay0(t)===kDay0();
const nowSlot=()=>{const h=kst().h;return h<11?"아침":h<16?"점심":"저녁"};
const QUICK=[
 {k:"portion",label:"양",opts:["적음","보통","많음"]},
 {k:"salt",label:"간",opts:["싱거움","딱 좋음","짬"]},
 {k:"spicy",label:"맵기",opts:["순함","적당","매움"],only:m=>m.tags.includes("매콤")},
 {k:"smell",label:"냄새",opts:["괜찮음","느끼함","기름 냄새","고기 잡내"],optsFor:m=>["괜찮음","느끼함",...(m.tags.includes("튀김")?["기름 냄새"]:[]),...(m.tags.includes("고기")?["고기 잡내"]:[])],only:m=>m.tags.includes("튀김")||m.tags.includes("고기")},
 {k:"again",label:"또 먹을래?",opts:["또 먹을래요","글쎄요","다신 안 먹어요"]}
];
const fText=f=>f?QUICK.map(q=>f[q.k]?(q.k==="again"?tr(f[q.k]):`${tr(q.label)} ${tr(f[q.k])}`):"").filter(Boolean).join(" · "):"";
let sortBy="low",cat="일품",goal="bulk",rankScope="wk",openId=null,busy={},slotOpen=false,draft={s:0,t:"",f:{}},lastMsg=null;
function renderToday(){const d0=kst();$("#today").innerHTML=`${fmtDate(d0)}<br>${L("다래락 · 나비센터 1층","Daraerak cafeteria · 나비센터 1F")}`}
renderToday();
function toast(m,mood){const t=$("#toast");t.textContent=m;if(mood)t.insertAdjacentHTML("afterbegin",BAP(mood,"bap bap-t"));t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2400)}
