// 메뉴 아이콘 12종 (SVG, 48×48, 선 굵기 2.2, 색은 currentColor → 글자색을 따라감)
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

// 메뉴 이름으로 아이콘 고르기 (DB에서 새 메뉴가 추가돼도 이름만 보고 맞는 아이콘이 나옴)
function iconKey(m) {
  const n = m.name;
  if (/김밥/.test(n)) return "kimbap";
  if (/떡볶이|라볶이/.test(n)) return "tteok";
  if (/^공기밥$/.test(n)) return "plainrice";
  if (/라면|국수|우동|칼국수|냉면|쫄면|짜계치|면/.test(n)) return "noodle";
  if (/알밥|돌솥/.test(n)) return "albap";   // 다래락은 알밥·돌솥비빔밥이 뚝배기에 나옴
  if (/찌개|뚝배기|순두부/.test(n)) return "stew";
  if (/국밥|떡국|만두국|국$/.test(n)) return "soup";
  if (/오므라이스/.test(n)) return "omurice";
  if (/돈까스|까스|튀김/.test(n)) return "cutlet";
  if (/스테이크|함박/.test(n)) return "steak";
  if (/두루치기|볶음(?!밥)|불고기/.test(n)) return "pan";
  if (/밥/.test(n)) return "rice";
  return { 일품: "rice", 양식: "steak", 분식: "noodle" }[m.cat] || "rice";
}
const foodIcon = (m, cls = "fi") => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${FOOD_SVG[iconKey(m)]}</svg>`;
