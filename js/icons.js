// 메뉴 아이콘 (SVG, 48×48, 45도 위에서 내려다본 구도, 색은 currentColor → 다크 모드 자동)
// 그릇(뚝배기·면 그릇·접시·철판·공기) + 그 위 내용물로 메뉴 43개를 모두 다르게 그림
// 카드에는 아이콘, 사진은 카드를 눌러 상세에서 봄
const REST_SVG = (() => {
  const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const T = 'fill="currentColor" opacity=".16" stroke="none"';
  const D = 'fill="currentColor" stroke="none"';
  const B = 'fill="currentColor" opacity=".3" stroke="none"';
  const W = 'fill="var(--tofu,#fff)"';   // 흰 재료 (계란 흰자, 밥, 떡)
  const steamUp=`<path d="M17 8c-1.4-1.6 1.4-2.6 0-4.2M24 7c-1.4-1.6 1.4-2.6 0-4.2M31 8c-1.4-1.6 1.4-2.6 0-4.2" stroke-width="1.8"/>`;
  // 면 그릇: 넓고 얕은 그릇, 입구 안을 잘라 내용물
  const bowl=(inner,{steam=true,broth=true,id="bw"}={})=>`<g ${S}>
  <path ${T} d="M4 19c1 12 9 20 20 20s19-8 20-20z"/><path d="M4 19c1 12 9 20 20 20s19-8 20-20"/>
  <path d="M17 41.6h14"/>
  <ellipse cx="24" cy="19" rx="20" ry="8.6"/>
  <ellipse ${broth?B:T} cx="24" cy="19.4" rx="17.4" ry="7"/>
  <clipPath id="${id}"><ellipse cx="24" cy="19.4" rx="18" ry="7.6"/></clipPath><g clip-path="url(#${id})">${inner}</g>
  ${steam?steamUp:""}</g>`;
  // 접시: 넓은 타원 접시, 내용물은 위에 올라감 (자르지 않음)
  const plate=(inner,{handle=false,steam=false}={})=>`<g ${S} transform="translate(24 ${handle ? 23 : 22}) scale(${handle ? 1 : 1.08}) translate(-24 -27)">
  ${handle?`<path d="M42 26l5-3"/>`:""}
  <path ${T} d="M3 27c0 5.5 9.4 10 21 10s21-4.5 21-10z"/><path d="M3 27v1.4c0 5.5 9.4 10 21 10s21-4.5 21-10V27"/>
  <ellipse ${handle?B:'fill="var(--surface,#fff)"'} cx="24" cy="27" rx="21" ry="9.6"/><ellipse cx="24" cy="27" rx="21" ry="9.6"/>
  ${handle?"":`<ellipse cx="24" cy="27.4" rx="15" ry="6.3" opacity=".45"/>`}
  ${inner}${steam?`<path d="M18 13c-1.4-1.6 1.4-2.6 0-4.2M25 12c-1.4-1.6 1.4-2.6 0-4.2M32 13c-1.4-1.6 1.4-2.6 0-4.2" stroke-width="1.8"/>`:""}</g>`;
  // 공기밥: 작은 공기 + 봉긋한 밥
  const gonggi=(x=24,y=24,s=1)=>`<g transform="translate(${x} ${y}) scale(${s}) translate(-24 -24)"><path ${T} d="M10 22c0 9 6 16 14 16s14-7 14-16z"/><path d="M10 22c0 9 6 16 14 16s14-7 14-16"/><path d="M19 40.5h10"/><path ${W} d="M11 22c1-5 6-8 13-8s12 3 13 8c-3 3-8 4-13 4s-10-1-13-4z"/><path d="M11 22c1-5 6-8 13-8s12 3 13 8c-3 3-8 4-13 4s-10-1-13-4z"/><path d="M19 18.5h.01M24 17h.01M29 18.5h.01" stroke-width="2.6"/></g>`;
  // ── 재료 조각 ──
  const noodles=(y0=14,n=5,amp=1.6)=>Array.from({length:n},(_,i)=>{const y=y0+i*2.6;return `<path d="M4 ${y}c3-${amp} 5 ${amp} 8 0s5 ${amp} 8 0 5 ${amp} 8 0 5 ${amp} 8 0 5 ${amp} 8 0 5 ${amp} 8 0" stroke-width="1.5" opacity=".55"/>`}).join("");
  const thick=(y0=15,n=4)=>Array.from({length:n},(_,i)=>{const y=y0+i*3.2;return `<path d="M4 ${y}c4-2.4 8 2.4 12 0s8 2.4 12 0 8 2.4 12 0 8 2.4 12 0" stroke-width="2.6" opacity=".55"/>`}).join("");
  const sc=(pts)=>pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" stroke-width="1.3"/>`).join("");   // 파
  const eggHalf=(x,y)=>`<ellipse ${W} cx="${x}" cy="${y}" rx="4.2" ry="3"/><ellipse cx="${x}" cy="${y}" rx="4.2" ry="3"/><circle ${D} opacity=".7" cx="${x}" cy="${y}" r="1.6"/>`;
  const friedEgg=(x,y)=>`<path ${W} d="M${x-6} ${y}c-1-3 2-5 5-4 2-2 6-1 7 1 2 1 2 4 0 5-2 2-5 2-7 1-2 1-5 0-5-3z"/><path d="M${x-6} ${y}c-1-3 2-5 5-4 2-2 6-1 7 1 2 1 2 4 0 5-2 2-5 2-7 1-2 1-5 0-5-3z"/><ellipse ${D} opacity=".75" cx="${x}" cy="${y}" rx="2.4" ry="1.8"/>`;
  const cheese=(x,y)=>`<path ${D} opacity=".38" d="M${x-4} ${y-3}h8l1 4c-1 2-2 0-3 1s-1 3-3 2-1-2-3-1-1-2-1-2z"/><path d="M${x-4} ${y-3}h8l1 4c-1 2-2 0-3 1s-1 3-3 2-1-2-3-1-1-2-1-2z"/>`;
  const ice=(x,y)=>`<rect ${W} x="${x-2.4}" y="${y-2.4}" width="4.8" height="4.8" rx="1" transform="rotate(15 ${x} ${y})"/><rect x="${x-2.4}" y="${y-2.4}" width="4.8" height="4.8" rx="1" transform="rotate(15 ${x} ${y})"/>`;
  const redSauce=(x,y,rx=6,ry=3.2)=>`<ellipse ${D} opacity=".55" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
  const strips=(x,y,n=3,len=5,ang=-10)=>Array.from({length:n},(_,i)=>`<path d="M${x} ${y+i*1.8}h${len}" stroke-width="1.4" transform="rotate(${ang} ${x} ${y})"/>`).join("");
  const tteok=(x,y,r=0)=>`<rect ${W} x="${x-4}" y="${y-1.6}" width="8" height="3.2" rx="1.6" transform="rotate(${r} ${x} ${y})"/><rect x="${x-4}" y="${y-1.6}" width="8" height="3.2" rx="1.6" transform="rotate(${r} ${x} ${y})"/>`;
  const dumpling=(x,y)=>`<path ${W} d="M${x-5} ${y+1}c0-4 2-6 5-6s5 2 5 6z"/><path d="M${x-5} ${y+1}c0-4 2-6 5-6s5 2 5 6z"/><path d="M${x-2} ${y-4.4}l.6 1.6M${x} ${y-5}v1.8M${x+2} ${y-4.4}l-.6 1.6" stroke-width="1.2"/>`;
  const ttokOval=(x,y,r=0)=>`<ellipse ${W} cx="${x}" cy="${y}" rx="3.6" ry="2" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="3.6" ry="2" transform="rotate(${r} ${x} ${y})"/>`;
  const kimbapSlice=(x,y,fill)=>`<ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.6"/><ellipse ${W} cx="${x}" cy="${y}" rx="3.2" ry="2.4"/>${fill(x,y)}`;
  const KB={
    plain:(x,y)=>`<circle ${D} cx="${x-1}" cy="${y-.4}" r=".7"/><circle ${D} opacity=".6" cx="${x+1}" cy="${y+.4}" r=".7"/><circle ${D} opacity=".35" cx="${x}" cy="${y+1}" r=".6"/>`,
    tuna:(x,y)=>`<ellipse ${D} opacity=".45" cx="${x}" cy="${y}" rx="1.8" ry="1.2"/>`,
    katsu:(x,y)=>`<rect ${D} opacity=".55" x="${x-1.8}" y="${y-1}" width="3.6" height="2" rx=".5"/>`,
    spam:(x,y)=>`<rect ${D} opacity=".7" x="${x-1.6}" y="${y-1.2}" width="3.2" height="2.4" rx=".3"/>`,
  };
  const cutletSlices=(x0,y0,n=4,top="")=>Array.from({length:n},(_,i)=>{const x=x0+i*5.2;return `<path ${T} d="M${x} ${y0+5}l3-9h5l-3 9z"/><path d="M${x} ${y0+5}l3-9h5l-3 9z"/><path d="M${x+2} ${y0+1}h1.4M${x+3.4} ${y0-2}h1.4" stroke-width="1.2"/>`}).join("")+top;
  const cabbage=(x,y)=>`<path d="M${x-4} ${y}c1-3 3-2 4-4 1 2 3 1 4 4-2 2-6 2-8 0z" stroke-width="1.6"/><path d="M${x-2} ${y-1}l2-2M${x+1} ${y-.4}l1-2" stroke-width="1.2"/>`;
  const omelet=(x,y,sauce)=>`<path ${D} opacity=".32" d="M${x-11} ${y+2}c0-6 5-10 11-10s11 4 11 10c0 2-2 3-4 3H${x-7}c-2 0-4-1-4-3z"/><path d="M${x-11} ${y+2}c0-6 5-10 11-10s11 4 11 10c0 2-2 3-4 3H${x-7}c-2 0-4-1-4-3z"/>${sauce}`;
  return {
    // ── 면 ──
    ramen: bowl(`${noodles(13,5)}${friedEgg(18,18)}${sc([[30,16],[33,21],[27,22]])}`,{id:"r1"}),
    ramen_rice: `<g transform="translate(-1 1) scale(.86)">${bowl(`${noodles(13,5)}${sc([[20,16],[28,20],[24,22]])}`,{id:"r2"})}</g><g ${S}>${gonggi(36.5,33,.44)}</g>`,
    cheese_ramen: bowl(`${noodles(13,5)}${cheese(22,18)}${sc([[31,16],[16,21],[33,21]])}`,{id:"r3"}),
    udon_eomuk: bowl(`${thick(14,4)}<path ${W} d="M25 14h9l-1 7h-9z"/><path d="M25 14h9l-1 7h-9z"/><path d="M26 16.4h7M25.6 18.6h7" stroke-width="1.1"/>${sc([[16,17],[19,22]])}`,{id:"u1"}),
    udon_shrimp: bowl(`${thick(14,4)}<path ${D} opacity=".45" d="M14 21c2-6 9-9 17-7l1 2c-6 0-11 2-14 7z"/><path d="M14 21c2-6 9-9 17-7l1 2c-6 0-11 2-14 7z"/><path d="M31 14l4-2M32 16l4 0" stroke-width="1.4"/><path d="M18 18l1 1M22 16l1 1M26 15l1 1" stroke-width="1.2"/>${sc([[33,21],[12,17]])}`,{id:"u2"}),
    janchi: bowl(`${noodles(13,5,1.1)}${strips(13,15,3,8,-8)}${strips(28,16,3,7,8)}${sc([[23,22],[20,14]])}`,{id:"j1"}),
    kalguksu: bowl(`${thick(14,4)}<path d="M15 16a3.4 3.4 0 0 0 6 1.8z" ${W}/><path d="M15 16a3.4 3.4 0 0 0 6 1.8z"/><path d="M27 19a3.4 3.4 0 0 0 6 1.8z" ${W}/><path d="M27 19a3.4 3.4 0 0 0 6 1.8z"/><path d="M29 13.4c2-1 4 0 4 1.6M18 21.6c2-1 4 0 4 1.6" stroke-width="1.4"/>`,{id:"k1"}),
    naengmyeon: bowl(`${noodles(15,4,1.1)}${eggHalf(24,17)}${ice(14,19)}${ice(33,20)}${strips(28,13,3,5,20)}`,{id:"n1",steam:false}),
    bibim_naeng: bowl(`${noodles(15,4,1.1)}${redSauce(23,19,7,3.6)}${eggHalf(24,15.6)}${strips(31,17,3,5,20)}${ice(13,20)}`,{id:"n2",steam:false}),
    jjolmyeon: bowl(`${noodles(14,5,1.8)}${redSauce(21,19,6,3)}${eggHalf(30,17)}<path d="M12 15l4 2M13 13l3 3M34 21l3-2" stroke-width="1.4"/>`,{id:"z1",steam:false,broth:false}),
    memil: bowl(`${noodles(14,5,.9)}<path d="M18 14l12 3M17 16.5l12 3M19 19l10 2.4" stroke-width="1.4"/>${sc([[14,20],[33,16]])}<path ${D} d="M24 13.4h.01M27 15h.01M21 15.6h.01" stroke-width="2.4"/>`,{id:"m1",steam:false,broth:false}),
    jjagyechi: bowl(`${noodles(14,5)}<path ${D} opacity=".5" d="M8 22c3-2 8-2 12 0" />${friedEgg(25,17)}${cheese(15,15)}`,{id:"c1",steam:true,broth:false}),
    // ── 국 (넓은 그릇) ──
    mandu: bowl(`${dumpling(17,19)}${dumpling(27,17)}${dumpling(30,23)}${strips(19,22,2,5,-5)}${sc([[13,16],[22,14]])}`,{id:"d1"}),
    tteokguk: bowl(`${ttokOval(15,17,-10)}${ttokOval(22,20,8)}${ttokOval(30,17,-4)}${ttokOval(27,23,12)}${ttokOval(18,23.6,0)}${strips(21,13.4,2,6,0)}<path d="M33 21l3-1" stroke-width="1.4"/>`,{id:"t1"}),
    // ── 밥 ──
    gonggi: `<g ${S}>${gonggi(24,24,1.05)}</g>`,
    mayo_don: bowl(`<rect ${W} x="0" y="10" width="48" height="20"/><path d="M8 17h.01M12 22h.01M36 15h.01M38 21h.01" stroke-width="2.4"/>${[[18,17,-10],[26,19,12],[22,22,0],[30,15,-6]].map(([x,y,r])=>`<rect ${D} opacity=".45" x="${x-3.4}" y="${y-2}" width="6.8" height="4" rx="1.4" transform="rotate(${r} ${x} ${y})"/>`).join("")}<path d="M13 15c2 2 3-2 5 0s3-2 5 0 3-2 5 0 3-2 5 0 3-2 5 0" stroke-width="1.4"/>${sc([[33,22],[14,21]])}`,{id:"md",steam:false,broth:false}),
    teri_rice: plate(`<path ${W} d="M10 26c1-5 7-8 14-8s13 3 14 8c-3 3-8 4-14 4s-11-1-14-4z"/><path d="M10 26c1-5 7-8 14-8s13 3 14 8c-3 3-8 4-14 4s-11-1-14-4z"/>${[[15,24],[19,21],[23,25],[28,22],[32,25],[26,19],[20,26.6]].map(([x,y])=>`<circle ${D} opacity=".55" cx="${x}" cy="${y}" r=".9"/>`).join("")}${[[19,23.6,-8],[28,24.6,10]].map(([x,y,r])=>`<rect ${D} opacity=".55" x="${x-3}" y="${y-1.8}" width="6" height="3.6" rx="1.4" transform="rotate(${r} ${x} ${y})"/>`).join("")}${sc([[24,21.6],[33,22.6]])}`),
    // ── 접시 요리 ──
    katsu: plate(`${cutletSlices(10,23,4)}${cabbage(36,27)}`),
    goguma_katsu: plate(`${cutletSlices(10,23,3)}<path ${D} opacity=".35" d="M14 28c2 2 5 2 7 1s4 1 5 0" stroke-width="1"/><path d="M13 28c2 2 4 1 6 2s4-1 6 0" stroke-width="1.6"/><ellipse ${D} opacity=".4" cx="34" cy="26" rx="4.6" ry="3"/><ellipse cx="34" cy="26" rx="4.6" ry="3"/>`),
    moksal: plate(`<path ${D} opacity=".38" d="M10 26c0-5 6-7 12-7s11 2 11 6-5 7-12 7-11-3-11-6z"/><path d="M10 26c0-5 6-7 12-7s11 2 11 6-5 7-12 7-11-3-11-6z"/><path d="M15 22l9 7M19 21l9 7M23 20.4l8 6.4" stroke-width="1.4"/><path d="M36 23l2 6M39 22.4l1.6 6" stroke-width="1.6"/>`),
    hamburg: plate(`<ellipse ${D} opacity=".55" cx="21" cy="25" rx="9" ry="5.4"/><ellipse cx="21" cy="25" rx="9" ry="5.4"/><path d="M14 23c3 1.6 9 1.6 14 0" stroke-width="1.4"/>${friedEgg(22,21)}${cabbage(36,28)}`),
    hamburg_omu: plate(omelet(24,24,`<ellipse ${D} opacity=".55" cx="24" cy="19" rx="5.4" ry="3.2"/><ellipse cx="24" cy="19" rx="5.4" ry="3.2"/>`)),
    omurice: plate(omelet(24,24,`<path d="M16 21l3-2 3 2 3-2 3 2 3-2 2 1.4" stroke-width="1.8"/>`)),
    pika_omu: plate(omelet(24,24,`<path d="M18 20.6c1-1 2-1 3 0M27 20.6c1-1 2-1 3 0" stroke-width="1.8"/><path d="M21.6 23.4c1.4 1.2 3.4 1.2 4.8 0" stroke-width="1.8"/>`)),   // 케첩으로 웃는 얼굴 (캐릭터 그림 아님)
    tteokbokki: plate(`${redSauce(24,26,15,5.6)}${tteok(16,24,-15)}${tteok(24,27,10)}${tteok(28,22,-5)}${tteok(19,29,5)}<path ${W} d="M32 25l5 2-4 3z"/><path d="M32 25l5 2-4 3z"/>${eggHalf(11,27)}`),
    rabokki: plate(`${redSauce(24,26,15,5.6)}<path d="M12 25c2-2 4 2 6 0s4 2 6 0 4 2 6 0 4 2 6 0M13 28c2-2 4 2 6 0s4 2 6 0 4 2 6 0" stroke-width="1.4"/>${tteok(18,23,-15)}${tteok(28,22,10)}${tteok(30,28,0)}${eggHalf(14,29)}`),
    dururchigi: plate(`${[[16,25,-10],[22,23,15],[27,26.6,-4],[31,22.6,20],[19,28.6,6]].map(([x,y,r])=>`<rect ${D} opacity=".6" x="${x-3.6}" y="${y-2}" width="7.2" height="4" rx="1.6" transform="rotate(${r} ${x} ${y})"/>`).join("")}<path d="M12 22c2-1 4 0 4 1.6M33 27c2-1 4 0 4 1.6M24 20c2-1 4 0 4 1.6" stroke-width="1.4"/>${sc([[26,30],[14,28]])}`,{handle:true,steam:true}),
    // ── 김밥 (접시 위 단면들) ──
    kimbap: plate([[14,26],[23,24],[32,26],[19,30.4],[28,30.4]].map(([x,y])=>kimbapSlice(x,y,KB.plain)).join("")),
    tuna_kimbap: plate([[14,26],[23,24],[32,26],[19,30.4],[28,30.4]].map(([x,y])=>kimbapSlice(x,y,KB.tuna)).join("")),
    katsu_kimbap: plate([[14,26],[23,24],[32,26],[19,30.4],[28,30.4]].map(([x,y])=>kimbapSlice(x,y,KB.katsu)).join("")),
    spam_kimbap: plate([[14,26],[23,24],[32,26],[19,30.4],[28,30.4]].map(([x,y])=>kimbapSlice(x,y,KB.spam)).join("")),
  };
})();


// 이름 → 면·접시·공기 그림 (없으면 null)
function restKey(name){
  const L=[[/라면\+공기밥/,"ramen_rice"],[/치즈라면/,"cheese_ramen"],[/^라면$|라면/,"ramen"],[/어묵우동/,"udon_eomuk"],[/새우튀김우동|우동/,"udon_shrimp"],
   [/칼국수/,"kalguksu"],[/메밀/,"memil"],[/잔치국수|국수$/,"janchi"],[/비빔냉면/,"bibim_naeng"],[/냉면/,"naengmyeon"],[/쫄면/,"jjolmyeon"],[/메밀/,"memil"],[/짜계치/,"jjagyechi"],
   [/만두국/,"mandu"],[/떡국/,"tteokguk"],[/^공기밥$/,"gonggi"],[/치킨마요|덮밥/,"mayo_don"],[/볶음밥/,"teri_rice"],
   [/고구마/,"goguma_katsu"],[/돈까스김밥/,"katsu_kimbap"],[/참치김밥/,"tuna_kimbap"],[/스팸김밥/,"spam_kimbap"],[/김밥/,"kimbap"],[/돈까스|까스/,"katsu"],
   [/함박오므라이스/,"hamburg_omu"],[/피카츄/,"pika_omu"],[/오므라이스/,"omurice"],[/함박/,"hamburg"],[/스테이크/,"moksal"],[/라볶이/,"rabokki"],[/떡볶이/,"tteokbokki"],[/두루치기|볶음/,"dururchigi"]];
  for(const [re,k] of L) if(re.test(name)) return k; return null;
}

// ── 뚝배기 메뉴: 45도 위에서 본 구도, 입구 안 내용물로 메뉴 구분 ──
const POT_SVG = (() => {
  const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const T = 'fill="currentColor" opacity=".16" stroke="none"';
  const D = 'fill="currentColor" stroke="none"';
  const B = 'fill="currentColor" opacity=".3" stroke="none"';   // 국물
  const pot=(inner,{steam=false,spoon=false,broth=true}={})=>`<g ${S}>
  <path ${T} d="M5 19c0 12 8 21 19 21s19-9 19-21z"/><path d="M5 19c0 12 8 21 19 21s19-9 19-21"/>
  <path d="M14 43.5h20"/>
  <path d="M5.4 24H2.8M42.6 24h2.6"/>
  <ellipse cx="24" cy="19" rx="19" ry="9"/>
  ${broth?`<ellipse ${B} cx="24" cy="19.5" rx="16" ry="7"/>`:`<ellipse ${T} cx="24" cy="19.5" rx="16" ry="7"/>`}
  <clipPath id="tb-mouth"><ellipse cx="24" cy="19.5" rx="17.2" ry="7.8"/></clipPath><g clip-path="url(#tb-mouth)"><g transform="translate(24 19.5) scale(1.3) translate(-24 -21.4)">${inner}</g></g>
  ${spoon?`<path d="M35 21l6-13"/><ellipse cx="42" cy="5.6" rx="2" ry="3" transform="rotate(25 42 5.6)"/>`:""}
  ${steam?`<path d="M17 8c-1.4-1.6 1.4-2.6 0-4.2M24 7c-1.4-1.6 1.4-2.6 0-4.2M31 8c-1.4-1.6 1.4-2.6 0-4.2" stroke-width="1.8"/>`:""}</g>`;
  const tofu=(x,y,s=1)=>`<path fill="var(--tofu,#fff)" d="M${x-5*s} ${y}c-1-3 2-5 4-4 1-2 5-2 6 0 2-1 5 1 4 4-1 2-3 3-7 3s-6-1-7-3z"/><path d="M${x-5*s} ${y}c-1-3 2-5 4-4 1-2 5-2 6 0 2-1 5 1 4 4-1 2-3 3-7 3s-6-1-7-3z"/>`;
  const shrimp=(x,y)=>`<path d="M${x} ${y-3}c3 0 5 2 4 5-1 2-4 2-5 0"/><path d="M${x+1} ${y-1}l1 2"/>`;
  const meat=(x,y,r=0)=>`<rect ${D} opacity=".55" x="${x-3.5}" y="${y-1.6}" width="7" height="3.2" rx="1.6" transform="rotate(${r} ${x} ${y})"/>`;
  const scallion=(pts)=>pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" stroke-width="1.4"/>`).join("");
  const dots=(pts,r=1)=>pts.map(([x,y])=>`<circle ${D} cx="${x}" cy="${y}" r="${r}"/>`).join("");
  return {
    // 김치찌개: 김치 잎 2장 + 두부 한 조각
    kimchi: pot(`<path ${D} opacity=".6" d="M12 21c2-4 6-5 9-2-2 1-3 3-5 4-2 0-3-1-4-2z"/><path d="M12 21c2-4 6-5 9-2"/><path ${D} opacity=".6" d="M26 18c3-2 7-1 9 2-3 0-4 2-6 3-2-1-3-3-3-5z"/><path d="M26 18c3-2 7-1 9 2"/><rect x="20" y="21" width="5" height="4" rx="1" fill="var(--tofu,#fff)"/>`,{steam:true}),
    // 해물순두부: 몽글 두부 + 새우 + 계란 노른자
    sundubu_sea: pot(`${tofu(19,21)}${shrimp(29,20)}<circle ${D} opacity=".7" cx="26" cy="24" r="1.8"/>`,{steam:true}),
    // 고기순두부: 몽글 두부 + 고기 + 파
    sundubu_meat: pot(`${tofu(19,21)}${meat(30,19,-15)}${meat(29,23.5,10)}${scallion([[24,17.5],[34,22.5]])}`,{steam:true}),
    // 부대찌개: 소시지 단면 + 라면 + 치즈
    budae: pot(`<circle cx="15" cy="20" r="2.6"/><circle cx="21" cy="23" r="2.6"/><path d="M15 19.2v1.6M21 22.2v1.6"/><path d="M25 18c1.5-1.5 3 1.5 4.5 0s3 1.5 4.5 0M25 21c1.5-1.5 3 1.5 4.5 0s3 1.5 4.5 0"/><rect ${D} opacity=".35" x="28" y="22" width="6" height="4" rx="1"/>`,{steam:true}),
    // 된장찌개(비빔밥+된장찌개): 두부 깍둑 + 애호박 반달
    doenjang: pot(`<rect x="13" y="19" width="4" height="4" rx=".8" fill="var(--tofu,#fff)"/><rect x="19" y="21" width="4" height="4" rx=".8" fill="var(--tofu,#fff)"/><path d="M26 19a4 4 0 0 0 7 2.5z"/><path d="M27 23a3.4 3.4 0 0 0 6 1.8z"/>`,{steam:true}),
    // 불고기뚝배기: 고기 결 + 당면 + 파
    bulgogi: pot(`<path d="M12 21c3-3 6 0 9-2M14 23.5c3-3 6 0 9-2M24 18c3-2 6 1 9-1"/><path d="M25 22c3 1 6 1 9-1" stroke-dasharray="1 2"/>${scallion([[30,23.5],[19,17.5]])}`,{steam:true}),
    // 돼지국밥: 수육 편육 + 파 + 숟가락
    dwaeji: pot(`<path ${T} d="M11 21c2-3 6-4 9-3l-1 5c-3 0-6-1-8-2z"/><path d="M11 21c2-3 6-4 9-3l-1 5c-3 0-6-1-8-2z"/><path d="M12.5 20.2c2-1.6 4.5-2 6.5-1.6"/><path ${T} d="M20 23c1-3 4-5 8-5l1 5c-3 1-6 1-9 0z"/><path d="M20 23c1-3 4-5 8-5l1 5c-3 1-6 1-9 0z"/><path d="M21.6 21.6c1-1.6 3-2.6 5.6-2.8"/>${scallion([[30,23.5],[16,24]])}`,{steam:true,spoon:true}),
    // 순대국밥: 순대 단면 + 파 + 숟가락
    sundae: pot(`${[[15,20],[21,22.5],[27,19.5]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3" ry="2.3"/><circle ${D} cx="${x-.8}" cy="${y-.3}" r=".6"/><circle ${D} cx="${x+1}" cy="${y+.5}" r=".6"/>`).join("")}${scallion([[24,17],[31,23]])}`,{steam:true,spoon:true}),
    // 날치알밥: 날치알 + 김 가루 + 채소
    albap: pot(`${dots([[19,19],[21,20.6],[23,19],[25,20.6],[22,22.2],[24,22.4],[20,22.4],[26,19]],1.1)}<path d="M28 18.5l5 1.2M28.5 21l5 1M28 23.4l4 .6"/><path d="M12 21c1-2 3-2.4 5-1.6M13 23.5c1.6-.8 3-.6 4 .2"/>`,{broth:false}),
    // 치즈날치알밥: 날치알 + 녹은 치즈
    cheese_albap: pot(`${dots([[16,19.5],[18,21.4],[15.5,22.6],[19.5,19.2],[13.6,21]],1.1)}<path ${D} opacity=".38" d="M22 17c3-1 8-1 11 1l1 4c-1 2-2 0-3 1s-1 3-3 2-2-2-4-1-2-1-2-2z"/><path d="M22 17c3-1 8-1 11 1l1 4c-1 2-2 0-3 1s-1 3-3 2-2-2-4-1-2-1-2-2z"/>`,{broth:false}),
    // 닭갈비알밥: 양념 닭 조각 + 날치알
    dakgalbi: pot(`${dots([[14,20],[16,22],[13.4,22.6],[17,19.4]],1.1)}<path ${D} opacity=".55" d="M20 18.4c2-1.4 5-1 6 1s-1 4-3.4 3.6-4-2.6-2.6-4.6z"/><path ${D} opacity=".55" d="M27 21c2-1.6 5-.8 6 1s-1 3.4-3.4 3-3.6-2.4-2.6-4z"/>${scallion([[30,18.4],[23,24.2]])}`,{broth:false}),
    // 돌솥비빔밥: 나물이 칸칸이 + 가운데 노른자
    bibim: pot(`<path d="M24 21.4L13 19M24 21.4l-6 4.4M24 21.4l7 4.2M24 21.4l11-2M24 21.4V16.6"/><path ${D} opacity=".3" d="M24 21.4l-11-2.4c2-2 6-2.8 11-2.8z"/><path ${D} opacity=".3" d="M24 21.4l7 4.2c-3 .8-9 .8-13-.2z"/><circle fill="var(--tofu,#fff)" cx="24" cy="21.4" r="3.2"/><circle ${D} opacity=".75" cx="24" cy="21.4" r="1.7"/>`,{broth:false}),
  };
})();

// 이름 → 뚝배기 그림 (없으면 null)
function potKey(name){
  const R=[[/해물순두부/,"sundubu_sea"],[/순두부/,"sundubu_meat"],[/김치찌개/,"kimchi"],[/부대/,"budae"],[/된장/,"doenjang"],[/불고기|뚝배기/,"bulgogi"],
   [/순대국밥/,"sundae"],[/국밥/,"dwaeji"],[/치즈.*알밥/,"cheese_albap"],[/닭갈비/,"dakgalbi"],[/돌솥|비빔밥/,"bibim"],[/알밥/,"albap"],[/찌개/,"kimchi"]];
  for(const [re,k] of R) if(re.test(name)) return k; return null;
}

// 메뉴 종류 (새 메뉴 대표 그림용, DB에서 새 메뉴가 추가돼도 이름만 보고 가장 가까운 그림이 나옴)
function iconKey(m) {
  const n = m.name;
  if (/김밥/.test(n)) return "kimbap";
  if (/떡볶이|라볶이/.test(n)) return "tteok";
  if (/^공기밥$/.test(n)) return "plainrice";
  if (/라면|국수|우동|칼국수|냉면|쫄면|짜계치|면/.test(n)) return "noodle";
  if (/알밥|돌솥/.test(n)) return "albap";   // 다래락은 알밥·돌솥비빔밥이 뚝배기에 나옴
  if (/찌개|뚝배기|순두부/.test(n)) return "stew";
  if (/국밥/.test(n)) return "gukbap";   // 다래락 국밥은 뚝배기
  if (/떡국|만두국|국$/.test(n)) return "soup";
  if (/오므라이스/.test(n)) return "omurice";
  if (/돈까스|까스|튀김/.test(n)) return "cutlet";
  if (/스테이크|함박/.test(n)) return "steak";
  if (/두루치기|볶음(?!밥)|불고기/.test(n)) return "pan";
  if (/밥/.test(n)) return "rice";
  return { 일품: "rice", 양식: "steak", 분식: "noodle" }[m.cat] || "rice";
}
// 이름으로 못 찾은 새 메뉴는 종류(iconKey)별 대표 그림
const FALLBACK = { stew: ["pot", "kimchi"], gukbap: ["pot", "dwaeji"], albap: ["pot", "albap"], soup: ["rest", "mandu"], rice: ["rest", "mayo_don"],
  plainrice: ["rest", "gonggi"], noodle: ["rest", "ramen"], cutlet: ["rest", "katsu"], steak: ["rest", "moksal"], omurice: ["rest", "omurice"],
  tteok: ["rest", "tteokbokki"], kimbap: ["rest", "kimbap"], pan: ["rest", "dururchigi"] };
function iconSvg(m) {
  const p = potKey(m.name); if (p) return POT_SVG[p];
  const r = restKey(m.name); if (r) return REST_SVG[r];
  const [set, k] = FALLBACK[iconKey(m)]; return (set === "pot" ? POT_SVG : REST_SVG)[k];
}
const foodIcon = (m, cls = "fi") => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${iconSvg(m)}</svg>`;
