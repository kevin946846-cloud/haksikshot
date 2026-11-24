// 메뉴 아이콘: 일반 13종 + 뚝배기 메뉴 12종 (SVG, 48×48, 선 굵기 2.2, 색은 currentColor → 글자색을 따라감)
// 카드에는 아이콘을 보여 주고, 사진은 카드를 눌러 상세에서 봄
const FOOD_SVG = (() => {
  const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const T = 'fill="currentColor" opacity=".16" stroke="none"';   // 옅은 면 채우기
  // 뚝배기: 넓은 입구, 아래로 둥근 몸통, 양옆 작은 귀, 받침 접시
  const POT = `<path ${T} d="M9 22h30c0 10-6 16-15 16S9 32 9 22z"/><path d="M7 22h34M9 22c0 10 6 16 15 16s15-6 15-16"/><path d="M9.5 26H6.5M38.5 26h3"/><path d="M8 42h32"/>`;
  const steam = (x) => `<path d="M${x} 9c-2 2.4 2 3.6 0 6M${x + 7} 7c-2 2.4 2 3.6 0 6M${x + 14} 9c-2 2.4 2 3.6 0 6"/>`;
  return {
    // 찌개·뚝배기: 손잡이 달린 냄비 + 김
    // 뚝배기 공통 모양: 둥근 몸통 + 넓은 입구 + 받침 접시
    // 찌개·뚝배기: 뚝배기 + 국물 + 김
    stew: `<g ${S}>${POT}<path d="M12 23c4 2 20 2 24 0"/>${steam(17)}</g>`,
    // 국밥: 뚝배기 + 꽂힌 숟가락 + 김 (찌개와 구분)
    gukbap: `<g ${S}>${POT}<path d="M12 23c4 2 20 2 24 0"/><path d="M29 22l7-14"/><ellipse cx="37.2" cy="6.6" rx="2.2" ry="3.2" transform="rotate(27 37.2 6.6)"/><path d="M14 10c-2 2.4 2 3.6 0 6M21 8c-2 2.4 2 3.6 0 6"/></g>`,
    // 알밥·돌솥비빔밥: 뚝배기 위로 봉긋한 밥 + 날치알
    albap: `<g ${S}>${POT}<path ${T} d="M11 22c1-6 6-9 13-9s12 3 13 9z"/><path d="M11 22c1-6 6-9 13-9s12 3 13 9"/><path d="M17 18h.01M21 15.5h.01M25 17h.01M29 15.5h.01M31 19h.01M22 19.5h.01" stroke-width="3"/></g>`,
    // 국밥·떡국·만두국: 넓은 그릇 + 숟가락
    soup: `<g ${S}><path ${T} d="M7 25h34a17 13 0 0 1-34 0z"/><path d="M7 25h34a17 13 0 0 1-34 0z"/><path d="M18 40h12"/><path d="M31 25l9-15"/><ellipse cx="41.2" cy="8.4" rx="2.2" ry="3.2" transform="rotate(32 41.2 8.4)"/>${steam(14).replace(/M(\d+) (\d+)/g, (m, a, b) => `M${a} ${+b + 1}`)}</g>`,
    // 덮밥·비빔밥·알밥·볶음밥: 밥 봉긋한 그릇 + 젓가락
    rice: `<g ${S}><path ${T} d="M10 25c0-6 6-10 14-10s14 4 14 10z"/><path d="M10 25c0-6 6-10 14-10s14 4 14 10"/><path d="M7 25h34a17 13 0 0 1-34 0z"/><path d="M18 40h12"/><path d="M33 6l-6 13M39 7l-8 12"/><path d="M17 20h.01M22 18h.01M27 20h.01" stroke-width="3"/></g>`,
    // 공기밥: 밥 그릇만
    plainrice: `<g ${S}><path ${T} d="M11 26c0-6 6-11 13-11s13 5 13 11z"/><path d="M11 26c0-6 6-11 13-11s13 5 13 11"/><path d="M8 26h32a16 12 0 0 1-32 0z"/><path d="M19 39h10"/><path d="M19 21h.01M24 19h.01M29 21h.01" stroke-width="3"/></g>`,
    // 면: 그릇 + 젓가락으로 든 면
    noodle: `<g ${S}><path ${T} d="M7 26h34a17 13 0 0 1-34 0z"/><path d="M7 26h34a17 13 0 0 1-34 0z"/><path d="M18 40h12"/><path d="M30 5l-4 17M37 6l-6 16"/><path d="M20 26c0-6 2-8 2-12M24 26c0-6 2-8 2-12M28 26c0-4 1-6 1-9"/></g>`,
    // 돈까스: 접시 위 썰린 튀김 + 양배추
    cutlet: `<g ${S}><ellipse cx="24" cy="30" rx="19" ry="11"/><path ${T} d="M12 29l5-10h6l-5 11zM20 30l5-11h6l-5 11zM28 30l5-11h5l-4 11z"/><path d="M12 29l5-10h6l-5 11zM20 30l5-11h6l-5 11zM28 30l5-11h5l-4 11z"/><path d="M14 35c2 1.5 4 1.5 6 0s4-1.5 6 0"/></g>`,
    // 스테이크·함박: 접시 + 고기 + 포크
    steak: `<g ${S}><ellipse cx="22" cy="30" rx="17" ry="10"/><path ${T} d="M13 29c0-5 5-8 10-8s9 2 9 6-4 7-10 7-9-2-9-5z"/><path d="M13 29c0-5 5-8 10-8s9 2 9 6-4 7-10 7-9-2-9-5z"/><path d="M19 27l6 3M21 24l6 3"/><path d="M42 12v24M39 12v6a3 3 0 0 0 6 0v-6"/></g>`,
    // 오므라이스: 접시 위 계란 + 케첩
    omurice: `<g ${S}><ellipse cx="24" cy="31" rx="19" ry="10"/><path ${T} d="M10 29c0-7 6-12 14-12s14 5 14 12c0 2-2 3-4 3H14c-2 0-4-1-4-3z"/><path d="M10 29c0-7 6-12 14-12s14 5 14 12c0 2-2 3-4 3H14c-2 0-4-1-4-3z"/><path d="M15 24l4-3 4 3 4-3 4 3 3-2"/></g>`,
    // 떡볶이: 접시 위 떡 + 소스
    tteok: `<g ${S}><ellipse cx="24" cy="30" rx="19" ry="11"/><path ${T} d="M10 30c3-5 8-7 14-7s11 2 14 7c-4 4-9 5-14 5s-10-1-14-5z"/><rect x="13" y="22" width="11" height="4.6" rx="2.3" transform="rotate(-14 18.5 24.3)"/><rect x="22" y="25" width="11" height="4.6" rx="2.3" transform="rotate(10 27.5 27.3)"/><rect x="17" y="29" width="10" height="4.6" rx="2.3" transform="rotate(-4 22 31.3)"/></g>`,
    // 김밥: 썬 단면 3개
    kimbap: `<g ${S}>${[[13, 29], [35, 29], [24, 17]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5"/><circle ${T} cx="${x}" cy="${y}" r="5"/><path d="M${x - 2.5} ${y - 1.5}h.01M${x + 2} ${y - 1}h.01M${x} ${y + 2.5}h.01" stroke-width="3"/>`).join("")}</g>`,
    // 두루치기·볶음: 손잡이 달린 팬
    pan: `<g ${S}><ellipse cx="20" cy="27" rx="15" ry="9"/><path ${T} d="M11 26c2-3 5-4 9-4s7 1 9 4c-2 3-5 4-9 4s-7-1-9-4z"/><path d="M34 24l10-5"/><path d="M15 25l3 2M21 23l2 3M25 27l3-1" /><path d="M14 13c-2 2 2 3 0 5M21 11c-2 2 2 3 0 5M28 13c-2 2 2 3 0 5"/></g>`,
  };
})();


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
  ${spoon?`<path d="M35 20l7-15"/><ellipse cx="43" cy="3.6" rx="2" ry="3" transform="rotate(27 43 3.6)"/>`:""}
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

// 이름 → 뚝배기 그림 (없으면 null → 일반 아이콘)
function potKey(name){
  const R=[[/해물순두부/,"sundubu_sea"],[/순두부/,"sundubu_meat"],[/김치찌개/,"kimchi"],[/부대/,"budae"],[/된장/,"doenjang"],[/불고기|뚝배기/,"bulgogi"],
   [/순대국밥/,"sundae"],[/국밥/,"dwaeji"],[/치즈.*알밥/,"cheese_albap"],[/닭갈비/,"dakgalbi"],[/돌솥|비빔밥/,"bibim"],[/알밥/,"albap"],[/찌개/,"kimchi"]];
  for(const [re,k] of R) if(re.test(name)) return k; return null;
}

// 메뉴 이름으로 아이콘 고르기 (DB에서 새 메뉴가 추가돼도 이름만 보고 맞는 아이콘이 나옴)
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
const foodIcon = (m, cls = "fi") => { const p = potKey(m.name); return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${p ? POT_SVG[p] : FOOD_SVG[iconKey(m)]}</svg>`; };
