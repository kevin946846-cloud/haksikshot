// 버튼·탭 이벤트 연결, 첫 렌더
// ── 이벤트 ──
$("#detail-close").addEventListener("click",()=>$("#detail").close());
$("#detail").addEventListener("close",()=>{openId=null});
$("#detail").addEventListener("input",e=>{if(e.target.id==="rv-text")draft.t=e.target.value});
document.addEventListener("click",e=>{
  const wst=e.target.closest("[data-wcstart]");if(wst){startWC(wst.dataset.wcstart||"fav");return}
  if(e.target.closest(".wcsplash")&&wc){wc.splash=false;renderWC();return}
  const wr=e.target.closest("[data-wcrank]");if(wr){wcTheme=wr.dataset.wcrank;renderRank();return}
  if(e.target.closest("[data-wcclose]")){$("#wc").close();return}
  const wp=e.target.closest("[data-wcpick]");if(wp&&wc&&!wc.champ){pickWC(+wp.dataset.wcpick);return}
  const op=e.target.closest("#wc [data-open]");if(op){$("#wc").close();openDetail(op.dataset.open);return}
  const o=e.target.closest("[data-open]");if(o){openDetail(o.dataset.open);return}
  const c=e.target.closest("[data-c]");if(c){cat=c.dataset.c;render();return}
  const so=e.target.closest("[data-sort]");if(so){sortBy=so.dataset.sort;renderMenus();return}
  const g=e.target.closest("[data-goal]");if(g){goal=g.dataset.goal;renderReco();return}
  const rk=e.target.closest("[data-rank]");if(rk){rankScope=rk.dataset.rank;renderRank();return}
  const v=e.target.closest("[data-view]");if(v){show(v.dataset.view);return}
  const s=e.target.closest("[data-star]");if(s){draft.s=+s.dataset.star;renderDetail();return}
  const qb=e.target.closest("[data-q]");if(qb){const k=qb.dataset.q,v=qb.dataset.qv;if(draft.f[k]===v)delete draft.f[k];else draft.f[k]=v;renderDetail();return}
  const vt=e.target.closest("[data-vote]");if(vt){const k=wkKey()+"|"+vt.dataset.id,v=+vt.dataset.vote;if(st.votes[k]===v)delete st.votes[k];else st.votes[k]=v;API.vote(k,st.votes[k]);save();renderReco();toast(st.votes[k]?(v>0?"추천했어요":"비추천했어요")+". 다음 주 랭킹에 반영돼요":"투표를 취소했어요");return}
  const sl=e.target.closest("[data-slot]");if(sl&&openId){
    if(todayMeals().length>=3||slotUsed(sl.dataset.slot)){toast("이미 체크한 끼니예요");return}
    st.meals.push({id:openId,slot:sl.dataset.slot,at:Date.now()});API.eat(openId,sl.dataset.slot);delete st.plans[openId];slotOpen=false;
    if(st.mine[openId])st.mine[openId].verified=true;
    toast(`${sl.dataset.slot} 먹음 체크 완료. 사진도 올릴 수 있어요`);save();render();return}
  const b=e.target.closest("button[data-a]");if(!b||!openId)return;const id=openId,a=b.dataset.a;
  if(a==="eat"){slotOpen=true;renderDetail();return}
  if(a==="slotcancel"){slotOpen=false;renderDetail();return}
  if(a==="pick"){st.plans[id]=Date.now();toast("먹을 예정에 담았어요")}
  if(a==="unpick"){delete st.plans[id];toast("예정을 취소했어요")}
  if(a==="uneat"){const x=eatenToday(id);st.meals=st.meals.filter(y=>y!==x);API.uneat(id);if(st.mine[id])st.mine[id].verified=false;toast("먹음 체크를 취소했어요")}
  if(a==="restock"){delete st.sold[id];API.restock(id);toast("다시 있음으로 바꿨어요")}
  if(a==="submit"){if(!draft.s){toast("별점을 골라 주세요");return}st.mine[id]={s:draft.s,t:draft.t.trim(),f:{...draft.f},at:Date.now(),verified:!!eatenToday(id)};API.review(id,st.mine[id]);toast("평가를 등록했어요")}
  save();render();
});
document.addEventListener("change",async e=>{
  const inp=e.target;if(!openId||!inp.files||!inp.files[0])return;const file=inp.files[0],id=openId,m=byId(id),a=inp.dataset.a;
  if(a!=="photo"&&a!=="soldphoto")return;
  busy[id]=a==="photo"?"photo":"sold";lastMsg=null;renderDetail();
  try{
    const src=await shrink(file);
    if(a==="photo"){
      const r=await aiCheckFood(file,m);
      if(r.skipped){st.photos[id]={src,at:Date.now(),verified:false};lastMsg={id,text:"지금은 AI 확인이 어려워 미확인 사진으로 올렸어요."}}
      else if(r.match===true){
        const n=r.nutrition&&typeof r.nutrition.kcal==="number"?{kcal:Math.round(r.nutrition.kcal),protein:Math.round(r.nutrition.protein||0),carbs:Math.round(r.nutrition.carbs||0),sugar:Math.round(r.nutrition.sugar||0)}:null;
        st.photos[id]={src,at:Date.now(),verified:true,nutrition:n,portion:r.portion};lastMsg={id,text:"사진이 등록됐어요. "+(r.reason||"")};
      } else lastMsg={id,bad:true,text:`등록할 수 없어요. ${r.reason||m.name+" 사진이 아닌 것 같아요."}`};
    } else {
      const r=await aiCheckSold(file,m);
      if(r.skipped){st.sold[id]={at:Date.now(),who:"나",verified:false,proof:src,reason:"AI 미확인"};lastMsg={id,text:"이 화면에서는 AI 확인을 쓸 수 없어 미확인 제보로 등록했어요."}}
      else if(r.ok===true){st.sold[id]={at:Date.now(),who:"나",verified:true,proof:src,reason:r.reason||""};lastMsg={id,text:"품절 제보가 확인됐어요."}}
      else lastMsg={id,bad:true,text:`품절을 확인할 수 없어요. ${r.reason||"키오스크에서 이 메뉴의 품절 표시가 보이게 찍어 주세요."}`};
    }
  }catch(err){
    // AI 확인을 못 해도 사진은 '미확인'으로 올림 (거절된 경우만 제외)
    if(err&&err.code==="image_rejected"){lastMsg={id,bad:true,text:aiErr(err)}}
    else{
      try{const src=await shrink(file);
        if(a==="photo"){st.photos[id]={src,at:Date.now(),verified:false};lastMsg={id,text:"AI 확인 없이 미확인 사진으로 올렸어요. ("+aiErr(err)+")"}}
        else{st.sold[id]={at:Date.now(),who:"나",verified:false,proof:src,reason:"AI 미확인"};lastMsg={id,text:"AI 확인 없이 미확인 제보로 등록했어요. ("+aiErr(err)+")"}}
      }catch(e2){lastMsg={id,bad:true,text:"사진을 읽지 못했어요. 다른 사진을 골라 주세요"}}
    }
  }
  delete busy[id];inp.value="";save();render();
});
function show(v){
  ["menu","reco","taste","rank"].forEach(k=>$("#view-"+k).hidden=k!==v);
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.view===v));
  window.scrollTo(0,0);
}
save();render();
