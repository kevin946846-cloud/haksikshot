// 학식 이상형 월드컵
// ── 학식 이상형 월드컵 ──
let wc=null,wcTheme="fav";
const THEMES={
 fav:{short:["최애","Favorite"],title:["나의 최애 메뉴는?","What's my favorite?"],sub:["그냥 제일 좋아하는 메뉴","The menu you simply love most"],q:["둘 중 더 좋아하는 메뉴는?","Which one do you like more?"],win:["나의 최애 메뉴","My favorite menu"]},
 lunch:{short:["평생 점심","Lunch forever"],title:["평생 점심 메뉴 하나만 고른다면?","One lunch for the rest of your life?"],sub:["졸업할 때까지 매일 이것만","Only this, every day until graduation"],q:["앞으로 매일 점심으로 이것만 먹어야 한다면?","If you had to eat only this for lunch every day?"],win:["나의 평생 점심 메뉴","My lunch forever"]},
 fresh:{short:["신입생 추천","For freshmen"],title:["신입생에게 딱 하나 추천한다면?","One pick for a freshman?"],sub:["다래락 처음 온 후배에게","For someone new to Daraerak"],q:["다래락에 처음 온 신입생에게 추천할 메뉴는?","Which would you recommend to a first-timer?"],win:["내가 추천하는 신입생 메뉴","My pick for freshmen"]},
 hungry:{short:["배고플 때","Starving"],title:["너무 배고플 때 먹을 메뉴 하나!","One menu when you're starving!"],sub:["4연강 끝나고 쓰러지기 직전","After four classes in a row"],q:["배고파 쓰러지기 직전, 딱 하나만 먹을 수 있다면?","About to faint from hunger — which one?"],win:["배고플 때 나를 살린 메뉴","The menu that saved me"]}
};
if(!st.wcReset2){st.wc={byTheme:{},history:[]};st.wcReset2=true}
const wcStats=t=>(st.wc.byTheme[t]=st.wc.byTheme[t]||{});
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const roundName=n=>n===2?L("결승","Final"):L(n+"강","Round of "+n);
function startWC(theme){wc={theme,round:shuffle(MENUS.filter(m=>m.price>1000).map(m=>m.id)).slice(0,16),next:[],i:0,champ:null,log:[]};showSplash();renderWC();const d=$("#wc");if(!d.open)d.showModal()}
function wcCard(id,k){const m=byId(id),ph=st.photos[id],r=rate(id,"all");
  return `<button class="wcc" data-wcpick="${k}"><span class="wci">${foodIcon(m)}</span><b>${mnameHtml(m)}</b><small>${won(m.price)} · ${tr(m.cat)}</small><small>${m.tags.map(t=>"#"+tr(t)).join(" ")}</small>${r.n?`<small>${ICON.star} ${r.avg.toFixed(1)}</small>`:""}</button>`}
function renderWC(){
  if(!wc)return;
  const T=THEMES[wc.theme];
  if(wc.champ){const m=byId(wc.champ),sc=wcStats(wc.theme)[m.id]||{};
    $("#wc-round").textContent=L("우승","Winner");
    $("#wc-body").innerHTML=`<div class="wcwin"><span class="eyebrow2">${L(...T.win)}</span><span class="wcwn">${mnameHtml(m)}</span><span>${won(m.price)} · ${m.tags.map(t=>"#"+tr(t)).join(" ")}</span><span class="hint">${L(`「${T.title[0]}」 누적 우승 ${sc.champ||0}회`,`"${T.title[1]}" — ${sc.champ||0} total wins`)}</span>
      <div class="actions"><button class="btn primary" data-open="${m.id}">${L("메뉴 보기","View menu")}</button><button class="btn" data-wcstart="${wc.theme}">${L("다시 하기","Play again")}</button></div></div>`;return}
  const n=wc.round.length,a=wc.round[wc.i],b=wc.round[wc.i+1];
  $("#wc-round").textContent=L(...T.title);
  const steps=[16,8,4,2].map(r=>`<span class="${r===n?"now":r>n?"done":""}">${roundName(r)}</span>`).join("");
  if(wc.splash){
    $("#wc-body").innerHTML=`<div class="wcsplash" data-r="${n}"><span class="wcsteps">${steps}</span><span class="sbig">${roundName(n)}</span><span class="ssub">${L(...({16:["다래락 대표 16개 메뉴 입장!","16 Daraerak favorites enter!"],8:["8개 메뉴가 살아남았어요","8 menus survived"],4:["준결승! 이제 4개뿐이에요","Semifinal! Only 4 left"],2:["결승전! 최후의 한 그릇은?","The final! Which bowl wins?"]})[n])}</span><div class="wcleft">${wc.round.map(id=>`<span>${esc(mname(byId(id)))}</span>`).join("")}</div></div>`;
    return;
  }
  $("#wc-body").innerHTML=`<div class="wchead" data-r="${n}"><span class="wcsteps">${steps}</span><span class="wcbig">${roundName(n)}</span>${n===2?`<span class="wccount">${L("마지막 대결","Final match")}</span>`:`<span class="wcdots" aria-label="${L(`${n/2}경기 중 ${wc.i/2+1}번째`,`Match ${wc.i/2+1} of ${n/2}`)}">${Array.from({length:n/2},(_,j)=>`<i class="${j<wc.i/2?"d":j===wc.i/2?"c":""}"></i>`).join("")}</span>`}</div><p class="wcq">${L(...T.q)}</p><div class="wcpair">${wcCard(a,0)}<span class="vs">VS</span>${wcCard(b,1)}</div><div class="wcprog"><i style="width:${Math.round(({16:0,8:8,4:12,2:14}[n]+wc.i/2)/15*100)}%"></i></div>`;
}
function showSplash(){wc.splash=true;const me=wc;clearTimeout(showSplash.t);showSplash.t=setTimeout(()=>{if(wc===me){wc.splash=false;renderWC()}},1600)}
function pickWC(k){if(wc.splash)return;
  const w=wc.round[wc.i+k],l=wc.round[wc.i+1-k];
  wc.log.push([w,l]);wc.next.push(w);wc.i+=2;
  if(wc.i>=wc.round.length){
    if(wc.next.length===1){
      // 결승까지 끝낸 판만 기록에 남김
      const S=wcStats(wc.theme);
      wc.log.forEach(([a,b])=>{S[a]=S[a]||{w:0,l:0,champ:0};S[b]=S[b]||{w:0,l:0,champ:0};S[a].w++;S[b].l++});
      wc.champ=w;S[w].champ++;st.wc.history.push({at:Date.now(),winner:w,theme:wc.theme});API.wc(wc.theme,w,wc.log);save();renderRank();
    } else {wc.round=wc.next;wc.next=[];wc.i=0;showSplash()}
  }
  renderWC();
}
function render(){purgeSold();renderToday();renderIntro();renderSlotbar();renderCats();renderMenus();renderReco();renderTaste();renderRank();renderDetail()}

