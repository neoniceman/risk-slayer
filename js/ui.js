/* =========================================================================
 *  ui.js — DOM HUD / 탭 입력 / 스킬바 / 패널 / 토스트 / 모달
 * ========================================================================= */
G.ui = (function () {
  let api = null;
  let curPanel = null;
  let lastNeed = 10;
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function shakeEl(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); G.audio.play('error'); G.haptic.light(); }

  /* ============================ 초기화 ============================ */
  function init(_api) {
    api = _api;
    buildSkillbar();
    bindTap();
    bindNav();
    refreshTopBar();
    refreshSkills();
    refreshTitleBar();
    setInterval(livePanelTick, 250);
  }

  /* ---------- 탭 입력 ---------- */
  function bindTap() {
    const layer = $('tapLayer');
    let armed = true;
    function handle(e) {
      e.preventDefault();
      const touches = e.changedTouches ? e.changedTouches.length : 1;
      for (let i = 0; i < Math.min(touches, 5); i++) api.performTap();
      spawnTapRipple(e);
    }
    layer.addEventListener('touchstart', handle, { passive: false });
    layer.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) handle(e); });
  }
  function spawnTapRipple(e) {
    const p = e.changedTouches ? e.changedTouches[0] : e;
    if (!p) return;
    const r = el('div', 'tap-ripple');
    r.style.left = p.clientX + 'px'; r.style.top = p.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 400);
  }

  /* ============================ 상단바 ============================ */
  function refreshTopBar() {
    const s = api.state;
    $('resGold').textContent = G.fmt.num(s.gold);
    $('resDia').textContent = G.fmt.int(s.dia);
    $('resSafety').textContent = G.fmt.int(s.safety);
    $('resInsurance').textContent = G.fmt.int(s.insurance);
    // 패널 전체를 재렌더링하지 않는다(버튼이 손가락 밑에서 사라지는 버그 방지).
    // 구매 가능 여부만 제자리 갱신.
  }
  // 골드 변동에 따른 '구매 가능' 상태만 DOM 교체 없이 갱신 (250ms 간격 호출)
  function livePanelTick() {
    if (curPanel === 'upgrade') updateUpgradeAfford();
    else if (curPanel === 'prestige') updatePerkAfford();
    else if (curPanel === 'equip') updateEquipAfford();
  }
  function updateEquipAfford() {
    const s = api.state;
    document.querySelectorAll('#panelBody .eq-up[data-up]').forEach(b => {
      const item = s.inv.find(x => x.id == b.dataset.up) || Object.values(s.equipped).find(x => x && x.id == b.dataset.up);
      if (item) b.classList.toggle('no', s.gold < api.itemUpgradeCost(item));
    });
  }
  function updateUpgradeAfford() {
    const s = api.state;
    document.querySelectorAll('#panelBody .up-row').forEach(row => {
      const id = row.dataset.up; const def = api.D.upgrades.find(u => u.id === id); if (!def) return;
      const lvl = s.upgrades[id] || 0;
      const locked = def.unlock && s.maxStage < def.unlock;
      const maxed = def.max && lvl >= def.max;
      const afford = s.gold >= api.upgradeCost(def) && !maxed && !locked;
      row.classList.toggle('dim', !afford);
      const btn = row.querySelector('.up-buy');
      if (btn && !locked && !maxed) btn.classList.toggle('no', !afford);
    });
  }
  function updatePerkAfford() {
    const s = api.state;
    document.querySelectorAll('#panelBody [data-perk]').forEach(btn => {
      const p = api.PERKS.find(x => x.id === btn.dataset.perk); if (!p) return;
      const afford = s.safety >= api.perkCost(p);
      btn.classList.toggle('no', !afford);
      btn.closest('.up-row').classList.toggle('dim', !afford);
    });
  }
  function refreshTitleBar() {
    const s = api.state;
    $('stageNum').textContent = '스테이지 ' + s.stage;
    $('zoneName').textContent = api.zoneForStage(s.stage).name;
    $('playerTitle').textContent = api.titleForStage(s.maxStage);
    const st = api.computeStats();
    $('statTap').textContent = G.fmt.num(st.tap);
    $('statDps').textContent = G.fmt.num(st.dps);
  }

  /* ============================ 몬스터 ============================ */
  function onMonsterSpawn(cur, zone) {
    lastNeed = cur.isBoss ? 1 : 10;
    $('monName').textContent = cur.def.name + (cur.isBoss ? ' 👑' : '');
    $('monName').classList.toggle('boss', cur.isBoss);
    updateMonsterHP(cur);
    $('bossTimer').style.display = cur.isBoss ? 'block' : 'none';
    updateStageProgress(api.state.killsInStage, lastNeed);
    refreshTitleBar();
  }
  function updateMonsterHP(cur) {
    const pct = Math.max(0, cur.hp / cur.maxHp) * 100;
    $('hpFill').style.width = pct + '%';
    $('hpText').textContent = G.fmt.num(Math.max(0, cur.hp)) + ' / ' + G.fmt.num(cur.maxHp);
  }
  function updateBossTimer(t) {
    $('bossTimer').textContent = '⏱ ' + G.fmt.clock(t);
    $('bossTimer').classList.toggle('danger', t < 10);
  }
  function bossTimeout() { toast('보스가 체력을 회복했습니다!', '#ff5252'); }

  function updateStageProgress(k, need) {
    $('stageProg').textContent = need > 1 ? `${k} / ${need}` : 'BOSS';
    $('stageProgFill').style.width = (need > 1 ? (k / need * 100) : 0) + '%';
  }

  function onKill(gold, boss) {
    floatText('+' + G.fmt.num(gold) + ' G', '#ffd23f');
    refreshTopBar();
  }
  function onStageAdvance(stage, zone) {
    refreshTitleBar();
    const b = $('stageBanner');
    b.textContent = api.isBossStage(stage) ? '⚠ 보스 등장!' : zone.name + ' · 스테이지 ' + stage;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  /* ============================ 콤보 ============================ */
  function updateCombo(count, timer) {
    const c = $('combo');
    if (count >= 3) {
      c.style.display = 'block';
      c.textContent = count + ' COMBO';
      c.style.transform = `translateX(-50%) scale(${1 + Math.min(count, 50) * 0.01})`;
      c.style.color = count > 30 ? '#ff5252' : count > 15 ? '#ffae42' : '#ffd23f';
    } else c.style.display = 'none';
  }

  /* ============================ 버프 표시 ============================ */
  function updateBuffs(buffs, autotaps) {
    const host = $('buffs');
    const items = [];
    for (const b of buffs) items.push(`<div class="buff">⚡ ${b.value}배 <b>${Math.ceil(b.remain)}s</b></div>`);
    for (const a of autotaps) items.push(`<div class="buff auto">🔥 자동연타 <b>${Math.ceil(a.remain)}s</b></div>`);
    host.innerHTML = items.join('');
  }

  /* ============================ 스킬바 ============================ */
  function buildSkillbar() {
    const bar = $('skillbar');
    bar.innerHTML = '';
    api.D.skills.forEach(def => {
      const b = el('button', 'skill-btn');
      b.dataset.skill = def.id;
      b.innerHTML = `<span class="sk-icon">${def.icon}</span><span class="sk-cd"></span><span class="sk-name">${def.name}</span>`;
      b.addEventListener('click', () => {
        const ok = api.useSkill(def.id);
        if (!ok) {
          shakeEl(b);
          if (!api.skillUnlocked(def)) toast(`${def.name}: 스테이지 ${def.unlock} 해금`, '#ff5a6e');
          else if (!api.skillReady(def.id)) toast(`${def.name}: 쿨타임 ${Math.ceil(api.state.skillCd[def.id] || 0)}초`, '#9aa0c8');
        }
      });
      bar.appendChild(b);
    });
    setInterval(refreshSkills, 200);
  }
  function refreshSkills() {
    const s = api.state;
    document.querySelectorAll('.skill-btn').forEach(b => {
      const id = b.dataset.skill;
      const def = api.D.skills.find(x => x.id === id);
      const unlocked = api.skillUnlocked(def);
      b.classList.toggle('locked', !unlocked);
      const cd = s.skillCd[id] || 0;
      const cdEl = b.querySelector('.sk-cd');
      if (!unlocked) { cdEl.textContent = '🔒' + def.unlock; b.classList.remove('ready'); }
      else if (cd > 0) { cdEl.textContent = Math.ceil(cd); b.classList.remove('ready'); b.style.setProperty('--cd', (cd / def.cd * 100) + '%'); }
      else { cdEl.textContent = ''; b.classList.add('ready'); b.style.setProperty('--cd', '0%'); }
    });
  }

  /* ============================ 바텀 네비 & 패널 ============================ */
  const PANELS = [
    { id: 'upgrade', name: '강화', icon: '💪' },
    { id: 'equip', name: '장비', icon: '🛡️' },
    { id: 'prestige', name: '환생', icon: '♻️' },
    { id: 'collection', name: '도감', icon: '📖' },
    { id: 'daily', name: '일일', icon: '🎁' },
    { id: 'settings', name: '설정', icon: '⚙️' }
  ];
  function bindNav() {
    const nav = $('bottomnav');
    PANELS.forEach(p => {
      const b = el('button', 'nav-btn');
      b.innerHTML = `<span>${p.icon}</span><small>${p.name}</small>`;
      b.addEventListener('click', () => { G.audio.play('tab'); togglePanel(p.id); });
      b.dataset.panel = p.id;
      nav.appendChild(b);
    });
  }
  function togglePanel(id) {
    if (curPanel === id) { closePanel(); return; }
    curPanel = id;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    const host = $('panelHost');
    host.classList.add('open');
    renderPanel(id);
  }
  function closePanel() {
    curPanel = null;
    $('panelHost').classList.remove('open');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  }
  function refreshPanel() { if (curPanel) renderPanel(curPanel); }
  function renderPanel(id) {
    const host = $('panelHost');
    const head = `<div class="panel-head"><h2>${PANELS.find(p => p.id === id).name}</h2><button class="close-btn" id="closePanel">✕</button></div>`;
    host.innerHTML = head + `<div class="panel-body" id="panelBody"></div>`;
    $('closePanel').addEventListener('click', closePanel);
    ({ upgrade: renderUpgrades, equip: renderEquip, prestige: renderPrestige, collection: renderCollection, daily: renderDaily, settings: renderSettings }[id])();
  }
  // game.js 가 호출하는 새로고침 훅
  function refreshUpgrades() { if (curPanel === 'upgrade') renderUpgrades(); }
  function refreshEquip() { if (curPanel === 'equip') renderEquip(); }
  function refreshPrestige() { if (curPanel === 'prestige') renderPrestige(); }

  /* ---------- 강화 패널 ---------- */
  function renderUpgrades() {
    const body = $('panelBody'); if (!body) return;
    const scroll = body.scrollTop;
    const s = api.state;
    let h = '';
    api.D.upgrades.forEach(def => {
      const lvl = s.upgrades[def.id] || 0;
      const locked = def.unlock && s.maxStage < def.unlock;
      const maxed = def.max && lvl >= def.max;
      const cost = api.upgradeCost(def);
      const afford = s.gold >= cost && !maxed && !locked;
      h += `<div class="up-row ${afford ? '' : 'dim'}" data-up="${def.id}">
        <div class="up-icon">${locked ? '🔒' : def.icon}</div>
        <div class="up-mid">
          <div class="up-name">${def.name} <span class="up-lvl">Lv.${lvl}${def.max ? '/' + def.max : ''}</span></div>
          <div class="up-desc">${locked ? '스테이지 ' + def.unlock + ' 해금' : def.desc}</div>
        </div>
        <button class="up-buy ${afford ? '' : 'no'}" data-buy="${def.id}">
          ${locked ? '🔒' : maxed ? 'MAX' : '<small>골드</small>' + G.fmt.num(cost)}
        </button></div>`;
    });
    h += `<div class="bulk-row">구매:
      <button class="bulk" data-bulk="1">x1</button>
      <button class="bulk" data-bulk="10">x10</button>
      <button class="bulk" data-bulk="max">MAX</button></div>`;
    body.innerHTML = h;
    body.scrollTop = scroll;
    let bulk = body._bulk || 1; body._bulk = bulk;
    body.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.buy;
      const def = api.D.upgrades.find(u => u.id === id);
      const ok = api.buyUpgrade(id, body._bulk);
      if (ok) { refreshTitleBar(); }
      else {
        // 실패 피드백: 흔들림 + 사유 토스트
        shakeEl(btn);
        if (def.unlock && s.maxStage < def.unlock) toast(`스테이지 ${def.unlock} 에서 해금됩니다`, '#ff5a6e');
        else if (def.max && (s.upgrades[id] || 0) >= def.max) toast('이미 최대 레벨입니다', '#9aa0c8');
        else toast('골드가 부족합니다', '#ff5a6e');
      }
    }));
    body.querySelectorAll('.bulk').forEach(btn => btn.addEventListener('click', () => {
      body._bulk = btn.dataset.bulk === 'max' ? 'max' : parseInt(btn.dataset.bulk);
      body.querySelectorAll('.bulk').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    }));
    body.querySelector(`.bulk[data-bulk="${body._bulk}"]`)?.classList.add('sel');
  }

  /* ---------- 장비 패널 ---------- */
  function renderEquip() {
    const body = $('panelBody'); if (!body) return;
    const s = api.state;
    let h = '<div class="equip-grid">';
    api.D.slots.forEach(slot => {
      const item = s.equipped[slot.id];
      const rar = item ? api.D.rarities[item.rarity] : null;
      h += `<div class="eq-slot" style="border-color:${rar ? rar.color : '#33405e'}">
        <div class="eq-ic">${slot.icon}</div>
        <div class="eq-nm">${slot.name}</div>
        ${item ? `<div class="eq-rar" style="color:${rar.color}">${rar.name} +${item.level}</div>
          <div class="eq-pow">+${(api.itemPower(item) * 100).toFixed(0)}% ${statName(slot.stat)}</div>
          <button class="eq-up" data-up="${item.id}">강화 ${G.fmt.num(api.itemUpgradeCost(item))}</button>`
          : '<div class="eq-empty">미장착</div>'}
      </div>`;
    });
    h += '</div>';
    // 인벤토리(미장착)
    const others = s.inv.filter(it => s.equipped[it.slot] !== it);
    if (others.length) {
      h += '<h3 class="inv-h">보유 장비</h3><div class="inv-grid">';
      others.slice(-30).reverse().forEach(it => {
        const slot = api.D.slots.find(x => x.id === it.slot);
        const rar = api.D.rarities[it.rarity];
        h += `<div class="inv-item" style="border-color:${rar.color}">
          <div class="ii-ic">${slot.icon}</div>
          <div class="ii-rar" style="color:${rar.color}">${rar.name}</div>
          <div class="ii-pow">+${(api.itemPower(it) * 100).toFixed(0)}%</div>
          <div class="ii-btns"><button data-equip="${it.id}">장착</button><button class="sell" data-sell="${it.id}">판매</button></div>
        </div>`;
      });
      h += '</div>';
    }
    body.innerHTML = h;
    const find = (id) => s.inv.find(x => x.id == id) || Object.values(s.equipped).find(x => x && x.id == id);
    body.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
      const item = find(b.dataset.up);
      const ok = api.upgradeItem(item);
      if (!ok) { shakeEl(b); toast('골드가 부족합니다', '#ff5a6e'); }
      else refreshTitleBar();
    }));
    body.querySelectorAll('[data-equip]').forEach(b => b.addEventListener('click', () => {
      api.equipItem(find(b.dataset.equip)); refreshTitleBar(); toast('장착 완료!', '#5fe08a');
    }));
    body.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => {
      const val = api.sellItem(find(b.dataset.sell));
      if (val) toast(`판매 완료 +${G.fmt.num(val)} G`, '#ffd23f');
      else { shakeEl(b); toast('판매할 수 없습니다', '#ff5a6e'); }
    }));
  }
  function statName(s) { return { tap: '탭공격', dps: '자동공격', all: '전체공격', gold: '골드', crit: '치명타' }[s] || s; }

  /* ---------- 환생 패널 ---------- */
  function renderPrestige() {
    const body = $('panelBody'); if (!body) return;
    const s = api.state;
    const gain = api.prestigeGain();
    let h = `<div class="prestige-top">
      <div class="big-res">🛡️ <b>${G.fmt.int(s.safety)}</b> 안전포인트</div>
      <div class="prestige-info">현재 환생 시 <b style="color:#39f6ff">+${G.fmt.int(gain)}</b> 획득<br>
      <small>스테이지 50 이상부터 환생 가능 (현재 최고 ${s.maxStage})</small></div>
      <button class="prestige-btn ${gain > 0 ? '' : 'no'}" id="doPrestige">♻️ 환생하기</button>
    </div><h3 class="inv-h">영구 능력 (안전포인트 소비)</h3>`;
    api.PERKS.forEach(p => {
      const lvl = s.perks[p.id] || 0;
      const cost = api.perkCost(p);
      const afford = s.safety >= cost;
      h += `<div class="up-row ${afford ? '' : 'dim'}">
        <div class="up-icon">${p.icon}</div>
        <div class="up-mid"><div class="up-name">${p.name} <span class="up-lvl">Lv.${lvl}</span></div><div class="up-desc">${p.desc}</div></div>
        <button class="up-buy ${afford ? '' : 'no'}" data-perk="${p.id}"><small>🛡️</small>${G.fmt.int(cost)}</button>
      </div>`;
    });
    body.innerHTML = h;
    $('doPrestige').addEventListener('click', () => {
      if (api.prestigeGain() <= 0) return;
      confirmModal('환생하시겠습니까?', `스테이지·골드·강화·장비가 초기화되고<br><b>안전포인트 +${api.prestigeGain()}</b> 를 얻습니다.<br>영구 능력·다이아·도감·업적은 유지됩니다.`, () => {
        api.doPrestige();
      });
    });
    body.querySelectorAll('[data-perk]').forEach(b => b.addEventListener('click', () => {
      const ok = api.buyPerk(b.dataset.perk);
      if (ok) { refreshTitleBar(); toast('영구 능력 강화!', '#39f6ff'); }
      else { shakeEl(b); toast('안전포인트가 부족합니다', '#ff5a6e'); }
    }));
  }
  function afterPrestige(gain) {
    closePanel();
    toast(`환생 완료! 안전포인트 +${gain} 🛡️`, '#39f6ff');
    refreshTopBar(); refreshTitleBar();
    onMonsterSpawn(api.cur, api.zoneForStage(api.state.stage));
  }

  /* ---------- 도감/업적 패널 ---------- */
  function renderCollection() {
    const body = $('panelBody'); if (!body) return;
    const s = api.state;
    let h = '<div class="tabs"><button class="tab sel" data-t="mon">몬스터</button><button class="tab" data-t="ach">업적</button></div><div id="colBody"></div>';
    body.innerHTML = h;
    const show = (t) => {
      const cb = $('colBody');
      if (t === 'mon') {
        let g = '<div class="dex-grid">';
        for (const id in api.D.monsters) {
          const m = api.D.monsters[id];
          const seen = s.seenMonsters[id];
          g += `<div class="dex-cell ${seen ? '' : 'unseen'}">
            <div class="dex-emoji">${seen ? m.emoji : '❓'}</div>
            <div class="dex-name">${seen ? m.name : '???'}</div></div>`;
        }
        g += '</div>'; cb.innerHTML = g;
      } else {
        let g = '<div class="ach-list">';
        api.D.achievements.forEach(a => {
          const done = s.achDone[a.id];
          const val = Math.min(api.metricValue(a.metric), a.goal);
          g += `<div class="ach-row ${done ? 'done' : ''}">
            <div class="ach-ic">${done ? '🏆' : '🔒'}</div>
            <div class="ach-mid"><div class="ach-nm">${a.name}</div><div class="ach-desc">${a.desc}</div>
              <div class="ach-bar"><div style="width:${val / a.goal * 100}%"></div></div></div>
            <div class="ach-dia">💎${a.dia}</div></div>`;
        });
        g += '</div>'; cb.innerHTML = g;
      }
    };
    show('mon');
    body.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
      body.querySelectorAll('.tab').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); G.audio.play('tab'); show(b.dataset.t);
    }));
  }

  /* ---------- 일일 패널 ---------- */
  function renderDaily() {
    const body = $('panelBody'); if (!body) return;
    const s = api.state; const today = new Date().toISOString().slice(0, 10);
    const attendDone = s.daily.lastAttend === today;
    const rouletteDone = s.daily.roulette === today;
    const boxDone = s.daily.freebox === today;
    let h = `<div class="daily-card">
      <h3>📅 출석체크 <small>${s.daily.attendDay}/7일</small></h3>
      <div class="attend-row">`;
    for (let i = 1; i <= 7; i++) h += `<div class="attend-day ${i <= s.daily.attendDay ? 'got' : ''} ${i === 7 ? 'big' : ''}">${i === 7 ? '🎁' : i}</div>`;
    h += `</div><button class="big-btn ${attendDone ? 'no' : ''}" id="attendBtn">${attendDone ? '오늘 완료 ✓' : '출석하고 보상받기'}</button></div>`;
    h += `<div class="daily-card"><h3>🎰 행운 룰렛</h3><button class="big-btn ${rouletteDone ? 'no' : ''}" id="rouletteBtn">${rouletteDone ? '오늘 완료 ✓' : '룰렛 돌리기'}</button></div>`;
    h += `<div class="daily-card"><h3>📦 무료 상자</h3><button class="big-btn ${boxDone ? 'no' : ''}" id="boxBtn">${boxDone ? '오늘 완료 ✓' : '무료 상자 열기'}</button></div>`;
    body.innerHTML = h;
    $('attendBtn').addEventListener('click', () => { const r = api.claimAttendance(); if (r) { rewardModal('🎉 출석 보상', describeReward(r.reward)); renderDaily(); refreshTopBar(); } });
    $('rouletteBtn').addEventListener('click', () => { const r = api.spinRoulette(); if (r) { rewardModal('🎰 룰렛 당첨!', describeReward(r.reward)); renderDaily(); refreshTopBar(); } });
    $('boxBtn').addEventListener('click', () => { const it = api.openFreeBox(); if (it) { const rar = api.D.rarities[it.rarity]; rewardModal('📦 상자 개봉!', `<span style="color:${rar.color}">${rar.name}</span> 장비 + 💎5 획득!`); renderDaily(); refreshTopBar(); } });
  }
  function describeReward(r) {
    const parts = [];
    if (r.dia) parts.push(`💎 ${r.dia}`);
    if (r.gold) parts.push('💰 대량 골드');
    if (r.item != null) parts.push(`<span style="color:${api.D.rarities[r.item].color}">${api.D.rarities[r.item].name}</span> 장비`);
    return parts.join(' + ');
  }

  /* ---------- 설정 패널 ---------- */
  function renderSettings() {
    const body = $('panelBody'); if (!body) return;
    const s = api.state;
    body.innerHTML = `
      <div class="set-row"><span>🔊 효과음</span><label class="switch"><input type="checkbox" id="setSound" ${s.settings.sound ? 'checked' : ''}><span class="slider"></span></label></div>
      <div class="set-row"><span>📳 진동</span><label class="switch"><input type="checkbox" id="setVib" ${s.settings.vibrate ? 'checked' : ''}><span class="slider"></span></label></div>
      <div class="set-stats">
        <div>총 처치 <b>${G.fmt.int(s.stats.kills)}</b></div>
        <div>총 탭 <b>${G.fmt.int(s.stats.taps)}</b></div>
        <div>보스 처치 <b>${G.fmt.int(s.stats.bossKills)}</b></div>
        <div>환생 <b>${G.fmt.int(s.stats.prestiges)}</b></div>
        <div>최고 스테이지 <b>${s.maxStage}</b></div>
        <div>플레이 시간 <b>${G.fmt.time(s.stats.playSec)}</b></div>
      </div>
      <button class="wipe-btn" id="wipeBtn">⚠ 데이터 초기화</button>
      <div class="credit">보험 히어로즈 : 리스크 슬레이어 v1.0</div>`;
    $('setSound').addEventListener('change', e => api.setSound(e.target.checked));
    $('setVib').addEventListener('change', e => api.setVibrate(e.target.checked));
    $('wipeBtn').addEventListener('click', () => confirmModal('정말 초기화할까요?', '모든 진행 상황이 삭제됩니다.', () => api.wipe()));
  }

  /* ============================ 보상/드랍 알림 ============================ */
  function bossReward(item, equipped) {
    const rar = api.D.rarities[item.rarity];
    const slot = api.D.slots.find(s => s.id === item.slot);
    modalHTML(`<div class="reward-modal">
      <h2>👑 보스 격파!</h2>
      <div class="reward-item" style="border-color:${rar.color}">
        <div class="ri-ic">${slot.icon}</div>
        <div class="ri-rar" style="color:${rar.color}">${rar.name}</div>
        <div class="ri-nm">${slot.name}</div>
        ${equipped ? '<div class="ri-new">✨ 자동 장착!</div>' : ''}
      </div>
      <div class="reward-sub">💎 +3 · 🛡️ +1</div>
      <button class="big-btn" onclick="this.closest('.modal-bg').remove()">확인</button>
    </div>`);
    refreshTopBar();
  }
  function itemDrop(item) {
    const rar = api.D.rarities[item.rarity];
    toast(`${rar.name} 장비 획득!`, rar.color);
  }
  function achievementUnlocked(a) {
    const t = el('div', 'ach-toast');
    t.innerHTML = `🏆 업적 달성!<br><b>${a.name}</b><br>💎 +${a.dia}`;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
    refreshTopBar();
  }

  /* ============================ 오프라인 모달 ============================ */
  function showOffline(off) {
    modalHTML(`<div class="reward-modal">
      <h2>🌙 방치 수익</h2>
      <p class="off-time">${G.fmt.time(off.elapsed)} 동안 자리를 비웠습니다</p>
      <div class="off-gold">💰 ${G.fmt.num(off.gold)}</div>
      <div class="off-btns">
        <button class="big-btn" id="offClaim">받기</button>
        <button class="big-btn gold-x2" id="offClaim2">📺 2배로 받기</button>
      </div></div>`);
    const close = () => document.querySelector('.modal-bg')?.remove();
    $('offClaim').addEventListener('click', () => { api.claimOffline(off, false); close(); });
    $('offClaim2').addEventListener('click', () => { api.claimOffline(off, true); close(); });
  }

  /* ============================ 공통 모달/토스트 ============================ */
  function modalHTML(inner) {
    const bg = el('div', 'modal-bg');
    bg.innerHTML = `<div class="modal">${inner}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
    $('modalHost').appendChild(bg);
    return bg;
  }
  function confirmModal(title, msg, onYes) {
    const bg = modalHTML(`<div class="reward-modal"><h2>${title}</h2><p>${msg}</p>
      <div class="off-btns"><button class="big-btn no-btn" id="cfNo">취소</button><button class="big-btn" id="cfYes">확인</button></div></div>`);
    bg.querySelector('#cfYes').addEventListener('click', () => { onYes(); bg.remove(); });
    bg.querySelector('#cfNo').addEventListener('click', () => bg.remove());
  }
  function rewardModal(title, body) {
    modalHTML(`<div class="reward-modal"><h2>${title}</h2><div class="reward-sub" style="font-size:20px;margin:18px 0">${body}</div>
      <button class="big-btn" onclick="this.closest('.modal-bg').remove()">확인</button></div>`);
  }
  function toast(msg, color) {
    const t = el('div', 'toast');
    t.style.background = color || '#2a3450';
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2000);
  }
  function floatText(txt, color) {
    const f = el('div', 'float-gold');
    f.textContent = txt; f.style.color = color;
    $('floatHost').appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  return {
    init, onMonsterSpawn, updateMonsterHP, updateBossTimer, bossTimeout,
    updateStageProgress, onKill, onStageAdvance, updateCombo, updateBuffs,
    refreshSkills, refreshUpgrades, refreshEquip, refreshPrestige, refreshTopBar,
    bossReward, itemDrop, achievementUnlocked, afterPrestige, showOffline, toast
  };
})();
