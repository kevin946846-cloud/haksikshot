// 학식샷 캐릭터 '밥톨이' (학식샷 오리지널, SVG 120×120)
// 표정: think(뭐 먹지? 고민) · happy(환영) · yum(먹음 체크·평가 완료) · sad(빈 화면·품절)
// 몸은 항상 흰 밥알 + 진한 테두리라 라이트·다크 모드 모두 스티커처럼 보임
const BAP = (() => {
  const ink = "#3a2a1e", acc = "#b54a17", pink = "#f4a3a0";
  const S = (w) => `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const face = (mood) => {
    const cx = 60, y = 56, e = 9;
    const eyes = {
      happy: `<path ${S(3)} d="M${cx - e - 4} ${y}q4 -5 8 0M${cx + e - 4} ${y}q4 -5 8 0"/>`,
      yum: `<circle cx="${cx - e}" cy="${y - 1}" r="3.2" fill="${ink}"/><path ${S(3)} d="M${cx + e - 4} ${y - 1}h8"/>`,
      sad: `<circle cx="${cx - e}" cy="${y}" r="3.2" fill="${ink}"/><circle cx="${cx + e}" cy="${y}" r="3.2" fill="${ink}"/><path ${S(2.4)} d="M${cx - e - 5} ${y - 6}l6 -3M${cx + e + 5} ${y - 6}l-6 -3"/>`,
      think: `<circle cx="${cx - e + 1}" cy="${y - 2}" r="3.2" fill="${ink}"/><circle cx="${cx + e + 1}" cy="${y - 2}" r="3.2" fill="${ink}"/>`,
    }[mood];
    const mouth = {
      happy: `<path fill="${acc}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" d="M${cx - 6} ${y + 7}q6 9 12 0z"/>`,
      yum: `<path ${S(2.8)} d="M${cx - 5} ${y + 8}q5 5 10 0"/><path fill="${pink}" stroke="${ink}" stroke-width="2.2" d="M${cx + 1} ${y + 10}q3 6 6 0z"/>`,
      sad: `<path ${S(2.8)} d="M${cx - 5} ${y + 11}q5 -5 10 0"/><path fill="#8ec5e8" stroke="${ink}" stroke-width="1.8" d="M${cx + e + 2} ${y + 4}q-3 5 0 7q3 -2 0 -7z"/>`,
      think: `<path ${S(2.8)} d="M${cx - 3} ${y + 9}h7"/>`,
    }[mood];
    const cheek = `<ellipse cx="${cx - e - 7}" cy="${y + 6}" rx="4" ry="2.6" fill="${pink}" opacity=".8"/><ellipse cx="${cx + e + 7}" cy="${y + 6}" rx="4" ry="2.6" fill="${pink}" opacity=".8"/>`;
    return cheek + eyes + mouth;
  };
  const arms = {
    happy: `<path ${S(3)} d="M27 62c-8-6-12-12-14-16M93 62c8 4 12 8 14 12"/>`,
    yum: `<path ${S(3)} d="M27 62c-8 6-12 10-14 12M93 62c8-6 11-12 12-17"/>`,
    sad: `<path ${S(3)} d="M27 62c-6 6-9 12-10 16M93 62c6 6 9 12 10 16"/>`,
    think: `<path ${S(3)} d="M27 62c-8 6-12 10-14 12M93 60c6 0 8 6 2 10l-12 4"/>`,
  };
  const extra = { think: `<text x="98" y="30" font-family="Jua,sans-serif" font-size="26" fill="${acc}">?</text>`, yum: "", sad: "", happy: "" };
  return (mood = "happy", cls = "bap") => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path fill="#ffffff" stroke="${ink}" stroke-width="3" d="M60 14c22 0 34 22 34 46s-14 42-34 42-34-18-34-42 12-46 34-46z"/>
    <path fill="#f3ece1" d="M78 30c8 10 11 22 10 34-4-12-7-22-10-34z"/>${face(mood)}${arms[mood]}${extra[mood]}</svg>`;
})();
