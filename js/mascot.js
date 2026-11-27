// 학식샷 캐릭터 '밥톨이' (학식샷 오리지널, SVG 120×120)
// 표정: think(고민) · happy(환영) · yum(먹음 체크·평가 완료) · sad(빈 화면)
// 첫 화면 시간대별: morning(졸려서 하품·기지개) · lunch(배고파서 숟가락 번쩍) · dinner(배 두드리며 느긋, 달·별)
// v3: 단순하지만 호감형 — 점 눈, 작은 입, 은은한 볼터치, 짧은 팔. 그림자·반짝임 없음 (v2는 눈이 과하다는 피드백)
const BAP = (() => {
  const ink = "#5b3a26", body = "#fffdf7", blush = "#ffb8ad";
  const S = (w) => `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const cx = 60, ey = 60, ex = 12;
  const dot = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="4" fill="${ink}"/>`;
  const eyes = {
    happy: `<path ${S(3.2)} d="M${cx - ex - 4} ${ey + 1}q4 -5 8 0M${cx + ex - 4} ${ey + 1}q4 -5 8 0"/>`,
    yum: `<path ${S(3.2)} d="M${cx - ex - 4} ${ey + 1}q4 -5 8 0M${cx + ex - 4} ${ey + 1}q4 -5 8 0"/>`,
    sad: `${dot(cx - ex, ey + 1)}${dot(cx + ex, ey + 1)}`,
    think: `${dot(cx - ex + 1, ey - 1)}${dot(cx + ex + 1, ey - 1)}`,
    morning: `<path ${S(3.2)} d="M${cx - ex - 4} ${ey + 1}h8M${cx + ex - 4} ${ey + 1}h8"/>`,          // 반쯤 감긴 졸린 눈
    lunch: `<path ${S(3.2)} d="M${cx - ex - 4} ${ey + 1}q4 -6 8 0M${cx + ex - 4} ${ey + 1}q4 -6 8 0"/>`,  // 신난 눈
    dinner: `<path ${S(3.2)} d="M${cx - ex - 4} ${ey - 1}q4 4.5 8 0M${cx + ex - 4} ${ey - 1}q4 4.5 8 0"/>`, // 편안하게 감은 눈
  };
  const mouths = {
    happy: `<path ${S(3)} d="M${cx - 5} ${ey + 8}q5 5 10 0"/>`,
    yum: `<path ${S(3)} d="M${cx - 5} ${ey + 8}q5 5 10 0"/><path fill="#ff8f86" stroke="${ink}" stroke-width="2" d="M${cx + 1} ${ey + 10.5}q2.5 5 5 .5z"/>`,
    sad: `<path ${S(3)} d="M${cx - 4} ${ey + 11}q4 -3.5 8 0"/>`,
    think: `<path ${S(3)} d="M${cx - 2} ${ey + 10}h5"/>`,
    morning: `<ellipse cx="${cx}" cy="${ey + 11}" rx="3.4" ry="4.4" fill="#7a3b2a" stroke="${ink}" stroke-width="2.4"/>`,   // 하품
    lunch: `<path fill="#7a3b2a" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" d="M${cx - 6} ${ey + 7}h12q0 8.5-6 8.5t-6-8.5z"/><path fill="#ff8f86" d="M${cx - 3} ${ey + 13.2}q3 -2.6 6 0q-3 2.4 -6 0z"/>`,
    dinner: `<path ${S(3)} d="M${cx - 4} ${ey + 8}q4 3.5 8 0"/>`,
  };
  const cheeks = `<ellipse cx="${cx - ex - 7}" cy="${ey + 7}" rx="5" ry="3" fill="${blush}" opacity=".75"/><ellipse cx="${cx + ex + 7}" cy="${ey + 7}" rx="5" ry="3" fill="${blush}" opacity=".75"/>`;
  const arm = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="8" transform="rotate(${r} ${x} ${y})" fill="${body}" stroke="${ink}" stroke-width="3"/>`;
  const spoon = `<path ${S(3)} d="M104 46l5-24"/><ellipse cx="110" cy="16" rx="5" ry="7" transform="rotate(12 110 16)" fill="${body}" stroke="${ink}" stroke-width="3"/>`;
  const back = { happy: arm(22, 80, -30) + arm(101, 54, -50), yum: arm(22, 80, -30) + arm(99, 50, -40), sad: arm(22, 82, -25) + arm(98, 82, 25), think: arm(22, 80, -30),
    morning: arm(22, 80, -30) + arm(97, 36, -20),           // 한 팔 쭉 뻗어 기지개
    lunch: arm(22, 78, -30) + spoon + arm(101, 50, -35),     // 숟가락 번쩍
    dinner: "" };
  const front = { think: arm(80, 82, -20), happy: "", yum: "", sad: "", morning: "", lunch: "", dinner: arm(44, 84, 68) + arm(76, 84, -68) };   // 저녁: 두 손으로 배 통통
  const accent = "#b54a17", soft = "#a8998a";
  const extra = { think: `<text x="94" y="32" font-family="Jua,sans-serif" font-size="22" fill="${accent}">?</text>`, happy: "", yum: "", sad: "",
    morning: `<path ${S(3)} d="M58 21c-1-7 5-10 8-5"/><text x="10" y="36" font-family="Jua,sans-serif" font-size="17" fill="${soft}">z</text><text x="2" y="22" font-family="Jua,sans-serif" font-size="12" fill="${soft}">z</text>`,
    lunch: `<path fill="none" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" d="M16 26v9M11.5 30.5h9M26 12v6M23 15h6"/>`,
    dinner: `<path fill="#f3c15a" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round" d="M98 9a11 11 0 1 0 13 16a9 9 0 1 1 -13 -16z"/><path fill="#f3c15a" d="M84 5l1.5 3.5 3.5 1.5-3.5 1.5L84 15l-1.5-3.5L79 10l3.5-1.5z"/>` };
  return (mood = "happy", cls = "bap") => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    ${back[mood]}<path fill="${body}" stroke="${ink}" stroke-width="3.2" d="M60 20c22 0 35 20 35 43s-14 39-35 39-35-16-35-39 13-43 35-43z"/>
    ${cheeks}${eyes[mood]}${mouths[mood]}${front[mood]}${extra[mood]}</svg>`;
})();
