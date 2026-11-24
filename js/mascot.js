// 학식샷 캐릭터 '밥톨이' (학식샷 오리지널, SVG 120×120)
// 표정: think(고민) · happy(환영) · yum(먹음 체크·평가 완료) · sad(빈 화면)
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
  };
  const mouths = {
    happy: `<path ${S(3)} d="M${cx - 5} ${ey + 8}q5 5 10 0"/>`,
    yum: `<path ${S(3)} d="M${cx - 5} ${ey + 8}q5 5 10 0"/><path fill="#ff8f86" stroke="${ink}" stroke-width="2" d="M${cx + 1} ${ey + 10.5}q2.5 5 5 .5z"/>`,
    sad: `<path ${S(3)} d="M${cx - 4} ${ey + 11}q4 -3.5 8 0"/>`,
    think: `<path ${S(3)} d="M${cx - 2} ${ey + 10}h5"/>`,
  };
  const cheeks = `<ellipse cx="${cx - ex - 7}" cy="${ey + 7}" rx="5" ry="3" fill="${blush}" opacity=".75"/><ellipse cx="${cx + ex + 7}" cy="${ey + 7}" rx="5" ry="3" fill="${blush}" opacity=".75"/>`;
  const arm = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="8" transform="rotate(${r} ${x} ${y})" fill="${body}" stroke="${ink}" stroke-width="3"/>`;
  const back = { happy: arm(22, 80, -30) + arm(101, 54, -50), yum: arm(22, 80, -30) + arm(99, 50, -40), sad: arm(22, 82, -25) + arm(98, 82, 25), think: arm(22, 80, -30) };
  const front = { think: arm(80, 82, -20), happy: "", yum: "", sad: "" };
  const extra = { think: `<text x="94" y="32" font-family="Jua,sans-serif" font-size="22" fill="#b54a17">?</text>`, happy: "", yum: "", sad: "" };
  return (mood = "happy", cls = "bap") => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    ${back[mood]}<path fill="${body}" stroke="${ink}" stroke-width="3.2" d="M60 20c22 0 35 20 35 43s-14 39-35 39-35-16-35-39 13-43 35-43z"/>
    ${cheeks}${eyes[mood]}${mouths[mood]}${front[mood]}${extra[mood]}</svg>`;
})();
