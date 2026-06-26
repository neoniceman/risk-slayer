/* =========================================================================
 *  main.js — 부트스트랩. 렌더러 초기화 → 시작 오버레이 → 게임 시작
 * ========================================================================= */
(function () {
  const canvas = document.getElementById('canvas');
  G.render.init(canvas);

  // Replicate 로 생성한 존 배경이 assets/bg/<zoneId>.png 로 존재하면 자동 사용
  G.data.zones.forEach(z => {
    const img = new Image();
    img.onload = () => G.render.setZoneImage(z.id, img.src);
    img.src = 'assets/bg/' + z.id + '.png';
  });

  function start() {
    const ov = document.getElementById('startOverlay');
    ov.classList.add('hide');
    setTimeout(() => ov.remove(), 500);
    G.audio.ensure(); G.audio.resume();
    G.game.init();
  }

  const btn = document.getElementById('startBtn');
  btn.addEventListener('click', start, { once: true });
  // 화면 아무 곳이나 눌러도 시작
  document.getElementById('startOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'startOverlay') start();
  }, { once: true });

  // 더블탭 줌 방지
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
})();
