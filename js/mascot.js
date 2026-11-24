// 학식샷 캐릭터 '밥톨이' (학식샷 오리지널, SVG 120×120)
// 표정: think(뭐 먹지? 고민) · happy(환영) · yum(먹음 체크·평가 완료) · sad(빈 화면·품절)
// v2: 더 동글한 몸, 크고 반짝이는 눈, 볼터치, 짧은 팔다리, 부드러운 갈색 테두리
// 몸은 항상 밝은 밥알색이라 라이트·다크 모드 모두 스티커처럼 보임
const BAP = (() => {
  const ink = "#5b3a26", body = "#fffdf7", shade = "#f3e8d8", blush = "#ffaea3", mouthC = "#e8634f", tongue = "#ff8f86";
  const S = (w) => `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const cx = 60, ey = 62, ex = 14;
  const bigEye = (x, y, look = 0) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="6.6" fill="${ink}"/><circle cx="${x + 1.8 + look}" cy="${y - 2.6}" r="2.1" fill="#fff"/><circle cx="${x - 1.6 + look}" cy="${y + 2.4}" r=".9" fill="#fff"/>`;
  const eyes = {
    happy: `<path ${S(3.4)} d="M${cx - ex - 5} ${ey + 1}q5 -7 10 0M${cx + ex - 5} ${ey + 1}q5 -7 10 0"/>`,
    yum: `${bigEye(cx - ex, ey)}<path ${S(3.4)} d="M${cx + ex - 5} ${ey - 3}l6 3-6 3"/>`,
    sad: `${bigEye(cx - ex, ey + 1)}${bigEye(cx + ex, ey + 1)}<path ${S(2.6)} d="M${cx - ex - 6} ${ey - 8}q5 -3 9 0M${cx + ex + 6} ${ey - 8}q-5 -3 -9 0"/>`,
    think: `${bigEye(cx - ex, ey, -1)}${bigEye(cx + ex, ey, -1)}`,
  };
  const mouths = {
    happy: `<path fill="${mouthC}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" d="M${cx - 5} ${ey + 9}q5 8 10 0z"/><path fill="${tongue}" d="M${cx - 2.6} ${ey + 13}q2.6 2.6 5.2 0q-2.6-1.6-5.2 0z"/>`,
    yum: `<path ${S(2.8)} d="M${cx - 6} ${ey + 9}q3 3 6 0q3 3 6 0"/><path fill="${tongue}" stroke="${ink}" stroke-width="2.2" d="M${cx + 1} ${ey + 11}q3 7 7 1z"/>`,
    sad: `<path ${S(2.8)} d="M${cx - 5} ${ey + 13}q5 -5 10 0"/><path fill="#9fd3f0" stroke="${ink}" stroke-width="1.8" d="M${cx + ex + 1} ${ey + 7}q-3.4 5.4 0 7.6q3.4 -2.2 0 -7.6z"/>`,
    think: `<ellipse cx="${cx + 2}" cy="${ey + 12}" rx="3" ry="3.4" fill="${mouthC}" stroke="${ink}" stroke-width="2.4"/>`,
  };
  const cheeks = `<ellipse cx="${cx - ex - 8}" cy="${ey + 9}" rx="6.4" ry="3.8" fill="${blush}" opacity=".85"/><ellipse cx="${cx + ex + 8}" cy="${ey + 9}" rx="6.4" ry="3.8" fill="${blush}" opacity=".85"/>`;
  // 짧고 동글한 팔: 몸 밖으로 빼서 손처럼 보이게 (up: 번쩍, down: 내림, chin: 턱 괴기 — 몸 앞에 그림)
  const arm = (side, pose) => {
    const P = { up: [side < 0 ? 19 : 101, 44, side < 0 ? 40 : -40], down: [side < 0 ? 20 : 100, 84, side < 0 ? -30 : 30], chin: [side < 0 ? 20 : 82, side < 0 ? 84 : 84, side < 0 ? -30 : -20] }[pose];
    return `<ellipse cx="${P[0]}" cy="${P[1]}" rx="6.2" ry="9" transform="rotate(${P[2]} ${P[0]} ${P[1]})" fill="${body}" stroke="${ink}" stroke-width="3"/>`;
  };
  const back = { happy: arm(-1, "up") + arm(1, "up"), yum: arm(-1, "down") + arm(1, "up"), sad: arm(-1, "down") + arm(1, "down"), think: arm(-1, "down") };
  const front = { think: arm(1, "chin"), happy: "", yum: "", sad: "" };
  const extra = {
    happy: `<path fill="#ffd84d" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round" d="M98 20l2.4 5 5 2.4-5 2.4-2.4 5-2.4-5-5-2.4 5-2.4z"/>`,
    think: `<text x="94" y="30" font-family="Jua,sans-serif" font-size="24" fill="#b54a17">?</text>`, yum: "", sad: "",
  };
  return (mood = "happy", cls = "bap") => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="110" rx="26" ry="4" fill="#000" opacity=".08"/>
    <ellipse cx="48" cy="104" rx="8" ry="5" fill="${body}" stroke="${ink}" stroke-width="3"/><ellipse cx="72" cy="104" rx="8" ry="5" fill="${body}" stroke="${ink}" stroke-width="3"/>
    ${back[mood]}
    <path fill="${body}" stroke="${ink}" stroke-width="3.4" d="M60 18c23 0 37 21 37 45s-15 41-37 41-37-17-37-41 14-45 37-45z"/>
    <path fill="${shade}" d="M28 76c4 14 16 24 32 24s28-10 32-24c-6 9-17 15-32 15s-26-6-32-15z"/>
    <path fill="#fff" d="M40 34c4-7 11-10 17-10-6 4-11 9-13 16-2 2-5-2-4-6z"/>
    ${cheeks}${eyes[mood]}${mouths[mood]}${front[mood]}${extra[mood]}</svg>`;
})();
