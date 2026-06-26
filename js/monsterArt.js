/* =========================================================================
 *  monsterArt.js — 위험요소 의인화 몬스터 벡터 아트
 *  철학: 이름 없이 외형만으로 위험요소를 즉시 알아볼 수 있어야 한다.
 *  스타일: 브롤스타즈/궁수의전설/쿠키런 풍 — 단순하지만 특징이 강한 캐주얼 벡터.
 *  각 함수는 원점(0,0) 기준, 반지름 r 안에 그린다. c=[주색,보조색,눈색], t=시간, tier=레벨.
 * ========================================================================= */
G.monsterArt = (function () {

  /* ---------------- 공통 헬퍼 ---------------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // 귀여운 눈 (흰자+검은자+하이라이트)
  function cuteEye(ctx, x, y, w, h, look) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(x + (look || 0) * w * 0.3, y + h * 0.2, Math.min(w, h) * 0.55, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + (look || 0) * w * 0.3 + w * 0.2, y - h * 0.1, Math.min(w, h) * 0.22, 0, 6.28); ctx.fill();
  }
  function smile(ctx, x, y, w, lw, col) {
    ctx.strokeStyle = col || '#1a1a2e'; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, w, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
  }
  function bolt(ctx, x1, y1, len, col, lw, t) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1);
    let x = x1, y = y1;
    for (let i = 0; i < 4; i++) { x += (Math.random() - 0.5) * len * 0.6; y += len * 0.25; ctx.lineTo(x, y); }
    ctx.stroke();
  }

  /* ================================================================== *
   *  교통사고 — 자동차 (헤드라이트 눈 / 범퍼 입 / 경광등 / 타이어 발 / 스크래치)
   * ================================================================== */
  function car(ctx, r, c, t, tier) {
    const wob = Math.sin(t * 6) * r * 0.05;
    // 타이어(발)
    [-1, 1].forEach(s => {
      const yy = r * 0.82 + (s > 0 ? wob : -wob);
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(s * r * 0.5, yy, r * 0.27, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#9aa0a6'; ctx.beginPath(); ctx.arc(s * r * 0.5, yy, r * 0.11, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(s * r * 0.5, yy, r * 0.04, 0, 6.28); ctx.fill();
    });
    // 차체(빨강)
    ctx.fillStyle = c[0]; rr(ctx, -r * 0.85, -r * 0.6, r * 1.7, r * 1.3, r * 0.32); ctx.fill();
    // 검정 하부
    ctx.fillStyle = '#1a1a1a'; rr(ctx, -r * 0.85, r * 0.32, r * 1.7, r * 0.42, r * 0.22); ctx.fill();
    // 앞유리 반사
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, -r * 0.62, -r * 0.45, r * 1.24, r * 0.42, r * 0.16); ctx.fill();
    // 경광등(머리) — 깜빡임
    const bl = 0.55 + 0.45 * Math.abs(Math.sin(t * 5));
    ctx.fillStyle = '#2b2b2b'; rr(ctx, -r * 0.14, -r * 0.8, r * 0.28, r * 0.14, r * 0.05); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ffc828'; ctx.shadowBlur = r * 0.4 * bl;
    ctx.fillStyle = `rgba(255,200,40,${bl})`; ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.17, Math.PI, 0); ctx.fill();
    ctx.restore();
    // 헤드라이트(눈)
    [-1, 1].forEach(s => {
      ctx.save(); ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = r * 0.2;
      ctx.fillStyle = '#fff8c0'; ctx.beginPath(); ctx.ellipse(s * r * 0.4, -r * 0.15, r * 0.2, r * 0.16, 0, 0, 6.28); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(s * r * 0.4, -r * 0.15, r * 0.1, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(s * r * 0.42, -r * 0.13, r * 0.045, 0, 6.28); ctx.fill();
    });
    // 범퍼(입) — 금속바 + 그릴 + 볼트
    ctx.fillStyle = '#cfd4da'; rr(ctx, -r * 0.55, r * 0.04, r * 1.1, r * 0.24, r * 0.1); ctx.fill();
    ctx.strokeStyle = '#7d838a'; ctx.lineWidth = r * 0.03;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.2, r * 0.06); ctx.lineTo(i * r * 0.2, r * 0.26); ctx.stroke(); }
    ctx.fillStyle = '#8a9099';
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * r * 0.46, r * 0.16, r * 0.035, 0, 6.28); ctx.fill(); });
    // 스크래치(티어↑일수록 많음)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = r * 0.022;
    for (let i = 0; i < 2 + tier; i++) {
      const x = (-0.55 + (i * 0.33) % 1.1) * r, y = -r * 0.3 + (i % 2) * r * 0.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.14, y + r * 0.22); ctx.stroke();
    }
  }

  /* ================================================================== *
   *  화재 — 불꽃 몸 / 숯 눈 / 머리 불꽃 / 횃불 손 / 화염 꼬리
   * ================================================================== */
  function fireBody(ctx, r, scale, col, t, ph) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(-r * 0.68 * scale, r * 0.72);
    ctx.quadraticCurveTo(-r * 0.98 * scale, 0, -r * 0.42 * scale, -r * 0.28);
    ctx.quadraticCurveTo(-r * 0.55 * scale, -r * 0.72 + Math.sin(t * 8 + ph) * r * 0.08, -r * 0.16 * scale, -r * 0.5);
    ctx.quadraticCurveTo(0, -r * (1.05 * scale) - Math.sin(t * 6 + ph) * r * 0.12, r * 0.18 * scale, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.55 * scale, -r * 0.72 + Math.cos(t * 7 + ph) * r * 0.08, r * 0.45 * scale, -r * 0.28);
    ctx.quadraticCurveTo(r * 0.98 * scale, 0, r * 0.68 * scale, r * 0.72);
    ctx.quadraticCurveTo(0, r * 0.92, -r * 0.68 * scale, r * 0.72);
    ctx.closePath(); ctx.fill();
  }
  function fire(ctx, r, c, t, tier) {
    // 화염 꼬리/손
    [-1, 1].forEach(s => {
      ctx.fillStyle = c[1]; ctx.beginPath();
      ctx.moveTo(s * r * 0.6, r * 0.25);
      ctx.quadraticCurveTo(s * r * 1.02, r * 0.05, s * r * 0.88, -r * 0.22 + Math.sin(t * 9 + s) * r * 0.07);
      ctx.quadraticCurveTo(s * r * 0.74, r * 0.08, s * r * 0.6, r * 0.25); ctx.fill();
    });
    ctx.save(); ctx.shadowColor = c[0]; ctx.shadowBlur = r * 0.3;
    fireBody(ctx, r, 1.0, c[0], t, 0);
    ctx.restore();
    fireBody(ctx, r, 0.62, c[1], t, 1.5);
    fireBody(ctx, r, 0.30, '#fff3a0', t, 3);
    // 숯 눈
    [-1, 1].forEach(s => {
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(s * r * 0.23, -r * 0.08, r * 0.12, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * r * 0.26, -r * 0.12, r * 0.035, 0, 6.28); ctx.fill();
    });
    // 장난꾸러기 씨익 입
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = r * 0.055; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.04, r * 0.2, 0.08 * Math.PI, 0.92 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.moveTo(-r * 0.06, r * 0.22); ctx.lineTo(r * 0.06, r * 0.22); ctx.lineTo(0, r * 0.32); ctx.fill();
  }

  /* ================================================================== *
   *  보이스피싱 — 스마트폰 얼굴 / 스피커 입 / 정장 / 돈가방 / 악마 뿔
   * ================================================================== */
  function phishing(ctx, r, c, t, tier) {
    // 정장 몸통
    ctx.fillStyle = '#2c3e50'; rr(ctx, -r * 0.6, r * 0.15, r * 1.2, r * 0.78, r * 0.18); ctx.fill();
    // 셔츠 + 넥타이
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * 0.16, r * 0.15); ctx.lineTo(r * 0.16, r * 0.15); ctx.lineTo(0, r * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(0, r * 0.2); ctx.lineTo(r * 0.08, r * 0.35); ctx.lineTo(0, r * 0.7); ctx.lineTo(-r * 0.08, r * 0.35); ctx.closePath(); ctx.fill();
    // 돈가방(손)
    ctx.fillStyle = '#caa14a'; rr(ctx, r * 0.5, r * 0.4, r * 0.42, r * 0.34, r * 0.06); ctx.fill();
    ctx.strokeStyle = '#8a6d2a'; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.arc(r * 0.71, r * 0.4, r * 0.1, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#2c3e50'; ctx.font = `900 ${r * 0.26}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('₩', r * 0.71, r * 0.58);
    // 악마 뿔
    ctx.fillStyle = c[1];
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * r * 0.45, -r * 0.62); ctx.quadraticCurveTo(s * r * 0.78, -r * 1.05, s * r * 0.38, -r * 0.98); ctx.quadraticCurveTo(s * r * 0.5, -r * 0.7, s * r * 0.45, -r * 0.62); ctx.closePath(); ctx.fill(); });
    // 스마트폰 얼굴
    ctx.fillStyle = '#1a1a2e'; rr(ctx, -r * 0.62, -r * 0.78, r * 1.24, r * 1.0, r * 0.16); ctx.fill();
    ctx.fillStyle = c[0]; rr(ctx, -r * 0.52, -r * 0.68, r * 1.04, r * 0.8, r * 0.1); ctx.fill();
    // 노치
    ctx.fillStyle = '#1a1a2e'; rr(ctx, -r * 0.12, -r * 0.72, r * 0.24, r * 0.07, r * 0.035); ctx.fill();
    // 수상한 눈 (반쯤 감은)
    [-1, 1].forEach(s => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(s * r * 0.24, -r * 0.32, r * 0.16, r * 0.12, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(s * r * 0.24 + s * r * 0.04, -r * 0.28, r * 0.07, 0, 6.28); ctx.fill();
      // 윗눈꺼풀(능글)
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.rect(s * r * 0.24 - r * 0.18, -r * 0.46, r * 0.36, r * 0.12); ctx.fill();
    });
    // 스피커 입(점 격자)
    ctx.fillStyle = '#1a1a2e';
    for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(i * r * 0.1, -r * 0.02 + j * r * 0.1, r * 0.025, 0, 6.28); ctx.fill(); }
    // 음파(통화중)
    ctx.strokeStyle = c[1]; ctx.lineWidth = r * 0.03;
    for (let k = 1; k <= 2; k++) { const a = 0.4 + 0.3 * Math.sin(t * 6); ctx.globalAlpha = a / k; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.05, r * (0.18 * k), -0.5, 0.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  /* ================================================================== *
   *  해킹 — 로봇+거미 / 회로 / 초록 LED 눈 / 여러 다리 / 바이러스 아이콘
   * ================================================================== */
  function hacker(ctx, r, c, t, tier) {
    // 거미 다리 (양쪽 3쌍)
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    [-1, 1].forEach(s => {
      for (let i = 0; i < 3; i++) {
        const yy = -r * 0.25 + i * r * 0.32;
        const wob = Math.sin(t * 6 + i + (s > 0 ? 0 : 1.5)) * r * 0.1;
        ctx.beginPath(); ctx.moveTo(s * r * 0.5, yy);
        ctx.quadraticCurveTo(s * r * 1.05, yy - r * 0.18 + wob, s * r * 1.2, yy + r * 0.35); ctx.stroke();
        ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(s * r * 1.2, yy + r * 0.35, r * 0.05, 0, 6.28); ctx.fill();
      }
    });
    // 금속 몸체
    ctx.fillStyle = c[0]; rr(ctx, -r * 0.7, -r * 0.62, r * 1.4, r * 1.24, r * 0.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, -r * 0.55, -r * 0.5, r * 1.1, r * 0.4, r * 0.18); ctx.fill();
    // 회로 트레이스 (빛남)
    ctx.strokeStyle = '#39ff88'; ctx.lineWidth = r * 0.03; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.5);
    ctx.moveTo(r * 0.5, -r * 0.2); ctx.lineTo(r * 0.2, -r * 0.2); ctx.lineTo(r * 0.2, r * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#39ff88';
    [[-0.2, 0.5], [0.2, 0.1], [-0.5, 0.3], [0.5, -0.2]].forEach(p => { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * 0.04, 0, 6.28); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 초록 LED 눈 (사각)
    [-1, 1].forEach(s => {
      ctx.save(); ctx.shadowColor = '#39ff88'; ctx.shadowBlur = r * 0.25;
      ctx.fillStyle = '#0a1a12'; rr(ctx, s * r * 0.3 - r * 0.2, -r * 0.32, r * 0.4, r * 0.26, r * 0.06); ctx.fill();
      ctx.fillStyle = '#39ff88'; rr(ctx, s * r * 0.3 - r * 0.13, -r * 0.26, r * 0.26, r * 0.14, r * 0.03); ctx.fill();
      ctx.restore();
    });
    // 바이러스 아이콘 (몸)
    ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0, r * 0.34, r * 0.13, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#ff5252'; ctx.lineWidth = r * 0.035;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.13, r * 0.34 + Math.sin(a) * r * 0.13); ctx.lineTo(Math.cos(a) * r * 0.2, r * 0.34 + Math.sin(a) * r * 0.2); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = `900 ${r * 0.16}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, r * 0.34);
  }

  /* ================================================================== *
   *  홍수 — 물방울 몸 / 머리 파도 / 물 뿜는 입 / 물기둥 발
   * ================================================================== */
  function flood(ctx, r, c, t, tier) {
    // 물기둥 발
    ctx.fillStyle = c[1]; ctx.globalAlpha = 0.8;
    [-1, 1].forEach(s => { rr(ctx, s * r * 0.42 - r * 0.1, r * 0.55, r * 0.2, r * 0.4, r * 0.08); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 물방울 몸 (티어드롭)
    ctx.fillStyle = c[0]; ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.1, r * 0.8, r * 0.4);
    ctx.quadraticCurveTo(r * 0.6, r * 0.85, 0, r * 0.82);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.85, -r * 0.8, r * 0.4);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.1, 0, -r * 0.95);
    ctx.closePath(); ctx.fill();
    // 광택
    ctx.fillStyle = c[1]; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.2, r * 0.16, r * 0.26, -0.3, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    // 머리 파도 (말려 올라간 크레스트)
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.2, -r * 1.05, r * 0.3, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.7, r * 0.5, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.35, -r * 0.62, r * 0.15, -r * 0.5);
    ctx.quadraticCurveTo(-r * 0.1, -r * 0.75, -r * 0.5, -r * 0.55);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // 눈
    cuteEye(ctx, -r * 0.25, -r * 0.08, r * 0.16, r * 0.18);
    cuteEye(ctx, r * 0.25, -r * 0.08, r * 0.16, r * 0.18);
    // 물 뿜는 입(O자) + 물줄기
    ctx.fillStyle = '#0a3a5a'; ctx.beginPath(); ctx.ellipse(0, r * 0.28, r * 0.13, r * 0.16, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = c[1]; ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) { const yy = r * 0.4 + ((t * 1.5 + i * 0.33) % 1) * r * 0.5; ctx.beginPath(); ctx.arc(G.rng ? (i - 1) * r * 0.08 : 0, yy, r * 0.05, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  /* ================================================================== *
   *  태풍 — 회오리 몸 / 태풍의 눈 / 바람 팔 / 도는 번개
   * ================================================================== */
  function typhoon(ctx, r, c, t, tier) {
    // 회오리 깔때기 (위 넓고 아래 좁음, 회전 밴드)
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const k = i / bands;
      const yy = -r * 0.8 + k * r * 1.6;
      const w = r * (0.9 - k * 0.55);
      const off = Math.sin(t * 3 + i * 0.8) * r * 0.12;
      ctx.fillStyle = i % 2 ? c[0] : c[1];
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.ellipse(off, yy, w, r * 0.18, 0, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 바람 팔(양쪽 소용돌이)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.05; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * r * 0.85, -r * 0.05, r * 0.22, 0.2 + t * 2, 0.2 + t * 2 + 4.5); ctx.stroke(); });
    ctx.globalAlpha = 1;
    // 태풍의 눈 (중앙 캐릭터 눈)
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.34, 0, 6.28); ctx.fill();
    cuteEye(ctx, -r * 0.13, -r * 0.15, r * 0.12, r * 0.14);
    cuteEye(ctx, r * 0.13, -r * 0.15, r * 0.12, r * 0.14);
    smile(ctx, 0, -r * 0.02, r * 0.12, r * 0.04);
    // 도는 번개
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = r * 0.04;
    const ba = t * 2.5;
    ctx.save(); ctx.translate(Math.cos(ba) * r * 0.7, -r * 0.1 + Math.sin(ba) * r * 0.4);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.lineTo(r * 0.05, 0); ctx.lineTo(-r * 0.03, r * 0.04); ctx.lineTo(r * 0.04, r * 0.16); ctx.stroke();
    ctx.restore();
  }

  /* ================================================================== *
   *  낙뢰 — 번개 몸 / 노란 전기 / 손끝 번개 / 푸른 눈
   * ================================================================== */
  function lightning(ctx, r, c, t, tier) {
    // 번개 모양 몸체
    ctx.save(); ctx.shadowColor = '#ffe14d'; ctx.shadowBlur = r * 0.35;
    ctx.fillStyle = c[0]; ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.9);
    ctx.lineTo(r * 0.45, -r * 0.85);
    ctx.lineTo(r * 0.05, -r * 0.2);
    ctx.lineTo(r * 0.55, -r * 0.1);
    ctx.lineTo(-r * 0.15, r * 0.92);
    ctx.lineTo(r * 0.05, r * 0.1);
    ctx.lineTo(-r * 0.5, r * 0.05);
    ctx.lineTo(-r * 0.1, -r * 0.45);
    ctx.lineTo(-r * 0.55, -r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // 내부 밝은 코어
    ctx.fillStyle = c[1]; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.55); ctx.lineTo(r * 0.18, -r * 0.5); ctx.lineTo(-r * 0.05, r * 0.4); ctx.lineTo(-r * 0.15, -r * 0.1); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // 푸른 눈
    [-1, 1].forEach(s => {
      ctx.save(); ctx.shadowColor = '#40c4ff'; ctx.shadowBlur = r * 0.2;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * r * 0.12 - r * 0.05, -r * 0.18, r * 0.1, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#2979ff'; ctx.beginPath(); ctx.arc(s * r * 0.12 - r * 0.05, -r * 0.16, r * 0.05, 0, 6.28); ctx.fill();
      ctx.restore();
    });
    // 손끝 번개 발사 (양쪽)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.035; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 20);
    [-1, 1].forEach(s => { bolt(ctx, s * r * 0.4, r * 0.0, r * 0.4, '#fff', r * 0.03, t); });
    ctx.globalAlpha = 1;
  }

  /* ================================================================== *
   *  바이러스 — 가시 돋친 균체 / 십자 눈 / 변종 표정
   * ================================================================== */
  function virus(ctx, r, c, t, tier) {
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * 6.28 + t * 0.4;
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = c[0];
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.78); ctx.lineTo(0, -r * 1.12); ctx.lineTo(r * 0.1, -r * 0.78); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 1.14, r * 0.09, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 6.28); ctx.fill();
    ctx.fillStyle = c[1]; ctx.globalAlpha = 0.5;
    [[-0.3, -0.2, 0.16], [0.35, 0.1, 0.12], [-0.1, 0.4, 0.1], [0.15, -0.45, 0.09]].forEach(p => { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, p[2] * r, 0, 6.28); ctx.fill(); });
    ctx.globalAlpha = 1;
    cuteEye(ctx, -r * 0.25, -r * 0.05, r * 0.15, r * 0.17, 0.3);
    cuteEye(ctx, r * 0.25, -r * 0.05, r * 0.15, r * 0.17, -0.3);
    smile(ctx, 0, r * 0.22, r * 0.2, r * 0.05);
  }

  /* ================================================================== *
   *  빙판 악마 — 얼음 결정 / 서리 / 고드름 / 차가운 표정
   * ================================================================== */
  function ice(ctx, r, c, t, tier) {
    // 얼음 결정 몸 (육각)
    ctx.save(); ctx.shadowColor = c[1]; ctx.shadowBlur = r * 0.25;
    ctx.fillStyle = c[0]; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 - Math.PI / 2; const rad = i % 2 ? r * 0.95 : r * 0.85; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill(); ctx.restore();
    // 내부 반짝임
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.2, 0); ctx.lineTo(0, r * 0.5); ctx.lineTo(-r * 0.2, 0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // 고드름(아래)
    ctx.fillStyle = c[1];
    [-0.4, 0, 0.4].forEach(x => { ctx.beginPath(); ctx.moveTo(x * r - r * 0.08, r * 0.7); ctx.lineTo(x * r + r * 0.08, r * 0.7); ctx.lineTo(x * r, r * 0.98); ctx.closePath(); ctx.fill(); });
    // 차가운 눈
    cuteEye(ctx, -r * 0.24, -r * 0.05, r * 0.14, r * 0.15);
    cuteEye(ctx, r * 0.24, -r * 0.05, r * 0.14, r * 0.15);
    // 떨리는 입
    ctx.strokeStyle = '#1a3a5e'; ctx.lineWidth = r * 0.04; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const x = -r * 0.2 + i * r * 0.066; const y = r * 0.28 + (i % 2 ? r * 0.05 : 0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }

  /* ================================================================== *
   *  도둑 고블린 — 복면 / 줄무늬 셔츠 / 돈자루
   * ================================================================== */
  function thief(ctx, r, c, t, tier) {
    // 돈자루(등에 멘)
    ctx.fillStyle = '#d8d8d0'; ctx.beginPath(); ctx.arc(r * 0.6, r * 0.1, r * 0.4, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#caa14a'; ctx.font = `900 ${r * 0.3}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', r * 0.6, r * 0.12);
    ctx.fillStyle = '#9a8a6a'; ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.25); ctx.lineTo(r * 0.8, -r * 0.25); ctx.lineTo(r * 0.6, -r * 0.05); ctx.closePath(); ctx.fill();
    // 몸(녹색 고블린)
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.28); ctx.fill();
    // 귀
    [-1, 1].forEach(s => { ctx.fillStyle = c[0]; ctx.beginPath(); ctx.moveTo(s * r * 0.7, -r * 0.2); ctx.lineTo(s * r * 1.1, -r * 0.5); ctx.lineTo(s * r * 0.6, -r * 0.55); ctx.closePath(); ctx.fill(); });
    // 줄무늬 셔츠(아래)
    ctx.fillStyle = '#222'; for (let i = 0; i < 3; i++) { rr(ctx, -r * 0.7, r * 0.35 + i * r * 0.16, r * 1.4, r * 0.08, r * 0.04); ctx.fill(); }
    // 복면(눈가리개)
    ctx.fillStyle = '#1a1a1a'; rr(ctx, -r * 0.62, -r * 0.28, r * 1.24, r * 0.26, r * 0.1); ctx.fill();
    // 눈(흰 째진)
    [-1, 1].forEach(s => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(s * r * 0.26, -r * 0.15, r * 0.12, r * 0.07, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(s * r * 0.28, -r * 0.15, r * 0.04, 0, 6.28); ctx.fill(); });
    // 능글 입
    smile(ctx, 0, r * 0.12, r * 0.16, r * 0.045);
  }

  /* ================================================================== *
   *  산불 피닉스 — 불새 / 화염 날개 / 부리 / 볏
   * ================================================================== */
  function phoenix(ctx, r, c, t, tier) {
    // 화염 날개
    [-1, 1].forEach(s => {
      ctx.fillStyle = c[1]; ctx.beginPath();
      ctx.moveTo(s * r * 0.4, 0);
      ctx.quadraticCurveTo(s * r * 1.3, -r * (0.5 + Math.sin(t * 6) * 0.12), s * r * 1.15, r * 0.35);
      ctx.quadraticCurveTo(s * r * 0.8, r * 0.0, s * r * 0.4, 0); ctx.fill();
      ctx.fillStyle = c[0]; ctx.beginPath();
      ctx.moveTo(s * r * 0.4, 0);
      ctx.quadraticCurveTo(s * r * 1.0, -r * 0.3, s * r * 0.9, r * 0.25);
      ctx.quadraticCurveTo(s * r * 0.65, r * 0.0, s * r * 0.4, 0); ctx.fill();
    });
    // 몸통
    ctx.save(); ctx.shadowColor = c[0]; ctx.shadowBlur = r * 0.25;
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.5, r * 0.62, 0, 0, 6.28); ctx.fill(); ctx.restore();
    // 볏(불꽃)
    ctx.fillStyle = c[1];
    [-0.18, 0, 0.18].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x * r - r * 0.08, -r * 0.5); ctx.quadraticCurveTo(x * r, -r * (0.95 + (i === 1 ? 0.1 : 0)) - Math.sin(t * 7 + i) * r * 0.06, x * r + r * 0.08, -r * 0.5); ctx.fill(); });
    // 눈
    cuteEye(ctx, -r * 0.16, -r * 0.18, r * 0.12, r * 0.14);
    cuteEye(ctx, r * 0.16, -r * 0.18, r * 0.12, r * 0.14);
    // 부리
    ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.0); ctx.lineTo(r * 0.1, r * 0.0); ctx.lineTo(0, r * 0.22); ctx.closePath(); ctx.fill();
    // 꼬리 불꽃
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.6); ctx.quadraticCurveTo(0, r * 1.1, r * 0.2, r * 0.6); ctx.quadraticCurveTo(0, r * 0.8, -r * 0.2, r * 0.6); ctx.fill();
  }

  /* ================================================================== *
   *  보험사기 팬텀 — 유령 + 가짜 서류(✓) / 능글 가면
   * ================================================================== */
  function phantom(ctx, r, c, t, tier) {
    // 유령 몸
    ctx.fillStyle = c[0]; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.78, Math.PI, 0);
    const waves = 5;
    for (let i = 0; i <= waves; i++) { const x = r * 0.78 - (i / waves) * r * 1.56; const y = r * 0.62 + (i % 2 ? r * 0.18 : 0) + Math.sin(t * 4 + i) * r * 0.04; ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // 가짜 서류
    ctx.fillStyle = '#fff'; rr(ctx, r * 0.3, r * 0.0, r * 0.5, r * 0.6, r * 0.04); ctx.fill();
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = r * 0.02;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(r * 0.38, r * 0.12 + i * r * 0.12); ctx.lineTo(r * 0.72, r * 0.12 + i * r * 0.12); ctx.stroke(); }
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.42, r * 0.42); ctx.lineTo(r * 0.52, r * 0.54); ctx.lineTo(r * 0.72, r * 0.18); ctx.stroke();
    // 능글 눈
    cuteEye(ctx, -r * 0.26, -r * 0.18, r * 0.14, r * 0.16, 0.4);
    cuteEye(ctx, r * 0.0, -r * 0.18, r * 0.14, r * 0.16, 0.4);
    // 음흉한 미소
    smile(ctx, -r * 0.13, -r * 0.0, r * 0.18, r * 0.045);
  }

  /* ================================================================== *
   *  폭설 예티 — 눈 덮인 털복숭이 / 파란 코 / 눈보라
   * ================================================================== */
  function storm(ctx, r, c, t, tier) {
    // 몸(털)
    ctx.fillStyle = c[0]; ctx.beginPath();
    const pts = 16; for (let i = 0; i <= pts; i++) { const a = i / pts * 6.28; const wob = 1 + Math.sin(a * 8) * 0.06; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.85 * wob, Math.sin(a) * r * 0.85 * wob); } ctx.closePath(); ctx.fill();
    // 눈 쌓임(머리)
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.7, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.7, r * 0.2, 0, 0, Math.PI); ctx.fill();
    // 눈
    cuteEye(ctx, -r * 0.26, -r * 0.05, r * 0.15, r * 0.17);
    cuteEye(ctx, r * 0.26, -r * 0.05, r * 0.15, r * 0.17);
    // 파란 코
    ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.1, 0, 6.28); ctx.fill();
    // 입
    smile(ctx, 0, r * 0.3, r * 0.16, r * 0.045);
    // 눈송이
    ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const yy = -r + ((t * 0.7 + i * 0.2) % 1) * r * 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc((i - 2) * r * 0.4, yy, r * 0.05, 0, 6.28); ctx.fill(); } ctx.globalAlpha = 1;
  }

  /* ================================================================== *
   *  산업재해 로봇 — 안전모 / 경고 줄무늬 / 렌치·기어
   * ================================================================== */
  function industrial(ctx, r, c, t, tier) {
    // 기어(어깨 뒤)
    ctx.fillStyle = '#78909c'; ctx.save(); ctx.translate(r * 0.6, -r * 0.4); ctx.rotate(t);
    for (let i = 0; i < 8; i++) { ctx.rotate(6.28 / 8); ctx.fillRect(-r * 0.06, -r * 0.42, r * 0.12, r * 0.16); } ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 6.28); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#455a64'; ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.4, r * 0.12, 0, 6.28); ctx.fill();
    // 몸체
    ctx.fillStyle = c[0]; rr(ctx, -r * 0.7, -r * 0.45, r * 1.4, r * 1.3, r * 0.2); ctx.fill();
    // 경고 줄무늬
    ctx.fillStyle = '#1a1a1a';
    for (let i = -1; i <= 2; i++) { ctx.save(); ctx.beginPath(); rr(ctx, -r * 0.7, r * 0.45, r * 1.4, r * 0.3, r * 0.06); ctx.clip(); ctx.beginPath(); ctx.moveTo(-r * 0.7 + i * r * 0.4, r * 0.45); ctx.lineTo(-r * 0.4 + i * r * 0.4, r * 0.45); ctx.lineTo(-r * 0.7 + i * r * 0.4, r * 0.75); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // 안전모
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.62, Math.PI, 0); ctx.fill();
    ctx.fillRect(-r * 0.7, -r * 0.5, r * 1.4, r * 0.1); ctx.fillStyle = '#ffb300'; ctx.fillRect(-r * 0.08, -r * 1.05, r * 0.16, r * 0.2);
    // LED 눈
    [-1, 1].forEach(s => { ctx.save(); ctx.shadowColor = '#ff7043'; ctx.shadowBlur = r * 0.2; ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.arc(s * r * 0.26, -r * 0.1, r * 0.1, 0, 6.28); ctx.fill(); ctx.restore(); });
    // 입(격자)
    ctx.fillStyle = '#1a1a1a'; rr(ctx, -r * 0.25, r * 0.15, r * 0.5, r * 0.16, r * 0.05); ctx.fill();
    ctx.strokeStyle = c[0]; ctx.lineWidth = r * 0.03; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.12, r * 0.15); ctx.lineTo(i * r * 0.12, r * 0.31); ctx.stroke(); }
  }

  /* ================================================================== *
   *  반려괴수 — 발바닥 / 목줄 / 장난스러운 표정
   * ================================================================== */
  function pet(ctx, r, c, t, tier) {
    // 몸
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 6.28); ctx.fill();
    // 귀
    [-1, 1].forEach(s => { ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(s * r * 0.5, -r * 0.65, r * 0.22, r * 0.32, s * 0.4, 0, 6.28); ctx.fill(); ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(s * r * 0.5, -r * 0.6, r * 0.1, r * 0.18, s * 0.4, 0, 6.28); ctx.fill(); });
    // 목줄
    ctx.fillStyle = '#e53935'; rr(ctx, -r * 0.7, r * 0.4, r * 1.4, r * 0.16, r * 0.06); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.1, 0, 6.28); ctx.fill();
    // 눈
    cuteEye(ctx, -r * 0.26, -r * 0.08, r * 0.16, r * 0.18);
    cuteEye(ctx, r * 0.26, -r * 0.08, r * 0.16, r * 0.18);
    // 코+입(고양이형)
    ctx.fillStyle = '#5a3a3a'; ctx.beginPath(); ctx.moveTo(-r * 0.06, r * 0.14); ctx.lineTo(r * 0.06, r * 0.14); ctx.lineTo(0, r * 0.22); ctx.fill();
    ctx.strokeStyle = '#5a3a3a'; ctx.lineWidth = r * 0.03; ctx.beginPath(); ctx.moveTo(0, r * 0.22); ctx.lineTo(0, r * 0.3); ctx.moveTo(0, r * 0.3); ctx.arc(-r * 0.1, r * 0.3, r * 0.1, 0, Math.PI); ctx.moveTo(r * 0.2, r * 0.3); ctx.arc(r * 0.1, r * 0.3, r * 0.1, 0, Math.PI); ctx.stroke();
    // 발바닥(앞발)
    ctx.fillStyle = c[1]; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * r * 0.35, r * 0.7, r * 0.16, 0, 6.28); ctx.fill(); });
  }

  /* ================================================================== *
   *  AI — 스크린 얼굴 로봇 / 안테나 / 파형 입
   * ================================================================== */
  function ai(ctx, r, c, t, tier) {
    ctx.fillStyle = c[0]; rr(ctx, -r * 0.78, -r * 0.68, r * 1.56, r * 1.5, r * 0.32); ctx.fill();
    ctx.strokeStyle = c[1]; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(0, -r * 0.68); ctx.lineTo(0, -r * 1.0); ctx.stroke();
    ctx.save(); ctx.shadowColor = '#ff5252'; ctx.shadowBlur = r * 0.25 * (0.6 + 0.4 * Math.sin(t * 6)); ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0, -r * 1.05, r * 0.1, 0, 6.28); ctx.fill(); ctx.restore();
    // 스크린
    ctx.fillStyle = '#081427'; rr(ctx, -r * 0.58, -r * 0.45, r * 1.16, r * 0.66, r * 0.12); ctx.fill();
    // 눈
    [-1, 1].forEach(s => { ctx.save(); ctx.shadowColor = c[2]; ctx.shadowBlur = r * 0.2; ctx.fillStyle = c[2]; rr(ctx, s * r * 0.3 - r * 0.1, -r * 0.3, r * 0.2, r * 0.14, r * 0.04); ctx.fill(); ctx.restore(); });
    // 파형 입
    ctx.strokeStyle = '#39f6ff'; ctx.lineWidth = r * 0.05; ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const x = -r * 0.34 + i * r * 0.057; const y = -r * 0.02 + Math.sin(i + t * 8) * r * 0.06; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }

  function _default(ctx, r, c, t, tier) {
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, 6.28); ctx.fill();
    cuteEye(ctx, -r * 0.25, -r * 0.1, r * 0.16, r * 0.18);
    cuteEye(ctx, r * 0.25, -r * 0.1, r * 0.16, r * 0.18);
    smile(ctx, 0, r * 0.15, r * 0.2, r * 0.05);
  }

  const ART = { car, fire, flood, phishing, virus, typhoon, ice, lightning, thief, phoenix, phantom, hacker, storm, industrial, pet, ai };

  function draw(ctx, key, r, colors, t, tier) {
    (ART[key] || _default)(ctx, r, colors, t, tier || 0);
  }

  return { draw, ART, rr, cuteEye, smile };
})();
