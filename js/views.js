// 계산과 화면 그리기: AI 판정, 추천·가성비 계산, 탭 4개와 상세 화면 렌더

// ── AI 사진 판정 ──
let sample=null,aiImages=false;
(async()=>{try{sample=await window.claude?.use?.("sample")}catch(e){}
  if(sample){const l=await sample.limits().catch(()=>null);aiImages=!!(l&&l.images)}})();
// 실제 구현은 sync.js의 callVerify (서버 함수 verify-photo 호출)
let aiCheckFood = async () => ({ skipped: true });
let aiCheckSold = async () => ({ skipped: true });
const aiErr=e=>e&&e.code==="not_granted"?L("AI 사용을 허용하지 않아 확인할 수 없어요","AI use isn't allowed, so the photo can't be checked"):e&&e.code==="rate_limited"?L("요청이 많아요. 잠시 후 다시 시도해 주세요","Too many requests. Please try again shortly"):e&&e.code==="image_rejected"?L("이 사진은 확인할 수 없어요. 다른 사진을 골라 주세요","This photo can't be checked. Please pick another one"):L("사진 확인에 실패했어요. 다시 시도해 주세요","Photo check failed. Please try again");
function shrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{const w=Math.min(560,img.width),h=Math.round(img.height*w/img.width),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",.72))};img.src=fr.result};fr.readAsDataURL(file)})}

// ── 계산 ──
const todayMeals=()=>st.meals.filter(x=>isToday(x.at));
const eatenToday=id=>todayMeals().find(x=>x.id===id);
const slotUsed=s=>todayMeals().find(x=>x.slot===s);
const avail=m=>!st.sold[m.id];
const PF={"적음":0.85,"보통":1,"많음":1.15};
function portionOf(id){const r=st.mine[id];return (r&&r.f&&r.f.portion)||(r&&r.portion)||(st.photos[id]&&st.photos[id].portion)||null}
function nut(m){const ph=st.photos[m.id];if(ph&&ph.nutrition)return ph.nutrition;const f=PF[portionOf(m.id)]||1;if(f===1)return m.n;return {kcal:Math.round(m.n.kcal*f),protein:Math.round(m.n.protein*f),carbs:Math.round(m.n.carbs*f),sugar:Math.round(m.n.sugar*f)}}
// ── 주간 가성비: 월요일 기준 주차, 투표 ──
function weekStart(t=Date.now()){return kDay0(t)-((kst(t).w+6)%7)*864e5}   // 그 주 월요일 한국 0시
const wkKey=t=>{const k=kst(weekStart(t));return k.y+"-"+k.mo+"-"+k.d};
function votesFor(id,t){const k=wkKey(t)+"|"+id,a=AGG.votes[k]||{up:0,down:0},v=st.votes[k]||0;return {up:a.up+(v===1?1:0),down:a.down+(v===-1?1:0),mine:v}}
function valueScore(m){
  const lw=votesFor(m.id,Date.now()-7*DAY),tot=lw.up+lw.down,r=rate(m.id,"all");
  return m.off+(tot?10*(lw.up-lw.down)/Math.max(5,tot):0)+(r.n>=3?(r.avg-3)*5:0)+(PF[portionOf(m.id)]?(PF[portionOf(m.id)]-1)*40:0)+({"또 먹을래요":3,"다신 안 먹어요":-3}[(st.mine[m.id]&&st.mine[m.id].f||{}).again]||0);
}
function rate(id,scope){
  const base=(RATE[id]||{})[scope]||[0,0];let sum=base[0]*base[1],n=base[1];
  const mine=st.mine[id];if(mine&&(scope==="all"||Date.now()-mine.at<7*DAY)){sum+=mine.s;n++}
  return {avg:n?sum/n:0,n};
}
const weekSales=id=>(SALES[id]||0)+st.meals.filter(x=>x.id===id&&Date.now()-x.at<7*DAY).length;
const recentPhoto=id=>{const p=st.photos[id];return p&&Date.now()-p.at<7*DAY?p:null};
function tasteScores(){
  const sc={};const add=(m,w)=>m.tags.forEach(t=>sc[t]=(sc[t]||0)+w);
  st.meals.forEach(x=>{const m=byId(x.id);if(m)add(m,1)});
  Object.entries(st.mine).forEach(([id,r])=>{const m=byId(id);if(m)add(m,r.s-3)});
  return Object.entries(sc).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
}
const GOALS={
 diet:{label:"다이어트",cls:"g-diet",sub:["칼로리는 낮게, 단백질은 챙기기","Low calories, enough protein"],
   list:()=>MENUS.filter(m=>avail(m)&&nut(m).kcal<=650&&m.price>1000).sort((a,b)=>nut(b).protein/nut(b).kcal-nut(a).protein/nut(a).kcal),
   why:m=>{const n=nut(m),p=(n.protein/n.kcal*100).toFixed(1);return L(`${n.kcal}kcal로 가벼운데 단백질이 ${n.protein}g이라 100kcal당 ${p}g을 채워요.`,`Light at ${n.kcal} kcal with ${n.protein} g of protein — ${p} g per 100 kcal.`)},
   note:["다이어트 추천은 650kcal 이하 메뉴 중 칼로리 대비 단백질이 높은 순이에요. 학생들이 남긴 '양' 평가와 사진 속 실제 양이 영양 추정에 반영돼요. 끼니를 거르기보다 세 끼를 가볍게 챙기는 쪽을 추천해요.","Diet picks are menus under 650 kcal, ranked by protein per calorie. Students' portion ratings and the actual portions in photos are reflected in the estimates. Eating three light meals is better than skipping meals."]},
 bulk:{label:"벌크업",cls:"g-bulk",sub:["오늘은 득근하는 날","Gains day"],
   list:()=>MENUS.filter(avail).sort((a,b)=>(nut(b).protein*2+nut(b).kcal/20)-(nut(a).protein*2+nut(a).kcal/20)),
   why:m=>{const n=nut(m);return L(`단백질 ${n.protein}g, ${n.kcal}kcal로 운동 후 한 끼로 든든해요.`,`${n.protein} g protein and ${n.kcal} kcal — a solid post-workout meal.`)},
   note:["벌크업 추천은 단백질을 가장 크게 보고 칼로리를 함께 본 점수 순이에요. '양 많음' 평가가 쌓인 메뉴일수록 위로 올라와요.","Bulk-up picks weigh protein most, then calories. Menus rated 'Large' portion rise to the top."]},
 value:{label:"가성비",cls:"g-value",sub:["이번 주 가성비 랭킹","This week's value ranking"],
   list:()=>MENUS.filter(m=>avail(m)&&m.price>1000).sort((a,b)=>b.off-a.off||b.save-a.save).slice(0,10).sort((a,b)=>valueScore(b)-valueScore(a)),
   why:m=>L(`밖에서 사 먹으면 보통 ${won(m.market)} 정도인데 학식은 ${won(m.price)}. ${won(m.save)} 아끼는 셈이에요.`,`Usually about ${won(m.market)} at a restaurant, but ${won(m.price)} here — you save ${won(m.save)}.`),
   note:["가성비 랭킹은 시중가 대비 할인율이 높은 10개 메뉴를 후보로, 지난주 추천·비추천 투표, 별점, '양' 평가를 더해 매주 월요일에 다시 매겨요. 이번 주 투표는 다음 주 순위에 반영돼요.","The value ranking takes the 10 menus with the biggest discount vs. restaurant prices, then adds last week's up/down votes, star ratings and portion ratings. It's re-ranked every Monday; this week's votes count toward next week."]}
};

// 가격을 천 원 단위로 짧게 (막대 그래프 옆)
const k1=n=>LANG==="en"?"₩"+(n/1000).toFixed(1)+"k":(n/1000).toFixed(1)+"천";
// ── 렌더: 메뉴 ──
function renderSlotbar(){
  const tm=todayMeals();
  $("#slotbar").innerHTML=L(`오늘 먹음 체크 ${tm.length}/3`,`Meals today ${tm.length}/3`)+SLOTS.map(s=>`<span class="sl${slotUsed(s)?" on":""}">${tr(s)}</span>`).join("");
}
function renderCats(){$("#cats").innerHTML=["일품","양식","분식"].map(c=>{const all=MENUS.filter(m=>m.cat===c),n=all.filter(avail).length;return `<button class="cat" role="tab" aria-selected="${c===cat}" data-c="${c}">${tr(c)}<small>${n}/${all.length}</small></button>`}).join("")}
// ── 렌더: 첫 화면(인트로) ── 밥톨이가 "오늘의 학식은?" 하고 묻고, 누르면 메뉴판으로
function renderIntro(){
  const d=kst(),s=nowSlot(),so=MENUS.filter(m=>!avail(m)).length;
  $("#intro-q").textContent=L("오늘의 학식은?",`What's for ${tr(s).toLowerCase()} today?`);
  $("#intro-date").textContent=L(`${d.mo}월 ${d.d}일 (${WD.ko[d.w]}) · 지금은 ${s} 시간`,`${WD.en[d.w]}, ${MON[d.mo-1]} ${d.d} · ${tr(s)} time`);
  $("#ticketbar").innerHTML=["일품","양식","분식"].map(c=>`<button class="tc" data-c="${c}"><small>${tr(c)}</small><b>${MENUS.filter(m=>m.cat===c).length}</b></button>`).join("")+`<div class="so">${L("지금 품절","Sold out now")} <b>${so}</b></div>`;
}
function tile(m){
  const ph=st.photos[m.id],so=st.sold[m.id],r=rate(m.id,"all"),e=eatenToday(m.id);
  const badge=so?`<span class="badge sold">${L("품절","Sold out")}</span>`:e?`<span class="badge done">${tr(e.slot)}</span>`:st.plans[m.id]?`<span class="badge plan">${L("예정","Planned")}</span>`:"";
  return `<button class="tile${so?" sold":""}" data-open="${m.id}">${badge}<span class="tno" aria-hidden="true"><span>${tr(m.cat)}</span><span>No.${m.id.slice(1).padStart(2,"0")}</span></span><span class="tt" aria-hidden="true">${foodIcon(m)}${ph?`<span class="hasph" title="${L("사진 있음","Has photo")}"><svg class="cam" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>`:""}</span><span class="perf" aria-hidden="true"></span><span class="tn">${esc(mname(m))}</span>${LANG==="en"&&info(m)?`<span class="kn" lang="ko">${esc(m.name)}</span>`:""}<span class="tp">${won(m.price)}${info(m)&&info(m).hot?`<span class="hot" aria-label="${L("매운 정도","Spicy")} ${info(m).hot}/3">${"●".repeat(info(m).hot)}</span>`:""}</span><span class="tr">${r.n?`<b>${ICON.star}</b> ${r.avg.toFixed(1)} (${r.n})`:L("평가 없음","No ratings")}</span></button>`;
}
function renderMenus(){
  const SORTS={low:[L("가격 낮은 순","Price: low"),(a,b)=>a.price-b.price],high:[L("가격 높은 순","Price: high"),(a,b)=>b.price-a.price],star:[L("별점 순","Top rated"),(a,b)=>{const x=rate(a.id,"all"),y=rate(b.id,"all");return (y.n?1:0)-(x.n?1:0)||y.avg-x.avg||y.n-x.n||a.price-b.price}]};
  $("#sortbar").innerHTML=Object.entries(SORTS).map(([k,[l]])=>`<button data-sort="${k}" aria-pressed="${k===sortBy}">${l}</button>`).join("");
  const sorted=MENUS.filter(m=>m.cat===cat).sort(SORTS[sortBy][1]);
  const list=sorted,on=list.filter(avail),off=list.filter(m=>!avail(m));
  $("#menus").innerHTML=(sortBy==="star"&&!list.some(m=>rate(m.id,"all").n)?`<p class="hint" style="margin:0">${L("아직 별점이 없어서 가격 낮은 순으로 보여요.","No ratings yet, so sorted by price.")}</p>`:"")+`<div class="grid">${on.map(tile).join("")}</div>`+(off.length?`<div class="divider">${L(`품절 ${off.length}개 · 매일 19시에 초기화`,`${off.length} sold out · resets daily at 7 pm`)}</div><div class="grid">${off.map(tile).join("")}</div>`:"");
}
// ── 렌더: 메뉴 추천 ──
function renderReco(){
  const g=GOALS[goal],list=g.list(),top=list[0],s=nowSlot();
  $("#reco-slot").textContent=slotUsed(s)?L(`오늘 ${s}은 이미 체크했어요`,`You already checked ${tr(s).toLowerCase()} today`):L(`지금은 ${s} 시간`,`It's ${tr(s).toLowerCase()} time`);
  $("#goals").innerHTML=Object.entries(GOALS).map(([k,v])=>`<button class="goal ${v.cls}" data-goal="${k}" aria-pressed="${k===goal}"><b>${tr(v.label)}</b><small>${L(...v.sub)}</small></button>`).join("");
  const v=$("#view-reco");v.className="view "+g.cls;
  if(!top){$("#reco-hero").innerHTML=`<div class="empty">${BAP("sad","bap bap-e")}${L("지금 추천할 수 있는 메뉴가 없어요","No menus to recommend right now")}</div>`;$("#reco-list").innerHTML="";return}
  const tn=nut(top),isV=goal==="value";
  const nums=`<div><b>${tn.protein}g</b><span>${L("단백질","protein")}</span></div><div><b>${tn.kcal}</b><span>kcal</span></div><div><b>${won(top.price)}</b><span>${L("가격","price")}</span></div>`;
  const wk=wkKey(),prev=st.rankHist[wkKey(Date.now()-7*DAY)];
  if(isV&&!st.rankHist[wk]){st.rankHist[wk]=list.map(m=>m.id);API.rankHist(wk,st.rankHist[wk]);save()}
  const order=isV?(st.rankHist[wk]||list.map(m=>m.id)).map(byId).filter(m=>m&&avail(m)):list;
  const move=(m,i)=>{if(!prev)return `<span class="mv">NEW</span>`;const j=prev.indexOf(m.id);return j<0?`<span class="mv">NEW</span>`:j>i?`<span class="mv up">${ICON.up}${j-i}</span>`:j<i?`<span class="mv dn">${ICON.down}${i-j}</span>`:`<span class="mv">-</span>`};
  const vote=m=>{const v=votesFor(m.id);return `<div class="vote"><button data-vote="1" data-id="${m.id}" aria-pressed="${v.mine===1}">${L("추천","Up")} ${v.up}</button><button data-vote="-1" data-id="${m.id}" aria-pressed="${v.mine===-1}">${L("비추천","Down")} ${v.down}</button></div>`};
  if(isV){const ws=kst(weekStart()),we=kst(weekStart()+6*DAY);$("#reco-slot").textContent=`${ws.mo}/${ws.d}~${we.mo}/${we.d} · ${L("매주 월요일 갱신","updated every Monday")}`}
  const t1=isV?order[0]:top;
  $("#reco-hero").innerHTML=`<div class="herowrap"><button class="pickhero" data-open="${t1.id}"><span class="eyebrow">${L(`${g.label} 1순위`,`#1 ${tr(g.label)}`)} · ${tr(t1.cat)}${isV?" · "+move(t1,0):""}</span><span class="hn">${mnameHtml(t1)}</span><span class="why">${g.why(t1)}</span>
    <span class="bignums">${isV?`<div><b>${t1.off}%</b><span>${L("시중가 대비 할인","off restaurant price")}</span></div><div><b>${won(t1.save)}</b><span>${L("아끼는 돈","you save")}</span></div><div><b>${won(t1.price)}</b><span>${L("학식 가격","cafeteria price")}</span></div>`:nums}</span></button>${isV?vote(t1):""}</div>`;
  if(isV){
    const maxM=Math.max(...order.map(m=>m.market));
    $("#reco-sub").textContent=L("이번 주 가성비 랭킹","This week's value ranking");
    $("#reco-list").innerHTML=order.slice(1).map((m,i)=>`<div class="vr"><button class="cr" data-open="${m.id}"><span class="n">${i+2}</span><span class="t"><span>${mnameHtml(m)} ${move(m,i+1)}</span><span>${L(`${m.off}% 저렴`,`${m.off}% cheaper`)}</span></span>
      <span class="bars"><span>${L("학식","Here")}</span><i><u style="width:${Math.round(m.price/maxM*100)}%"></u></i><span>${k1(m.price)}</span><span>${L("시중","Outside")}</span><i class="k"><u style="width:${Math.round(m.market/maxM*100)}%"></u></i><span>${k1(m.market)}</span></span></button>${vote(m)}</div>`).join("");
    $("#reco-note").textContent=L(...g.note)+L(" 시중 가격은 추정치예요."," Restaurant prices are estimates.");
    return;
  }
  const rest=list.slice(1,8),maxP=Math.max(...list.slice(0,8).map(m=>m.n.protein)),maxK=Math.max(...list.slice(0,8).map(m=>m.n.kcal));
  $("#reco-sub").textContent=L(`${g.label} 다른 후보`,`More ${tr(g.label).toLowerCase()} picks`);
  const maxM=Math.max(...list.slice(0,8).map(m=>m.market));
  $("#reco-list").innerHTML=rest.map((m,i)=>`<button class="cr" data-open="${m.id}"><span class="n">${i+2}</span><span class="t"><span>${mnameHtml(m)}</span><span>${won(m.price)}</span></span>
    ${`<span class="bars"><span>${L("단백질","Protein")}</span><i><u style="width:${Math.round(m.n.protein/maxP*100)}%"></u></i><span>${m.n.protein}g</span><span>${L("칼로리","Calories")}</span><i class="k"><u style="width:${Math.round(m.n.kcal/maxK*100)}%"></u></i><span>${m.n.kcal}</span></span>`}</button>`).join("");
  $("#reco-note").textContent=L(...g.note)+L(" 영양성분은 추정치예요."," Nutrition values are estimates.");
}
// ── 렌더: 내 입맛 ──
function renderTaste(){
  $("#meals").innerHTML=SLOTS.map(s=>{const x=slotUsed(s),m=x&&byId(x.id);return m?`<div class="meal on"><span class="lb">${tr(s)}</span><b>${mnameHtml(m)}</b><small>${nut(m).kcal}kcal · ${L("단백질","protein")} ${nut(m).protein}g</small></div>`:`<div class="meal"><span class="lb">${tr(s)}</span><small>${L("아직 안 먹었어요","Not yet")}</small></div>`}).join("");
  const ts=tasteScores();
  if(ts.length){
    const max=ts[0][1],top=ts.slice(0,2).map(([t])=>t);
    $("#taste-card").innerHTML=`<div class="taste"><span class="tl">${L("내 입맛 분석","My taste")}</span><span class="tt2">${L(`${top.map(t=>`#${t}`).join(" ")} 좋아하는 편`,`You like ${top.map(t=>`#${tr(t)}`).join(" ")}`)}</span><div class="tags">${ts.slice(0,5).map(([t,v])=>`<div class="tag"><span>${tr(t)}</span><i><u style="width:${Math.round(v/max*100)}%"></u></i><span>${v}</span></div>`).join("")}</div><span class="tl">${L("먹음 체크 1회 = 1점, 별점 4점 = +1, 5점 = +2, 2점 이하는 감점","Each meal check = 1 pt, 4 stars = +1, 5 stars = +2, 2 stars or less = minus")}</span></div>`;
  } else $("#taste-card").innerHTML=`<div class="taste"><span class="tl">${L("내 입맛 분석","My taste")}</span><span class="tt2">${L("아직 기록이 없어요","No records yet")}</span><span class="tl">${L("메뉴에서 먹음 체크를 하거나, 예전에 먹어 본 메뉴에 별점을 남기면 좋아하는 맛을 분석해 드려요.","Check meals you eat or rate menus you've tried, and we'll figure out what flavors you like.")}</span></div>`;
  const wk=st.meals.filter(x=>Date.now()-x.at<7*DAY),wm=wk.map(x=>byId(x.id)).filter(Boolean);
  const kcal=wm.reduce((s,m)=>s+nut(m).kcal,0),pro=wm.reduce((s,m)=>s+nut(m).protein,0);
  $("#week-stats").innerHTML=`<div class="stat"><b>${L(`${wm.length}끼`,wm.length)}</b><span>${L("먹은 끼니","meals")}</span></div><div class="stat"><b>${won(wm.reduce((s,m)=>s+m.price,0))}</b><span>${L("식비","spent")}</span></div><div class="stat"><b>${wm.length?Math.round(kcal/wm.length):0}</b><span>${L("한 끼 평균 kcal (추정)","avg kcal per meal (est.)")}</span></div><div class="stat"><b>${wm.length?Math.round(pro/wm.length):0}g</b><span>${L("한 끼 평균 단백질 (추정)","avg protein per meal (est.)")}</span></div>`;
  if(ts.length){
    const sc=Object.fromEntries(ts),tried=new Set([...st.meals.map(x=>x.id),...Object.keys(st.mine)]);
    const rec=MENUS.filter(m=>avail(m)&&!tried.has(m.id)&&m.price>1000).map(m=>({m,v:m.tags.reduce((s,t)=>s+(sc[t]||0),0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v||rate(b.m.id,"all").avg-rate(a.m.id,"all").avg).slice(0,5);
    $("#taste-reco").innerHTML=rec.length?`<div class="chips">${rec.map(x=>`<button class="chip" data-open="${x.m.id}">${esc(mname(x.m))} <small>${x.m.tags.filter(t=>sc[t]).map(t=>"#"+tr(t)).join(" ")}</small></button>`).join("")}</div>`:`<div class="empty">${BAP("sad","bap bap-e")}${L("비슷한 맛의 메뉴는 다 먹어 봤어요","You've tried every menu with a similar taste")}</div>`;
  } else $("#taste-reco").innerHTML=`<div class="empty">${BAP("sad","bap bap-e")}${L("입맛 분석이 생기면 안 먹어 본 메뉴 중에서 골라 드려요","Once we know your taste, we'll pick menus you haven't tried")}</div>`;
  const plans=Object.keys(st.plans).map(byId).filter(Boolean);
  $("#plans").innerHTML=plans.length?plans.map(m=>`<button class="chip" data-open="${m.id}">${esc(mname(m))}${st.sold[m.id]?` <small>${L("품절 제보됨","reported sold out")}</small>`:""}</button>`).join(""):`<span class="hint">${L("메뉴에서 '먹을래요'를 누르면 여기에 모여요","Tap 'I'll eat this' on a menu to save it here")}</span>`;
  const hist=st.meals.slice().sort((a,b)=>b.at-a.at).slice(0,20);
  $("#history").innerHTML=hist.length?`<div class="tl2">${hist.map(x=>{const m=byId(x.id);return m?`<button class="ti" data-open="${m.id}"><small>${dayLabel(x.at)} ${tr(x.slot)}</small><b>${esc(mname(m))}</b><small>${won(m.price)} · ${nut(m).kcal}kcal${st.mine[m.id]?" · "+stars(st.mine[m.id].s):""}</small></button>`:""}).join("")}</div>`:`<div class="empty">${BAP("sad","bap bap-e")}${L("먹음 체크한 메뉴가 날짜별로 쌓여요","Meals you check will show up here by date")}</div>`;
}
// ── 렌더: 랭킹 ──
function renderRank(){
  const sales=MENUS.map(m=>({m,v:weekSales(m.id)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,10),max=sales[0]?sales[0].v:1;
  $("#rank-sales").innerHTML=!sales.length?`<div class="empty">${BAP("sad","bap bap-e")}${L("이번 주 먹음 체크가 쌓이면 순위가 생겨요","The ranking appears once meals are checked this week")}</div>`:sales.map((x,i)=>`<button class="rk" data-open="${x.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(mname(x.m))}</b><small>${tr(x.m.cat)} · ${won(x.m.price)}</small><span class="bar"><i style="width:${Math.round(x.v/max*100)}%"></i></span></span><span class="v">${L(`${x.v}그릇`,`${x.v} bowls`)}</span></button>`).join("");
  const rs=MENUS.map(m=>({m,r:rate(m.id,rankScope)})).filter(x=>x.r.n>=5).sort((a,b)=>b.r.avg-a.r.avg||b.r.n-a.r.n).slice(0,10);
  $("#rank-star").innerHTML=rs.length?rs.map((x,i)=>`<button class="rk" data-open="${x.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(mname(x.m))}</b><small>${L(`평가 ${x.r.n}개`,`${x.r.n} ratings`)} · ${tr(x.m.cat)}</small></span><span class="v"><span style="color:var(--star)">${ICON.star}</span> ${x.r.avg.toFixed(2)}</span></button>`).join(""):`<div class="empty">${BAP("sad","bap bap-e")}${L("아직 순위를 매길 만큼 평가가 없어요","Not enough ratings for a ranking yet")}</div>`;
  document.querySelectorAll("#rank-seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.rank===rankScope));
  $("#wc-themes").innerHTML=Object.entries(THEMES).map(([k,t])=>`<button class="wct" data-wcstart="${k}"><b>${L(...t.title)}</b><small>${L(...t.sub)}</small><span>${L("시작하기","Start")}</span></button>`).join("");
  $("#wc-seg").innerHTML=Object.entries(THEMES).map(([k,t])=>`<button data-wcrank="${k}" aria-pressed="${k===wcTheme}">${L(...t.short)}</button>`).join("");
  const ws=Object.entries(wcStats(wcTheme)).map(([id,x])=>({m:byId(id),x,g:x.w+x.l})).filter(r=>r.m&&r.x.w>0).sort((a,b)=>b.x.champ-a.x.champ||b.x.w/b.g-a.x.w/a.g||b.x.w-a.x.w).slice(0,10);
  $("#rank-wc").innerHTML=ws.length?ws.map((r,i)=>`<button class="rk" data-open="${r.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(mname(r.m))}</b><small>${L(`1:1 승률 ${Math.round(r.x.w/r.g*100)}% (${r.x.w}승 ${r.x.l}패)`,`Win rate ${Math.round(r.x.w/r.g*100)}% (${r.x.w}W ${r.x.l}L)`)}</small></span><span class="v">${L(`우승 ${r.x.champ}회`,`${r.x.champ} wins`)}</span></button>`).join(""):`<div class="empty">${BAP("sad","bap bap-e")}${L("월드컵을 한 판 하면 순위가 생겨요","Play a World Cup round to see the ranking")}</div>`;
}
// ── 렌더: 상세 ──
function renderDetail(){
  if(!openId)return;const m=byId(openId),ph=st.photos[m.id],rp=recentPhoto(m.id),so=st.sold[m.id],r=rate(m.id,"all"),b=busy[m.id],e=eatenToday(m.id),tm=todayMeals();
  $("#dbar-cat").textContent=`${L("다래락","Daraerak")} · ${tr(m.cat)}`;
  const hero=ph?`<div class="stamp"><span>${L(`${stampOf(ph.at)} 업로드`,`Uploaded ${stampOf(ph.at)}`)}</span>${ph.verified?`<span class="ok">${L("AI 확인됨","AI verified")}</span>`:`<span>${L("AI 미확인","Not AI verified")}</span>`}</div><img src="${ph.src}" alt="${esc(L(`${m.name} 최근 사진`,`Recent photo of ${mname(m)}`))}">`
    :`${foodIcon(m,"fi big-ic")}<span class="big">${esc(mname(m))}</span>${L("아직 올라온 사진이 없어요<br>먹고 나서 첫 사진을 올려 주세요","No photos yet<br>Eat it and post the first one!")}`;
  let actions="";
  const pickL=L("먹을래요","I'll eat this"),checking=L("AI가 확인 중…","AI is checking…");
  if(e) actions=`<div class="status">${L(`오늘 ${e.slot}으로 먹음 체크했어요`,`Checked as today's ${tr(e.slot).toLowerCase()}`)}</div><div class="actions"><button class="btn" data-a="uneat">${L("먹음 체크 취소","Undo meal check")}</button></div>`;
  else if(so) actions=`<div class="actions"><button class="btn" data-a="restock">${L("다시 있어요","It's back")}</button></div>`;
  else if(slotOpen) actions=`<div class="panel"><h4>${L("몇 시 끼니인가요?","Which meal is it?")} <small>${L("하루 아침·점심·저녁 최대 3번","Up to 3 a day: breakfast, lunch, dinner")}</small></h4><div class="slotpick">${SLOTS.map(s=>{const u=slotUsed(s),um=u&&byId(u.id);return `<button class="btn${s===nowSlot()&&!u?" primary":""}" data-slot="${s}"${u?" disabled":""}>${tr(s)}${u?`<small>${esc(um?mname(um):"")}</small>`:""}</button>`}).join("")}</div><button class="btn" data-a="slotcancel">${L("취소","Cancel")}</button></div>`;
  else if(tm.length>=3) actions=`<div class="status bad">${L("오늘은 아침·점심·저녁 먹음 체크를 모두 했어요","You've checked all three meals today")}</div>${st.plans[m.id]?"":`<div class="actions"><button class="btn ticket" data-a="pick">${pickL}</button></div>`}`;
  else actions=`<div class="actions">${st.plans[m.id]?`<button class="btn" data-a="unpick">${L("예정 취소","Remove from plan")}</button>`:`<button class="btn ticket" data-a="pick">${pickL}</button>`}<button class="btn primary" data-a="eat">${L("먹음 체크","I ate this")}<small>${L("오늘","today")} ${tm.length}/3</small></button></div>`;
  const photoBtn=!e?`<button class="btn" disabled>${L("메뉴 사진 올리기","Post a photo")}<small>${L("먹음 체크 후 가능","after checking the meal")}</small></button>`:rp?`<button class="btn" disabled>${L(`최근 사진이 있어요 (${ago(rp.at)})`,`Recent photo exists (${ago(rp.at)})`)}</button>`
    :`<label class="btn">${b==="photo"?checking:L("메뉴 사진 올리기","Post a photo")}<input type="file" accept="image/*" data-a="photo"${b?" disabled":""}></label>`;
  const soldBtn=so?"":`<label class="btn warn">${b==="sold"?checking:L("품절 제보 (사진 필요)","Report sold out (photo)")}<input type="file" accept="image/*" data-a="soldphoto"${b?" disabled":""}></label>`;
  const nb=n=>`<div><b>${n.kcal}</b><span>kcal</span></div><div><b>${n.protein}g</b><span>${L("단백질","protein")}</span></div><div><b>${n.carbs}g</b><span>${L("탄수화물","carbs")}</span></div><div><b>${n.sugar}g</b><span>${L("당","sugar")}</span></div>`;
  const inf=info(m),about=inf?`<div class="panel about"><h4>${L("메뉴 소개","About this dish")}${inf.hot?` <span class="hot" aria-label="${L("매운 정도","Spicy")} ${inf.hot}/3">${"●".repeat(inf.hot)}<small>${L(["","조금 매워요","매워요","아주 매워요"][inf.hot],["","a little spicy","spicy","very spicy"][inf.hot])}</small></span>`:` <small>${L("맵지 않아요","not spicy")}</small>`}</h4><p>${esc(L(inf.ko,inf.d))}</p>${inf.has.length?`<div class="has"><span class="hint">${L("보통 들어가는 재료","Usually contains")}</span>${inf.has.map(h=>`<span class="pill">${L(...HAS[h])}</span>`).join("")}</div>`:""}<span class="hint">${L("일반적인 조리법 기준이에요. 알레르기나 종교상 가리는 음식이 있으면 직원에게 꼭 확인하세요.","Based on typical recipes. If you have allergies or dietary restrictions (e.g. halal, vegetarian), please check with the staff.")}</span></div>`:"";
  const mineR=st.mine[m.id];
  const rvs=[...(mineR?[{s:mineR.s,t:mineR.t,f:mineR.f,who:"나",at:mineR.at,v:mineR.verified}]:[]),...(SEED_RV[m.id]||[]).map(x=>({...x,at:Date.now()-x.d*DAY}))];
  $("#detail-body").innerHTML=`<div class="${so?"sold":""}" style="display:flex;flex-direction:column;gap:16px">
    <div class="hero">${hero}</div>
    <div class="dname"><h3>${mnameHtml(m)}</h3><span class="price">${won(m.price)}</span></div>
    ${m.off>0?`<div class="meta">${L(`밖에서 사 먹으면 약 ${won(m.market)}`,`About ${won(m.market)} at a restaurant`)} · <span class="pill ok">${L(`${m.off}% 저렴`,`${m.off}% cheaper`)}</span></div>`:""}
    <div class="meta">${so?`<span class="pill sold">${L(`품절 · ${ago(so.at)} ${esc(so.who)} 제보`,`Sold out · reported ${ago(so.at)} by ${esc(tr(so.who))}`)}${so.verified?L(" · 사진 확인됨"," · photo verified"):""}</span>`:""}${r.n?`<span class="s">${stars(Math.round(r.avg))}</span> ${r.avg.toFixed(1)} · ${L(`평가 ${r.n}개`,`${r.n} ratings`)}`:L("아직 평가가 없어요","No ratings yet")} · ${L(`이번 주 ${weekSales(m.id)}그릇`,`${weekSales(m.id)} this week`)} · ${m.tags.map(t=>"#"+tr(t)).join(" ")}</div>
    ${about}
    ${so&&so.proof?`<div class="proof"><img src="${so.proof}" alt="${L("품절 제보 사진","Sold-out report photo")}"><span>${L("제보 사진","Report photo")} · ${esc(so.reason||"")}</span></div>`:""}
    ${b?`<div class="status">${L("AI가 사진을 확인하고 있어요…","AI is checking the photo…")}</div>`:""}
    ${lastMsg&&lastMsg.id===m.id?`<div class="status ${lastMsg.bad?"bad":""}">${esc(lastMsg.text)}</div>`:""}
    ${actions}
    <div class="actions">${photoBtn}${soldBtn}</div>
    <span class="hint" style="margin-top:-8px">${L("품절 표시는 사진으로 확인된 제보만 올라가고, 매일 19시에 초기화돼요.","Only photo-verified sold-out reports are shown. They reset daily at 7 pm.")}</span>
    <div class="panel"><h4>${L("1인분 영양성분","Nutrition per serving")} <small>${L("메뉴 이름 기준 추정","estimated from the menu name")}</small></h4><div class="nutri">${nb(m.n)}</div>
      ${ph&&ph.nutrition?`<span class="nrow">${L(`최근 사진 기준 (${esc(ph.portion||"보통")} 양)`,`From the latest photo (${esc(tr(ph.portion||"보통")).toLowerCase()} portion)`)}: ${ph.nutrition.kcal}kcal · ${L("단백질","protein")} ${ph.nutrition.protein}g · ${L("탄수화물","carbs")} ${ph.nutrition.carbs}g · ${L("당","sugar")} ${ph.nutrition.sugar}g</span>`:`<span class="nrow">${L("사진이 올라오면 AI가 실제 양을 보고 다시 추정해요.","When a photo is posted, AI re-estimates from the actual portion.")}</span>`}</div>
    ${AI_LINE[m.id]?`<div class="panel ai"><em>${L("AI 한줄평","AI summary")}</em>${AI_LINE[m.id]}</div>`:""}
    <div class="panel"><h4>${mineR?L("내 평가 수정","Edit my review"):L("별점과 코멘트 남기기","Rate and comment")} <small>${e?L("오늘 먹음 체크해서 '먹음 인증'으로 표시돼요","Marked 'Ate it' because you checked this meal today"):L("전에 먹어 본 기억으로도 남길 수 있어요","You can also rate from a past meal")}</small></h4>
      <div class="stars">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" class="${n<=draft.s?"on":""}" aria-label="${L(`${n}점`,`${n} star${n>1?"s":""}`)}">${ICON.star}</button>`).join("")}</div>
      <span class="hint">${L("별점만 골라도 등록할 수 있어요. 아래는 모두 선택이에요.","Stars are enough to submit. Everything below is optional.")}</span>
      ${QUICK.filter(q=>!q.only||q.only(m)).map(q=>`<div class="qrow"><span class="ql">${tr(q.label)}</span><div class="qopts">${(q.optsFor?q.optsFor(m):q.opts).map(o=>`<button type="button" data-q="${q.k}" data-qv="${o}" aria-pressed="${draft.f[q.k]===o}">${tr(o)}</button>`).join("")}</div></div>`).join("")}
      <label for="rv-text" class="hint">${L("한 줄 코멘트 (선택)","One-line comment (optional)")}</label>
      <textarea id="rv-text" placeholder="${L("예) 양 많고 고기 넉넉함. 국은 조금 짜요","e.g. Big portion, lots of meat. Soup a bit salty")}">${esc(draft.t)}</textarea>
      <button class="btn primary" data-a="submit">${mineR?L("수정하기","Update"):L("등록하기","Submit")}</button></div>
    <div class="panel"><h4>${L(`후기 ${Math.max(rvs.length,r.n)}개`,`${Math.max(rvs.length,r.n)} reviews`)}${r.n>rvs.length?` <small>${L(`최근 ${rvs.length}개 표시`,`showing latest ${rvs.length}`)}</small>`:""}</h4>${rvs.length?`<div class="reviews">${rvs.map(x=>`<div class="rv"><span class="s">${stars(x.s)}</span>${x.t?`<span>${esc(x.t)}</span>`:""}${fText(x.f)?`<span class="qsum">${esc(fText(x.f))}</span>`:""}<small>${esc(tr(x.who))} · ${ago(x.at)}${x.v?` · <span class="pill ok">${L("먹음 인증","Ate it")}</span>`:""}</small></div>`).join("")}</div>`:`<span class="hint">${L("첫 후기를 남겨 주세요","Be the first to review")}</span>`}</div>
  </div>`;
}
function openDetail(id){openId=id;slotOpen=false;const mine=st.mine[id];draft={s:mine?mine.s:0,t:mine?mine.t:"",f:Object.assign({},mine&&mine.f||{},mine&&mine.portion&&!(mine.f&&mine.f.portion)?{portion:mine.portion}:{})};if(lastMsg&&lastMsg.id!==id)lastMsg=null;renderDetail();const dl=$("#detail");if(!dl.open)dl.showModal();dl.scrollTop=0}
