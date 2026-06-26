/* =========================================================================
 *  render.js — Canvas 벡터 렌더러 / 몬스터 아트 / 이펙트 / 배경 / 카메라
 * ========================================================================= */
G.render = (function () {
  let canvas, ctx, W = 0, H = 0, dpr = 1;
  let bgImageCache = {}; // zoneId -> Image (Replicate 배경, 있으면 사용)
  let t = 0;             // 전역 시간(초)

  // 카메라 흔들림
  const shake = { x: 0, y: 0, mag: 0, decay: 0 };

  // 몬스터 시각 상태
  const mon = {
    art: 'car', colors: ['#ff6b6b', '#ffd23f', '#fff'], tier: 0,
    hitTimer: 0,  // 피격 스쿼시
    deathTimer: 0, // >0 이면 폭발 중
    spawnTimer: 0, scale: 1, isBoss: false, angryFlash: 0
  };

  /* ---------- 풀: 대미지 숫자 ---------- */
  const dmgPool = G.Pool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, text: '', crit: false, color: '#fff', size: 1 }),
    (o) => { o.life = 0; }
  );
  /* ---------- 풀: 파티클 ---------- */
  const partPool = G.Pool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 4, color: '#fff', kind: 'spark', rot: 0, vr: 0, g: 0 }),
    (o) => { o.life = 0; }
  );
  /* ---------- 풀: 슬래시/링 이펙트 ---------- */
  const fxPool = G.Pool(
    () => ({ x: 0, y: 0, life: 0, max: 1, kind: 'ring', color: '#fff', size: 1, rot: 0 }),
    (o) => { o.life = 0; }
  );
  // 화면 전체 플래시
  let flash = { a: 0, color: '#fff' };

  /* ------------------------------------------------------------------ */
  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function center() { return { x: W / 2, y: H * 0.42 }; }

  /* ---------- 외부에서 몬스터 설정 ---------- */
  function setMonster(def, isBoss, tier) {
    mon.art = def.art || def.id || def.shape || 'car';
    mon.colors = def.colors;
    mon.tier = isBoss ? Math.max(4, tier || 0) : (tier || 0);
    mon.isBoss = !!isBoss; mon.spawnTimer = 0.45; mon.deathTimer = 0; mon.hitTimer = 0;
  }
  function hitMonster(crit) { mon.hitTimer = crit ? 0.22 : 0.13; mon.angryFlash = crit ? 1 : 0.5; }
  function killMonster() { mon.deathTimer = 0.5; }

  /* ---------- 이펙트 스폰 API ---------- */
  function damageNumber(text, crit, x, y, color) {
    const c = center();
    const o = dmgPool.obtain();
    o.x = (x == null ? c.x + G.rng.range(-40, 40) : x);
    o.y = (y == null ? c.y - 20 : y);
    o.vx = G.rng.range(-30, 30);
    o.vy = G.rng.range(-150, -110);
    o.life = 0; o.max = crit ? 1.0 : 0.8; o.text = text; o.crit = crit;
    o.color = color || (crit ? '#ffd23f' : '#ffffff');
    o.size = crit ? 1.0 : 0.7;
  }
  function particles(n, opts) {
    const c = center();
    for (let i = 0; i < n; i++) {
      const p = partPool.obtain();
      const ang = opts.ang != null ? opts.ang : G.rng.range(0, Math.PI * 2);
      const spd = G.rng.range(opts.spdMin || 60, opts.spdMax || 260);
      p.x = (opts.x == null ? c.x : opts.x) + G.rng.range(-10, 10);
      p.y = (opts.y == null ? c.y : opts.y) + G.rng.range(-10, 10);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - (opts.up || 0);
      p.life = 0; p.max = opts.life || G.rng.range(0.4, 0.8);
      p.size = opts.size || G.rng.range(3, 7);
      p.color = opts.color || G.rng.pick(['#ffd23f', '#ff6b6b', '#fff', '#ffae42']);
      p.kind = opts.kind || 'spark';
      p.g = opts.g != null ? opts.g : 420;
      p.rot = G.rng.range(0, 6.28); p.vr = G.rng.range(-8, 8);
    }
  }
  function ring(x, y, color, size) {
    const o = fxPool.obtain();
    const c = center();
    o.x = x == null ? c.x : x; o.y = y == null ? c.y : y;
    o.life = 0; o.max = 0.4; o.kind = 'ring'; o.color = color || '#fff'; o.size = size || 60;
  }
  function slash(x, y, color) {
    const o = fxPool.obtain();
    const c = center();
    o.x = x == null ? c.x + G.rng.range(-30, 30) : x;
    o.y = y == null ? c.y + G.rng.range(-30, 30) : y;
    o.life = 0; o.max = 0.22; o.kind = 'slash'; o.color = color || '#fff';
    o.size = G.rng.range(50, 90); o.rot = G.rng.range(-0.8, 0.8);
  }
  function screenFlash(color, a) { flash.color = color; flash.a = Math.max(flash.a, a); }
  function addShake(mag) { shake.mag = Math.max(shake.mag, mag); shake.decay = 0.0001; }
  function coinBurst(n) {
    const c = center();
    for (let i = 0; i < n; i++) {
      const p = partPool.obtain();
      p.x = c.x + G.rng.range(-30, 30); p.y = c.y - 30;
      p.vx = G.rng.range(-140, 140); p.vy = G.rng.range(-320, -180);
      p.life = 0; p.max = G.rng.range(0.7, 1.1); p.size = G.rng.range(7, 11);
      p.color = '#ffd23f'; p.kind = 'coin'; p.g = 700; p.rot = 0; p.vr = G.rng.range(-12, 12);
    }
  }

  /* ------------------------------------------------------------------ *
   *  업데이트
   * ------------------------------------------------------------------ */
  function update(dt) {
    t += dt;
    // 카메라
    if (shake.mag > 0.1) {
      shake.x = G.rng.range(-shake.mag, shake.mag);
      shake.y = G.rng.range(-shake.mag, shake.mag);
      shake.mag *= Math.pow(0.001, dt); // 빠르게 감쇠
      if (shake.mag < 0.1) { shake.mag = 0; shake.x = shake.y = 0; }
    }
    if (mon.hitTimer > 0) mon.hitTimer -= dt;
    if (mon.angryFlash > 0) mon.angryFlash -= dt * 3;
    if (mon.spawnTimer > 0) mon.spawnTimer -= dt;
    if (mon.deathTimer > 0) mon.deathTimer -= dt;
    if (flash.a > 0) flash.a -= dt * 3;

    dmgPool.update(dt, (o, d) => { o.life += d; o.vy += 300 * d; o.x += o.vx * d; o.y += o.vy * d; return o.life >= o.max; });
    partPool.update(dt, (o, d) => {
      o.life += d; o.vx *= Math.pow(0.2, d); o.vy += o.g * d;
      o.x += o.vx * d; o.y += o.vy * d; o.rot += o.vr * d; return o.life >= o.max;
    });
    fxPool.update(dt, (o, d) => { o.life += d; return o.life >= o.max; });
  }

  /* ------------------------------------------------------------------ *
   *  드로잉
   * ------------------------------------------------------------------ */
  function draw(state) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawBackground(state.zone, state.isBoss);
    drawMonster(state);
    drawParticles();
    drawFx();
    drawDamageNumbers();

    ctx.restore();

    if (flash.a > 0) {
      ctx.save();
      ctx.globalAlpha = G.math.clamp(flash.a, 0, 0.7);
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawBackground(zone, isBoss) {
    const img = zone && bgImageCache[zone.id];
    if (img && img.complete && img.naturalWidth) {
      // 커버 핏
      const ar = img.naturalWidth / img.naturalHeight, car = W / H;
      let dw = W, dh = H, dx = 0, dy = 0;
      if (ar > car) { dh = H; dw = H * ar; dx = (W - dw) / 2; } else { dw = W; dh = W / ar; dy = (H - dh) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const sky = zone ? zone.sky : ['#7fb2ff', '#cfe4ff'];
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 패럴랙스 언덕
      const ground = zone ? zone.ground : '#5b6b8c';
      ctx.fillStyle = ground;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.6);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.6 + Math.sin(x * 0.01 + t * 0.2) * 12);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ground;
      ctx.fillRect(0, H * 0.72, W, H * 0.28);
      // 떠다니는 별/구름
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 8; i++) {
        const x = (i * 137 + t * 12 * (i % 2 ? 1 : -1)) % (W + 100) - 50;
        const y = 40 + (i * 53) % (H * 0.45);
        ctx.fillStyle = (zone && (zone.id === 'space' || zone.id === 'cyber')) ? '#fff' : 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc((x + W) % W, y, (zone && (zone.id === 'space' || zone.id === 'cyber')) ? 1.6 : 14, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 보스 시 적색 비네팅
    if (isBoss) {
      const rg = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.42, H * 0.7);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(120,0,0,0.45)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // 몬스터를 배경에서 분리하는 부드러운 스포트라이트 헤일로 (배경 이미지 사용 시)
    const c = center();
    const r = monRadius();
    const usingImg = img && img.complete && img.naturalWidth;
    if (usingImg) {
      const sp = ctx.createRadialGradient(c.x, c.y, r * 0.45, c.x, c.y, r * 1.75);
      sp.addColorStop(0, 'rgba(8,5,22,0)');
      sp.addColorStop(0.5, 'rgba(8,5,22,0.38)');
      sp.addColorStop(1, 'rgba(8,5,22,0)');
      ctx.fillStyle = sp;
      ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.75, 0, 6.28); ctx.fill();
    }
    // 바닥 그림자(몬스터)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + r * 0.95, r * 0.8, r * 0.22, 0, 0, 6.28);
    ctx.fill();
  }

  function monRadius() {
    const base = Math.min(W, H) * (mon.isBoss ? 0.28 : 0.21);
    return base;
  }

  function drawMonster(state) {
    if (mon.deathTimer > 0) {
      // 폭발 중엔 본체 대신 폭발 파편(이미 파티클로 처리됨) — 빈 처리
      return;
    }
    const c = center();
    let r = monRadius();

    // 스폰 등장(아래에서 튀어오름)
    let bob = Math.sin(t * 2) * (r * 0.03);
    let sx = 1, sy = 1, alpha = 1, yoff = 0;
    if (mon.spawnTimer > 0) {
      const k = 1 - mon.spawnTimer / 0.45;
      alpha = k; yoff = (1 - G.math.easeOutBack(k)) * 80;
      sx = sy = 0.7 + 0.3 * k;
    }
    // 피격 스쿼시
    if (mon.hitTimer > 0) {
      const k = mon.hitTimer / 0.22;
      sx = 1 + 0.12 * k; sy = 1 - 0.12 * k;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(c.x, c.y + bob + yoff);
    const tierScale = 1 + mon.tier * 0.03;
    ctx.scale(sx * tierScale, sy * tierScale);

    // 티어 오라/스파이크 (몸 뒤)
    tierAuraBehind(r, mon.colors, mon.tier);
    // 의인화 몬스터 본체
    G.monsterArt.draw(ctx, mon.art, r, mon.colors, t, mon.tier);
    // 티어 궤도 에너지 / 전투손상 (몸 위)
    tierFxFront(r, mon.colors, mon.tier);
    // 피격 흰색 플래시
    if (mon.angryFlash > 0) {
      ctx.globalAlpha = G.math.clamp(mon.angryFlash, 0, 1) * 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------- 티어(레벨) 진화 연출 ---------- */
  function tierAuraBehind(r, colors, tier) {
    if (tier <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    // 맥동 오라
    for (let i = tier; i >= 1; i--) {
      ctx.globalAlpha = 0.08 * pulse * (i / tier) + 0.03;
      ctx.fillStyle = colors[1];
      ctx.beginPath(); ctx.arc(0, 0, r * (1.05 + i * 0.07 + pulse * 0.05), 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 위협적인 스파이크 (티어 3+)
    if (tier >= 3) {
      ctx.fillStyle = colors[0];
      const n = 8 + tier;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + t * 0.3;
        const ix = Math.cos(a), iy = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(ix * r * 0.85 - iy * r * 0.08, iy * r * 0.85 + ix * r * 0.08);
        ctx.lineTo(ix * r * (1.05 + (i % 2) * 0.08), iy * r * (1.05 + (i % 2) * 0.08));
        ctx.lineTo(ix * r * 0.85 + iy * r * 0.08, iy * r * 0.85 - ix * r * 0.08);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  function tierFxFront(r, colors, tier) {
    if (tier < 1) return;
    // 궤도 에너지 입자
    const n = tier * 3;
    for (let i = 0; i < n; i++) {
      const a = t * 2 + i / n * 6.28;
      const rad = r * (1.12 + 0.06 * Math.sin(t * 4 + i));
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.85;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = i % 2 ? colors[1] : '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, r * 0.045 * (1 + tier * 0.08), 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 전투 손상(균열) — 티어 2+
    if (tier >= 2) {
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = r * 0.022; ctx.lineCap = 'round';
      for (let i = 0; i < tier; i++) {
        const bx = (-0.45 + i * 0.32) * r, by = -r * 0.35 + (i % 2) * r * 0.3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + r * 0.1, by + r * 0.18); ctx.lineTo(bx - r * 0.04, by + r * 0.34); ctx.stroke();
      }
    }
  }


  function drawParticles() {
    for (const p of partPool.active) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = k;
      if (p.kind === 'coin') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * Math.abs(Math.cos(p.rot)) + 1, p.size, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#ffae42'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4, 0, 6.28); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'star') {
        drawStar(p.x, p.y, 5, p.size, p.size * 0.45, p.color, p.rot);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, 6.28); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawStar(cx, cy, spikes, outer, inner, color, rot) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * 6.28 - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  function drawFx() {
    for (const o of fxPool.active) {
      const k = o.life / o.max;
      ctx.globalAlpha = 1 - k;
      if (o.kind === 'ring') {
        ctx.strokeStyle = o.color; ctx.lineWidth = 4 * (1 - k);
        ctx.beginPath(); ctx.arc(o.x, o.y, o.size * (0.3 + k), 0, 6.28); ctx.stroke();
      } else if (o.kind === 'slash') {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
        ctx.strokeStyle = o.color; ctx.lineWidth = 8 * (1 - k); ctx.lineCap = 'round';
        const len = o.size * (0.5 + k);
        ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDamageNumbers() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of dmgPool.active) {
      const k = o.life / o.max;
      const pop = k < 0.2 ? G.math.lerp(0.5, 1.15, k / 0.2) : G.math.lerp(1.15, 1, (k - 0.2) / 0.8);
      const size = (o.crit ? 42 : 28) * o.size * pop;
      ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.font = `900 ${size}px system-ui, sans-serif`;
      ctx.lineWidth = size * 0.14; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(o.text, o.x, o.y);
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, o.x, o.y);
      if (o.crit) {
        ctx.font = `900 ${size * 0.45}px system-ui`; ctx.fillStyle = '#fff';
        ctx.fillText('CRITICAL!', o.x, o.y - size * 0.65);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Replicate 배경 등록 ---------- */
  function setZoneImage(zoneId, url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    bgImageCache[zoneId] = img;
  }

  return {
    init, update, draw, center, monRadius,
    setMonster, hitMonster, killMonster,
    damageNumber, particles, ring, slash, screenFlash, addShake, coinBurst,
    setZoneImage,
    get W() { return W; }, get H() { return H; }
  };
})();
