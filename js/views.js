// 계산과 화면 그리기: AI 판정, 추천·가성비 계산, 탭 4개와 상세 화면 렌더

// ── AI 사진 판정 ──
let sample=null,aiImages=false;
(async()=>{try{sample=await window.claude?.use?.("sample")}catch(e){}
  if(sample){const l=await sample.limits().catch(()=>null);aiImages=!!(l&&l.images)}})();
// 실제 구현은 sync.js의 callVerify (서버 함수 verify-photo 호출)
let aiCheckFood = async () => ({ skipped: true });
let aiCheckSold = async () => ({ skipped: true });
const aiErr=e=>e&&e.code==="not_granted"?"AI 사용을 허용하지 않아 확인할 수 없어요":e&&e.code==="rate_limited"?"요청이 많아요. 잠시 후 다시 시도해 주세요":e&&e.code==="image_rejected"?"이 사진은 확인할 수 없어요. 다른 사진을 골라 주세요":"사진 확인에 실패했어요. 다시 시도해 주세요";
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
 diet:{label:"다이어트",cls:"g-diet",sub:"칼로리는 낮게, 단백질은 챙기기",
   list:()=>MENUS.filter(m=>avail(m)&&nut(m).kcal<=650&&m.price>1000).sort((a,b)=>nut(b).protein/nut(b).kcal-nut(a).protein/nut(a).kcal),
   why:m=>{const n=nut(m);return `${n.kcal}kcal로 가벼운데 단백질이 ${n.protein}g이라 100kcal당 ${(n.protein/n.kcal*100).toFixed(1)}g을 채워요.`},
   note:"다이어트 추천은 650kcal 이하 메뉴 중 칼로리 대비 단백질이 높은 순이에요. 학생들이 남긴 '양' 평가와 사진 속 실제 양이 영양 추정에 반영돼요. 끼니를 거르기보다 세 끼를 가볍게 챙기는 쪽을 추천해요."},
 bulk:{label:"벌크업",cls:"g-bulk",sub:"오늘은 득근하는 날",
   list:()=>MENUS.filter(avail).sort((a,b)=>(nut(b).protein*2+nut(b).kcal/20)-(nut(a).protein*2+nut(a).kcal/20)),
   why:m=>{const n=nut(m);return `단백질 ${n.protein}g, ${n.kcal}kcal로 운동 후 한 끼로 든든해요.`},
   note:"벌크업 추천은 단백질을 가장 크게 보고 칼로리를 함께 본 점수 순이에요. '양 많음' 평가가 쌓인 메뉴일수록 위로 올라와요."},
 value:{label:"가성비",cls:"g-value",sub:"이번 주 가성비 랭킹",
   list:()=>MENUS.filter(m=>avail(m)&&m.price>1000).sort((a,b)=>b.off-a.off||b.save-a.save).slice(0,10).sort((a,b)=>valueScore(b)-valueScore(a)),
   why:m=>`밖에서 사 먹으면 보통 ${won(m.market)} 정도인데 학식은 ${won(m.price)}. ${won(m.save)} 아끼는 셈이에요.`,
   note:"가성비 랭킹은 시중가 대비 할인율이 높은 10개 메뉴를 후보로, 지난주 추천·비추천 투표, 별점, '양' 평가를 더해 매주 월요일에 다시 매겨요. 이번 주 투표는 다음 주 순위에 반영돼요."}
};

// ── 렌더: 메뉴 ──
function renderSlotbar(){
  const tm=todayMeals();
  $("#slotbar").innerHTML=`오늘 먹음 체크 ${tm.length}/3`+SLOTS.map(s=>`<span class="sl${slotUsed(s)?" on":""}">${s}</span>`).join("");
}
function renderCats(){$("#cats").innerHTML=["일품","양식","분식"].map(c=>{const all=MENUS.filter(m=>m.cat===c),n=all.filter(avail).length;return `<button class="cat" role="tab" aria-selected="${c===cat}" data-c="${c}">${c}<small>${n}/${all.length}</small></button>`}).join("")}
function renderTicketbar(){const so=MENUS.filter(m=>!avail(m)).length,d=kst(),mm=String(d.mo).padStart(2,"0"),dd=String(d.d).padStart(2,"0");$("#tkt-no").textContent=`No.${mm}${dd}`;$("#tkt-date").textContent=`${mm}.${dd}`;$("#ticketbar").innerHTML=["일품","양식","분식"].map(c=>`<button class="tc" data-c="${c}" aria-pressed="${c===cat}"><small>${c}</small><b>${MENUS.filter(m=>m.cat===c).length}</b></button>`).join("")+`<div class="so">지금 품절 <b>${so}</b></div>`}
function tile(m){
  const ph=st.photos[m.id],so=st.sold[m.id],r=rate(m.id,"all"),e=eatenToday(m.id);
  const badge=so?'<span class="badge sold">품절</span>':e?`<span class="badge done">${e.slot}</span>`:st.plans[m.id]?'<span class="badge plan">예정</span>':"";
  return `<button class="tile${so?" sold":""}" data-open="${m.id}">${badge}<span class="tno" aria-hidden="true"><span>${m.cat}</span><span>No.${m.id.slice(1).padStart(2,"0")}</span></span><span class="tt" aria-hidden="true">${foodIcon(m)}${ph?`<span class="hasph" title="사진 있음"><svg class="cam" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>`:""}</span><span class="perf" aria-hidden="true"></span><span class="tn">${esc(m.name)}</span><span class="tp">${won(m.price)}</span><span class="tr">${r.n?`<b>${ICON.star}</b> ${r.avg.toFixed(1)} (${r.n})`:"평가 없음"}</span></button>`;
}
function renderMenus(){
  const SORTS={low:["가격 낮은 순",(a,b)=>a.price-b.price],high:["가격 높은 순",(a,b)=>b.price-a.price],star:["별점 순",(a,b)=>{const x=rate(a.id,"all"),y=rate(b.id,"all");return (y.n?1:0)-(x.n?1:0)||y.avg-x.avg||y.n-x.n||a.price-b.price}]};
  $("#sortbar").innerHTML=Object.entries(SORTS).map(([k,[l]])=>`<button data-sort="${k}" aria-pressed="${k===sortBy}">${l}</button>`).join("");
  const sorted=MENUS.filter(m=>m.cat===cat).sort(SORTS[sortBy][1]);
  const list=sorted,on=list.filter(avail),off=list.filter(m=>!avail(m));
  $("#menus").innerHTML=(sortBy==="star"&&!list.some(m=>rate(m.id,"all").n)?`<p class="hint" style="margin:0">아직 별점이 없어서 가격 낮은 순으로 보여요.</p>`:"")+`<div class="grid">${on.map(tile).join("")}</div>`+(off.length?`<div class="divider">품절 ${off.length}개 · 매일 19시에 초기화</div><div class="grid">${off.map(tile).join("")}</div>`:"");
}
// ── 렌더: 메뉴 추천 ──
function renderReco(){
  const g=GOALS[goal],list=g.list(),top=list[0],s=nowSlot();
  $("#reco-slot").textContent=slotUsed(s)?`오늘 ${s}은 이미 체크했어요`:`지금은 ${s} 시간`;
  $("#goals").innerHTML=Object.entries(GOALS).map(([k,v])=>`<button class="goal ${v.cls}" data-goal="${k}" aria-pressed="${k===goal}"><b>${v.label}</b><small>${v.sub}</small></button>`).join("");
  const v=$("#view-reco");v.className="view "+g.cls;
  if(!top){$("#reco-hero").innerHTML=`<div class="empty">지금 추천할 수 있는 메뉴가 없어요</div>`;$("#reco-list").innerHTML="";return}
  const tn=nut(top),isV=goal==="value";
  const nums=isV?`<div><b>${top.off}%</b><span>시중가 대비 할인</span></div><div><b>${won(top.save)}</b><span>아끼는 돈</span></div><div><b>${won(top.price)}</b><span>학식 가격</span></div>`
    :`<div><b>${tn.protein}g</b><span>단백질</span></div><div><b>${tn.kcal}</b><span>kcal</span></div><div><b>${won(top.price)}</b><span>가격</span></div>`;
  const wk=wkKey(),prev=st.rankHist[wkKey(Date.now()-7*DAY)];
  if(isV&&!st.rankHist[wk]){st.rankHist[wk]=list.map(m=>m.id);API.rankHist(wk,st.rankHist[wk]);save()}
  const order=isV?(st.rankHist[wk]||list.map(m=>m.id)).map(byId).filter(m=>m&&avail(m)):list;
  const move=(m,i)=>{if(!prev)return `<span class="mv">NEW</span>`;const j=prev.indexOf(m.id);return j<0?`<span class="mv">NEW</span>`:j>i?`<span class="mv up">${ICON.up}${j-i}</span>`:j<i?`<span class="mv dn">${ICON.down}${i-j}</span>`:`<span class="mv">-</span>`};
  const vote=m=>{const v=votesFor(m.id);return `<div class="vote"><button data-vote="1" data-id="${m.id}" aria-pressed="${v.mine===1}">추천 ${v.up}</button><button data-vote="-1" data-id="${m.id}" aria-pressed="${v.mine===-1}">비추천 ${v.down}</button></div>`};
  if(isV){const ws=kst(weekStart()),we=kst(weekStart()+6*DAY);$("#reco-slot").textContent=`${ws.mo}/${ws.d}~${we.mo}/${we.d} · 매주 월요일 갱신`}
  const t1=isV?order[0]:top;
  $("#reco-hero").innerHTML=`<div class="herowrap"><button class="pickhero" data-open="${t1.id}"><span class="eyebrow">${g.label} 1순위 · ${t1.cat}${isV?" · "+move(t1,0):""}</span><span class="hn">${esc(t1.name)}</span><span class="why">${g.why(t1)}</span>
    <span class="bignums">${isV?`<div><b>${t1.off}%</b><span>시중가 대비 할인</span></div><div><b>${won(t1.save)}</b><span>아끼는 돈</span></div><div><b>${won(t1.price)}</b><span>학식 가격</span></div>`:nums}</span></button>${isV?vote(t1):""}</div>`;
  if(isV){
    const maxM=Math.max(...order.map(m=>m.market));
    $("#reco-sub").textContent="이번 주 가성비 랭킹";
    $("#reco-list").innerHTML=order.slice(1).map((m,i)=>`<div class="vr"><button class="cr" data-open="${m.id}"><span class="n">${i+2}</span><span class="t"><span>${esc(m.name)} ${move(m,i+1)}</span><span>${m.off}% 저렴</span></span>
      <span class="bars"><span>학식</span><i><u style="width:${Math.round(m.price/maxM*100)}%"></u></i><span>${(m.price/1000).toFixed(1)}천</span><span>시중</span><i class="k"><u style="width:${Math.round(m.market/maxM*100)}%"></u></i><span>${(m.market/1000).toFixed(1)}천</span></span></button>${vote(m)}</div>`).join("");
    $("#reco-note").textContent=g.note+" 시중 가격은 추정치예요.";
    return;
  }
  const rest=list.slice(1,8),maxP=Math.max(...list.slice(0,8).map(m=>m.n.protein)),maxK=Math.max(...list.slice(0,8).map(m=>m.n.kcal));
  $("#reco-sub").textContent=`${g.label} 다른 후보`;
  const maxM=Math.max(...list.slice(0,8).map(m=>m.market));
  $("#reco-list").innerHTML=rest.map((m,i)=>`<button class="cr" data-open="${m.id}"><span class="n">${i+2}</span><span class="t"><span>${esc(m.name)}</span><span>${isV?`${m.off}% 저렴`:won(m.price)}</span></span>
    ${isV?`<span class="bars"><span>학식</span><i><u style="width:${Math.round(m.price/maxM*100)}%"></u></i><span>${(m.price/1000).toFixed(1)}천</span><span>시중</span><i class="k"><u style="width:${Math.round(m.market/maxM*100)}%"></u></i><span>${(m.market/1000).toFixed(1)}천</span></span>`
    :`<span class="bars"><span>단백질</span><i><u style="width:${Math.round(m.n.protein/maxP*100)}%"></u></i><span>${m.n.protein}g</span><span>칼로리</span><i class="k"><u style="width:${Math.round(m.n.kcal/maxK*100)}%"></u></i><span>${m.n.kcal}</span></span>`}</button>`).join("");
  $("#reco-note").textContent=g.note+(goal==="value"?" 시중 가격은 추정치예요.":" 영양성분은 추정치예요.");
}
// ── 렌더: 내 입맛 ──
function renderTaste(){
  $("#meals").innerHTML=SLOTS.map(s=>{const x=slotUsed(s),m=x&&byId(x.id);return m?`<div class="meal on"><span class="lb">${s}</span><b>${esc(m.name)}</b><small>${nut(m).kcal}kcal · 단백질 ${nut(m).protein}g</small></div>`:`<div class="meal"><span class="lb">${s}</span><small>아직 안 먹었어요</small></div>`}).join("");
  const ts=tasteScores();
  if(ts.length){
    const max=ts[0][1],top=ts.slice(0,2).map(([t])=>t);
    $("#taste-card").innerHTML=`<div class="taste"><span class="tl">내 입맛 분석</span><span class="tt2">${top.map(t=>`#${t}`).join(" ")} 좋아하는 편</span><div class="tags">${ts.slice(0,5).map(([t,v])=>`<div class="tag"><span>${t}</span><i><u style="width:${Math.round(v/max*100)}%"></u></i><span>${v}</span></div>`).join("")}</div><span class="tl">먹음 체크 1회 = 1점, 별점 4점 = +1, 5점 = +2, 2점 이하는 감점</span></div>`;
  } else $("#taste-card").innerHTML=`<div class="taste"><span class="tl">내 입맛 분석</span><span class="tt2">아직 기록이 없어요</span><span class="tl">메뉴에서 먹음 체크를 하거나, 예전에 먹어 본 메뉴에 별점을 남기면 좋아하는 맛을 분석해 드려요.</span></div>`;
  const wk=st.meals.filter(x=>Date.now()-x.at<7*DAY),wm=wk.map(x=>byId(x.id)).filter(Boolean);
  const kcal=wm.reduce((s,m)=>s+nut(m).kcal,0),pro=wm.reduce((s,m)=>s+nut(m).protein,0);
  $("#week-stats").innerHTML=`<div class="stat"><b>${wm.length}끼</b><span>먹은 끼니</span></div><div class="stat"><b>${won(wm.reduce((s,m)=>s+m.price,0))}</b><span>식비</span></div><div class="stat"><b>${wm.length?Math.round(kcal/wm.length):0}</b><span>한 끼 평균 kcal (추정)</span></div><div class="stat"><b>${wm.length?Math.round(pro/wm.length):0}g</b><span>한 끼 평균 단백질 (추정)</span></div>`;
  if(ts.length){
    const sc=Object.fromEntries(ts),tried=new Set([...st.meals.map(x=>x.id),...Object.keys(st.mine)]);
    const rec=MENUS.filter(m=>avail(m)&&!tried.has(m.id)&&m.price>1000).map(m=>({m,v:m.tags.reduce((s,t)=>s+(sc[t]||0),0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v||rate(b.m.id,"all").avg-rate(a.m.id,"all").avg).slice(0,5);
    $("#taste-reco").innerHTML=rec.length?`<div class="chips">${rec.map(x=>`<button class="chip" data-open="${x.m.id}">${esc(x.m.name)} <small>${x.m.tags.filter(t=>sc[t]).map(t=>"#"+t).join(" ")}</small></button>`).join("")}</div>`:`<div class="empty">비슷한 맛의 메뉴는 다 먹어 봤어요</div>`;
  } else $("#taste-reco").innerHTML=`<div class="empty">입맛 분석이 생기면 안 먹어 본 메뉴 중에서 골라 드려요</div>`;
  const plans=Object.keys(st.plans).map(byId).filter(Boolean);
  $("#plans").innerHTML=plans.length?plans.map(m=>`<button class="chip" data-open="${m.id}">${esc(m.name)}${st.sold[m.id]?" <small>품절 제보됨</small>":""}</button>`).join(""):`<span class="hint">메뉴에서 '먹을래요'를 누르면 여기에 모여요</span>`;
  const hist=st.meals.slice().sort((a,b)=>b.at-a.at).slice(0,20);
  $("#history").innerHTML=hist.length?`<div class="tl2">${hist.map(x=>{const m=byId(x.id);return m?`<button class="ti" data-open="${m.id}"><small>${dayLabel(x.at)} ${x.slot}</small><b>${esc(m.name)}</b><small>${won(m.price)} · ${nut(m).kcal}kcal${st.mine[m.id]?" · "+stars(st.mine[m.id].s):""}</small></button>`:""}).join("")}</div>`:`<div class="empty">먹음 체크한 메뉴가 날짜별로 쌓여요</div>`;
}
// ── 렌더: 랭킹 ──
function renderRank(){
  const sales=MENUS.map(m=>({m,v:weekSales(m.id)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,10),max=sales[0]?sales[0].v:1;
  $("#rank-sales").innerHTML=!sales.length?`<div class="empty">이번 주 먹음 체크가 쌓이면 순위가 생겨요</div>`:sales.map((x,i)=>`<button class="rk" data-open="${x.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(x.m.name)}</b><small>${x.m.cat} · ${won(x.m.price)}</small><span class="bar"><i style="width:${Math.round(x.v/max*100)}%"></i></span></span><span class="v">${x.v}그릇</span></button>`).join("");
  const rs=MENUS.map(m=>({m,r:rate(m.id,rankScope)})).filter(x=>x.r.n>=5).sort((a,b)=>b.r.avg-a.r.avg||b.r.n-a.r.n).slice(0,10);
  $("#rank-star").innerHTML=rs.length?rs.map((x,i)=>`<button class="rk" data-open="${x.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(x.m.name)}</b><small>평가 ${x.r.n}개 · ${x.m.cat}</small></span><span class="v"><span style="color:var(--star)">${ICON.star}</span> ${x.r.avg.toFixed(2)}</span></button>`).join(""):`<div class="empty">아직 순위를 매길 만큼 평가가 없어요</div>`;
  document.querySelectorAll("#rank-seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.rank===rankScope));
  $("#wc-themes").innerHTML=Object.entries(THEMES).map(([k,t])=>`<button class="wct" data-wcstart="${k}"><b>${t.title}</b><small>${t.sub}</small><span>시작하기</span></button>`).join("");
  $("#wc-seg").innerHTML=Object.entries(THEMES).map(([k,t])=>`<button data-wcrank="${k}" aria-pressed="${k===wcTheme}">${t.short}</button>`).join("");
  const ws=Object.entries(wcStats(wcTheme)).map(([id,x])=>({m:byId(id),x,g:x.w+x.l})).filter(r=>r.m&&r.x.w>0).sort((a,b)=>b.x.champ-a.x.champ||b.x.w/b.g-a.x.w/a.g||b.x.w-a.x.w).slice(0,10);
  $("#rank-wc").innerHTML=ws.length?ws.map((r,i)=>`<button class="rk" data-open="${r.m.id}"><span class="n">${i+1}</span><span class="m"><b>${esc(r.m.name)}</b><small>1:1 승률 ${Math.round(r.x.w/r.g*100)}% (${r.x.w}승 ${r.x.l}패)</small></span><span class="v">우승 ${r.x.champ}회</span></button>`).join(""):`<div class="empty">월드컵을 한 판 하면 순위가 생겨요</div>`;
}
// ── 렌더: 상세 ──
function renderDetail(){
  if(!openId)return;const m=byId(openId),ph=st.photos[m.id],rp=recentPhoto(m.id),so=st.sold[m.id],r=rate(m.id,"all"),b=busy[m.id],e=eatenToday(m.id),tm=todayMeals();
  $("#dbar-cat").textContent=`다래락 · ${m.cat}`;
  const hero=ph?`<div class="stamp"><span>${stampOf(ph.at)} 업로드</span>${ph.verified?'<span class="ok">AI 확인됨</span>':'<span>AI 미확인</span>'}</div><img src="${ph.src}" alt="${esc(m.name)} 최근 사진">`
    :`${foodIcon(m,"fi big-ic")}<span class="big">${esc(m.name)}</span>아직 올라온 사진이 없어요<br>먹고 나서 첫 사진을 올려 주세요`;
  let actions="";
  if(e) actions=`<div class="status">오늘 ${e.slot}으로 먹음 체크했어요</div><div class="actions"><button class="btn" data-a="uneat">먹음 체크 취소</button></div>`;
  else if(so) actions=`<div class="actions"><button class="btn" data-a="restock">다시 있어요</button></div>`;
  else if(slotOpen) actions=`<div class="panel"><h4>몇 시 끼니인가요? <small>하루 아침·점심·저녁 최대 3번</small></h4><div class="slotpick">${SLOTS.map(s=>{const u=slotUsed(s),um=u&&byId(u.id);return `<button class="btn${s===nowSlot()&&!u?" primary":""}" data-slot="${s}"${u?" disabled":""}>${s}${u?`<small>${esc(um?um.name:"")}</small>`:""}</button>`}).join("")}</div><button class="btn" data-a="slotcancel">취소</button></div>`;
  else if(tm.length>=3) actions=`<div class="status bad">오늘은 아침·점심·저녁 먹음 체크를 모두 했어요</div>${st.plans[m.id]?"":`<div class="actions"><button class="btn ticket" data-a="pick">먹을래요</button></div>`}`;
  else actions=`<div class="actions">${st.plans[m.id]?`<button class="btn" data-a="unpick">예정 취소</button>`:`<button class="btn ticket" data-a="pick">먹을래요</button>`}<button class="btn primary" data-a="eat">먹음 체크<small>오늘 ${tm.length}/3</small></button></div>`;
  const photoBtn=!e?`<button class="btn" disabled>메뉴 사진 올리기<small>먹음 체크 후 가능</small></button>`:rp?`<button class="btn" disabled>최근 사진이 있어요 (${ago(rp.at)})</button>`
    :`<label class="btn">${b==="photo"?"AI가 확인 중…":"메뉴 사진 올리기"}<input type="file" accept="image/*" data-a="photo"${b?" disabled":""}></label>`;
  const soldBtn=so?"":`<label class="btn warn">${b==="sold"?"AI가 확인 중…":"품절 제보 (사진 필요)"}<input type="file" accept="image/*" data-a="soldphoto"${b?" disabled":""}></label>`;
  const nb=n=>`<div><b>${n.kcal}</b><span>kcal</span></div><div><b>${n.protein}g</b><span>단백질</span></div><div><b>${n.carbs}g</b><span>탄수화물</span></div><div><b>${n.sugar}g</b><span>당</span></div>`;
  const mineR=st.mine[m.id];
  const rvs=[...(mineR?[{s:mineR.s,t:mineR.t,f:mineR.f,who:"나",at:mineR.at,v:mineR.verified}]:[]),...(SEED_RV[m.id]||[]).map(x=>({...x,at:Date.now()-x.d*DAY}))];
  $("#detail-body").innerHTML=`<div class="${so?"sold":""}" style="display:flex;flex-direction:column;gap:16px">
    <div class="hero">${hero}</div>
    <div class="dname"><h3>${esc(m.name)}</h3><span class="price">${won(m.price)}</span></div>
    ${m.off>0?`<div class="meta">밖에서 사 먹으면 약 ${won(m.market)} · <span class="pill ok">${m.off}% 저렴</span></div>`:""}
    <div class="meta">${so?`<span class="pill sold">품절 · ${ago(so.at)} ${esc(so.who)} 제보${so.verified?" · 사진 확인됨":""}</span>`:""}${r.n?`<span class="s">${stars(Math.round(r.avg))}</span> ${r.avg.toFixed(1)} · 평가 ${r.n}개`:"아직 평가가 없어요"} · 이번 주 ${weekSales(m.id)}그릇 · ${m.tags.map(t=>"#"+t).join(" ")}</div>
    ${so&&so.proof?`<div class="proof"><img src="${so.proof}" alt="품절 제보 사진"><span>제보 사진 · ${esc(so.reason||"")}</span></div>`:""}
    ${b?`<div class="status">AI가 사진을 확인하고 있어요…</div>`:""}
    ${lastMsg&&lastMsg.id===m.id?`<div class="status ${lastMsg.bad?"bad":""}">${esc(lastMsg.text)}</div>`:""}
    ${actions}
    <div class="actions">${photoBtn}${soldBtn}</div>
    <span class="hint" style="margin-top:-8px">품절 표시는 사진으로 확인된 제보만 올라가고, 매일 19시에 초기화돼요.</span>
    <div class="panel"><h4>1인분 영양성분 <small>메뉴 이름 기준 추정</small></h4><div class="nutri">${nb(m.n)}</div>
      ${ph&&ph.nutrition?`<span class="nrow">최근 사진 기준 (${esc(ph.portion||"보통")} 양): ${ph.nutrition.kcal}kcal · 단백질 ${ph.nutrition.protein}g · 탄수화물 ${ph.nutrition.carbs}g · 당 ${ph.nutrition.sugar}g</span>`:`<span class="nrow">사진이 올라오면 AI가 실제 양을 보고 다시 추정해요.</span>`}</div>
    ${AI_LINE[m.id]?`<div class="panel ai"><em>AI 한줄평</em>${AI_LINE[m.id]}</div>`:""}
    <div class="panel"><h4>${mineR?"내 평가 수정":"별점과 코멘트 남기기"} <small>${e?"오늘 먹음 체크해서 '먹음 인증'으로 표시돼요":"전에 먹어 본 기억으로도 남길 수 있어요"}</small></h4>
      <div class="stars">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" class="${n<=draft.s?"on":""}" aria-label="${n}점">${ICON.star}</button>`).join("")}</div>
      <span class="hint">별점만 골라도 등록할 수 있어요. 아래는 모두 선택이에요.</span>
      ${QUICK.filter(q=>!q.only||q.only(m)).map(q=>`<div class="qrow"><span class="ql">${q.label}</span><div class="qopts">${(q.optsFor?q.optsFor(m):q.opts).map(o=>`<button type="button" data-q="${q.k}" data-qv="${o}" aria-pressed="${draft.f[q.k]===o}">${o}</button>`).join("")}</div></div>`).join("")}
      <label for="rv-text" class="hint">한 줄 코멘트 (선택)</label>
      <textarea id="rv-text" placeholder="예) 양 많고 고기 넉넉함. 국은 조금 짜요">${esc(draft.t)}</textarea>
      <button class="btn primary" data-a="submit">${mineR?"수정하기":"등록하기"}</button></div>
    <div class="panel"><h4>후기 ${Math.max(rvs.length,r.n)}개${r.n>rvs.length?` <small>최근 ${rvs.length}개 표시</small>`:""}</h4>${rvs.length?`<div class="reviews">${rvs.map(x=>`<div class="rv"><span class="s">${stars(x.s)}</span>${x.t?`<span>${esc(x.t)}</span>`:""}${fText(x.f)?`<span class="qsum">${esc(fText(x.f))}</span>`:""}<small>${esc(x.who)} · ${ago(x.at)}${x.v?' · <span class="pill ok">먹음 인증</span>':""}</small></div>`).join("")}</div>`:`<span class="hint">첫 후기를 남겨 주세요</span>`}</div>
  </div>`;
}
function openDetail(id){openId=id;slotOpen=false;const mine=st.mine[id];draft={s:mine?mine.s:0,t:mine?mine.t:"",f:Object.assign({},mine&&mine.f||{},mine&&mine.portion&&!(mine.f&&mine.f.portion)?{portion:mine.portion}:{})};if(lastMsg&&lastMsg.id!==id)lastMsg=null;renderDetail();const dl=$("#detail");if(!dl.open)dl.showModal();dl.scrollTop=0}
