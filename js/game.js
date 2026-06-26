/* =========================================================================
 *  game.js — 게임 상태 / 전투 / 성장 / 스킬 / 방치 / 환생 / 장비 / 업적 / 일일
 *  메인 루프 포함. UI 는 G.ui 를 통해 갱신(느슨한 결합).
 * ========================================================================= */
G.game = (function () {
  const D = G.data;
  const MONSTERS_PER_STAGE = 10;
  const BASE_TAP = 8;
  const HP_GROWTH = 1.225;
  const GOLD_RATE = 0.17;
  const OFFLINE_CAP_H = 8;

  let state = null;
  let cur = null;            // 현재 몬스터 {hp,maxHp,def,isBoss,bossTimer}
  let buffs = [];            // 액티브 버프 [{kind:'mult',value,remain}]
  let autotaps = [];         // [{remain, rate, value, acc}]
  let stat = null;           // 캐시된 전투 스탯
  let pendingTaps = 0;       // 리스폰 간격 중 입력된 탭(버퍼) — "항상 때릴 대상" 보장
  let comboCount = 0, comboTimer = 0;
  let lastFrame = 0, acc = 0;
  let stageClearAnim = 0;

  /* ============================ 상태 ============================ */
  function defaultState() {
    return {
      gold: 0, dia: 0, insurance: 0, safety: 0,
      stage: 1, maxStage: 1, killsInStage: 0,
      upgrades: {}, perks: { atk: 0, gold: 0, crit: 0, start: 0 },
      skillCd: {},
      inv: [], equipped: {},
      stats: { kills: 0, bossKills: 0, taps: 0, prestiges: 0, totalGold: 0, playSec: 0, equippedCount: 0, legend: 0 },
      achDone: {},
      seenMonsters: {},
      daily: { attendDay: 0, lastAttend: '', roulette: '', freebox: '' },
      settings: { sound: true, vibrate: true },
      autoAdvance: true,
      lastSeen: Date.now(),
      created: Date.now()
    };
  }

  let saveDisabled = false;  // wipe 후 reload 시 옛 상태 재저장 방지
  function save() { if (saveDisabled) return; state.lastSeen = Date.now(); G.storage.save(state); }
  function queueSave() { if (saveDisabled) return; G.storage.queueSave(() => { state.lastSeen = Date.now(); return state; }); }

  /* ============================ 파생 스탯 ============================ */
  function equipBonus() {
    const b = { tap: 0, dps: 0, all: 0, gold: 0, crit: 0 };
    for (const slotId in state.equipped) {
      const item = state.equipped[slotId];
      if (!item) continue;
      const slot = D.slots.find(s => s.id === slotId);
      const rar = D.rarities[item.rarity];
      const power = slot.base * rar.mult * (1 + item.level * 0.12) * item.roll;
      b[slot.stat] += power;
    }
    return b;
  }
  function buffMult() {
    let m = 1;
    for (const bf of buffs) if (bf.kind === 'mult') m *= bf.value;
    return m;
  }
  function computeStats() {
    const u = state.upgrades, L = id => u[id] || 0;
    const eq = equipBonus();
    const allMul = 1 + L('allmul') * 0.05;
    const prestigeAtk = 1 + (state.perks.atk || 0) * 0.15;
    const global = allMul * prestigeAtk * (1 + eq.all) * buffMult();

    const tapU = D.upgrades.find(x => x.id === 'tap');
    let tap = BASE_TAP * Math.pow(tapU.dmgG, L('tap')) * (1 + eq.tap) * global;
    let dps = 0;
    for (const h of D.upgrades) if (h.type === 'hero') { const lv = L(h.id); if (lv > 0) dps += h.heroBase * Math.pow(h.dmgG, lv); }
    dps = dps * (1 + eq.dps) * global;
    const critChance = Math.min(0.75, 0.05 + L('crit') * 0.01 + eq.crit);
    const critMult = 2 + L('critdmg') * 0.25 + (state.perks.crit || 0) * 0.10;
    const goldMul = (1 + L('gold') * 0.08 + eq.gold + (state.perks.gold || 0) * 0.20);
    return { tap, dps, critChance, critMult, goldMul };
  }
  function refreshStats() { stat = computeStats(); }

  /* ============================ 스테이지/몬스터 ============================ */
  function isBossStage(s) { return s % 20 === 0; }
  function zoneForStage(s) { return D.zones[Math.floor((s - 1) / 10) % D.zones.length]; }
  function monsterHP(s) {
    return Math.floor(10 * Math.pow(HP_GROWTH, s - 1));
  }
  function bossHP(s) { return Math.floor(monsterHP(s) * 24); }
  function goldForKill(s, boss) {
    return Math.max(1, Math.floor(monsterHP(s) * GOLD_RATE * (boss ? 18 : 1) * stat.goldMul));
  }

  function spawnMonster() {
    const s = state.stage;
    const zone = zoneForStage(s);
    const boss = isBossStage(s);
    let def, hp;
    if (boss) {
      def = D.bosses[(Math.floor(s / 20) - 1) % D.bosses.length];
      hp = bossHP(s);
    } else {
      let mid = G.rng.pick(zone.monsters);
      if (!D.monsters[mid]) mid = 'car';            // 안전 폴백
      def = Object.assign({ id: mid }, D.monsters[mid]);
      hp = monsterHP(s);
      if (!state.seenMonsters[mid]) { state.seenMonsters[mid] = true; }
    }
    cur = { hp, maxHp: hp, def, isBoss: boss, bossTimer: boss ? 30 : 0 };
    const tier = Math.min(5, Math.floor((s - 1) / 25));   // 25스테이지마다 강화 진화
    G.render.setMonster(def, boss, tier);
    if (boss) { G.audio.play('boss'); G.haptic.boss(); G.render.addShake(14); G.render.screenFlash('#ff5252', 0.25); }
    G.ui.onMonsterSpawn(cur, zone);
    // 버퍼된 탭 즉시 반영 — 리스폰 순간에도 손맛 유지
    if (pendingTaps > 0 && !boss) {
      const n = pendingTaps; pendingTaps = 0;
      for (let i = 0; i < n && cur && cur.hp > 0; i++) tapHit();
    } else pendingTaps = 0;
  }

  /* ============================ 전투 ============================ */
  function dealDamage(amount, crit, fromTap) {
    if (!cur || cur.hp <= 0) return;
    cur.hp -= amount;
    G.render.hitMonster(crit);

    const ci = Math.min(comboCount, 50) / 50;            // 콤보 강도 0~1
    G.render.addShake((crit ? 9 : 4) + ci * 5);
    // 대미지 숫자 색을 콤보/크리에 따라 변주
    const dmgColor = crit ? '#ffd23f' : (comboCount > 30 ? '#ff8a8a' : comboCount > 15 ? '#ffd0a0' : '#ffffff');
    G.render.damageNumber(G.fmt.num(amount), crit, null, null, dmgColor);

    if (fromTap) {
      const mc = cur.def.colors;
      // 슬래시: 색·개수 변주
      const slashPool = crit ? ['#ffd23f', '#ffffff', '#ff9d5c'] : ['#ffffff', '#bfe0ff', mc[1]];
      const ns = crit ? 3 : (1 + (comboCount > 12 ? 1 : 0) + (comboCount > 28 ? 1 : 0));
      for (let i = 0; i < ns; i++) G.render.slash(null, null, G.rng.pick(slashPool));
      // 파티클: 종류·양·속도 콤보 스케일
      const pn = (crit ? 14 : 5) + Math.floor(ci * 10);
      G.render.particles(pn, {
        color: G.rng.pick([mc[0], mc[1], '#ffffff']),
        kind: G.rng.chance(0.3) ? 'star' : 'spark',
        size: G.rng.range(3, 6) + ci * 3,
        spdMax: (crit ? 340 : 190) + ci * 160
      });
      if (crit) {
        G.render.ring(null, null, '#ffd23f', 60 + ci * 40);
        G.render.particles(8, { kind: 'star', color: '#ffd23f', size: 7 + ci * 3 });
        G.render.screenFlash('#ffd23f', 0.16);
      } else if (comboCount > 0 && comboCount % 10 === 0) {
        // 10콤보마다 특별 연출
        G.render.ring(null, null, '#ff9d5c', 80);
        G.render.particles(12, { kind: 'star', color: '#ffae42', size: 8 });
        G.audio.play('coin');
      }
    }
    if (crit) { G.audio.play('crit'); G.haptic.crit(); }
    else { G.audio.play('hit'); G.haptic.light(); }

    if (cur.hp <= 0) onMonsterDeath();
    else G.ui.updateMonsterHP(cur);
  }

  function tapHit() {
    comboTimer = 1.4; comboCount++;
    const comboMul = 1 + Math.min(comboCount, 50) * 0.02; // 최대 +100%
    let dmg = stat.tap * comboMul;
    const crit = G.rng.chance(stat.critChance);
    if (crit) dmg *= stat.critMult;
    dmg *= G.rng.range(0.95, 1.05);
    dealDamage(dmg, crit, true);
    G.ui.updateCombo(comboCount, comboTimer);
  }
  function performTap() {
    if (document.querySelector('.modal-bg')) return;   // 팝업 중 입력 무시
    G.audio.ensure();
    state.stats.taps++;
    if (!cur || cur.hp <= 0) {            // 리스폰 대기 중이면 버퍼에 저장
      pendingTaps = Math.min(pendingTaps + 1, 5);
      return;
    }
    tapHit();
    queueSave();
  }

  function onMonsterDeath() {
    const boss = cur.isBoss;
    const gold = goldForKill(state.stage, boss);
    state.gold += gold; state.stats.totalGold += gold;
    state.stats.kills++;
    if (boss) state.stats.bossKills++;

    // 연출
    G.render.killMonster();
    G.render.addShake(boss ? 18 : 8);
    G.render.screenFlash(boss ? '#fff' : cur.def.colors[1], boss ? 0.5 : 0.2);
    G.render.particles(boss ? 60 : 22, { color: cur.def.colors[0], spdMax: boss ? 480 : 300, life: 0.9 });
    G.render.particles(boss ? 30 : 10, { kind: 'star', color: cur.def.colors[1], size: 8 });
    G.render.coinBurst(boss ? 24 : 8);
    G.audio.play(boss ? 'bossKill' : 'kill');
    setTimeout(() => G.audio.play('coin'), 80);
    G.haptic.heavy();

    G.ui.onKill(gold, boss);

    // 보스 보상: 장비/다이아
    if (boss) {
      const item = generateItem();
      const equipped = tryEquip(item);
      state.dia += 3;
      state.safety += 1;
      G.ui.bossReward(item, equipped);
    } else if (G.rng.chance(0.05)) {
      // 일반 몬스터 소량 장비 드랍
      const item = generateItem();
      tryEquip(item);
      G.ui.itemDrop(item);
    }

    // 스테이지 진행
    state.killsInStage++;
    const need = boss ? 1 : MONSTERS_PER_STAGE;
    if (state.killsInStage >= need) {
      advanceStage();
    } else {
      G.ui.updateStageProgress(state.killsInStage, need);
    }

    checkAchievements();
    refreshStats();
    cur = null;
    setTimeout(spawnMonster, boss ? 650 : 110);
    queueSave();
  }

  function advanceStage() {
    state.stage++;
    state.killsInStage = 0;
    if (state.stage > state.maxStage) state.maxStage = state.stage;
    stageClearAnim = 1;
    G.ui.onStageAdvance(state.stage, zoneForStage(state.stage));
    // 새 스킬 해금 체크
    G.ui.refreshSkills();
  }

  /* ============================ 골드 강화 ============================ */
  function upgradeCost(def) {
    const lvl = state.upgrades[def.id] || 0;
    return Math.floor(def.base * Math.pow(def.growth, lvl));
  }
  function buyUpgrade(id, bulk) {
    const def = D.upgrades.find(u => u.id === id);
    if (!def) return false;
    if (def.unlock && state.maxStage < def.unlock) { G.audio.play('error'); return false; }
    let bought = 0;
    const times = bulk === 'max' ? 9999 : (bulk || 1);
    for (let i = 0; i < times; i++) {
      if (def.max && (state.upgrades[id] || 0) >= def.max) break;
      const cost = upgradeCost(def);
      if (state.gold < cost) break;
      state.gold -= cost;
      state.upgrades[id] = (state.upgrades[id] || 0) + 1;
      bought++;
    }
    if (bought) {
      G.audio.play('upgrade'); G.haptic.medium();
      refreshStats();
      G.ui.refreshUpgrades(); G.ui.refreshTopBar();
      queueSave();
      return true;
    }
    G.audio.play('error');
    return false;
  }

  /* ============================ 스킬 ============================ */
  function skillUnlocked(def) { return state.maxStage >= def.unlock; }
  function skillReady(id) { return (state.skillCd[id] || 0) <= 0; }
  function useSkill(id) {
    const def = D.skills.find(s => s.id === id);
    if (!def || !skillUnlocked(def) || !skillReady(id) || !cur) {
      G.audio.play('error'); return false;
    }
    state.skillCd[id] = def.cd;
    G.audio.play('skill'); G.haptic.heavy();
    skillFx(def);
    if (def.effect === 'burst') {
      const dmg = stat.tap * def.value;
      const crit = true;
      G.render.addShake(16); G.render.screenFlash('#fff', 0.4);
      dealDamage(dmg, crit, true);
    } else if (def.effect === 'autotap') {
      autotaps.push({ remain: def.dur, rate: def.value, acc: 0 });
    } else if (def.effect === 'mult') {
      buffs.push({ kind: 'mult', value: def.value, remain: def.dur, skill: def.id });
      refreshStats();
    }
    G.ui.refreshSkills();
    return true;
  }
  function skillFx(def) {
    const c = G.render.center();
    switch (def.fx) {
      case 'laser': G.render.screenFlash('#ff5252', 0.4); for (let i = 0; i < 20; i++) G.render.slash(c.x + G.rng.range(-80, 80), c.y + G.rng.range(-80, 80), '#ff5252'); break;
      case 'thunder': G.render.screenFlash('#fff3a0', 0.6); G.render.particles(40, { color: '#ffd23f', kind: 'spark', spdMax: 500, up: 200 }); break;
      case 'missiles': G.render.particles(40, { color: '#ff8a50', spdMax: 400 }); for (let i = 0; i < 12; i++) G.render.ring(c.x + G.rng.range(-90, 90), c.y + G.rng.range(-90, 90), '#ff6b6b', 50); break;
      case 'nuke': G.render.screenFlash('#fff', 0.8); G.render.addShake(26); G.render.particles(80, { color: '#ffae42', spdMax: 600, life: 1.1 }); break;
      case 'barrier': G.render.ring(c.x, c.y, '#39f6ff', 120); G.render.particles(24, { kind: 'star', color: '#39f6ff' }); break;
      case 'ai': G.render.screenFlash('#536dfe', 0.4); G.render.particles(30, { color: '#8c9eff', kind: 'star' }); break;
      case 'truck': G.render.particles(30, { color: '#ff5252', spdMax: 360 }); break;
    }
  }
  function updateSkills(dt) {
    for (const id in state.skillCd) if (state.skillCd[id] > 0) state.skillCd[id] = Math.max(0, state.skillCd[id] - dt);
    // 자동연타
    for (let i = autotaps.length - 1; i >= 0; i--) {
      const a = autotaps[i];
      a.remain -= dt; a.acc += a.rate * dt;
      while (a.acc >= 1 && cur) {
        a.acc -= 1;
        let dmg = stat.tap * 1.0;
        const crit = G.rng.chance(stat.critChance);
        if (crit) dmg *= stat.critMult;
        dealDamage(dmg, crit, true);
      }
      if (a.remain <= 0) autotaps.splice(i, 1);
    }
    // 버프 만료
    let dirty = false;
    for (let i = buffs.length - 1; i >= 0; i--) {
      buffs[i].remain -= dt;
      if (buffs[i].remain <= 0) { buffs.splice(i, 1); dirty = true; }
    }
    if (dirty) refreshStats();
    G.ui.updateBuffs(buffs, autotaps);
  }

  /* ============================ 방치/자동 DPS ============================ */
  let dpsAcc = 0;
  function updateIdle(dt) {
    if (!cur || cur.hp <= 0 || stat.dps <= 0) return;
    // 자동 공격은 0.5초마다 1회 큰 히트로 처리(이펙트 절약)
    dpsAcc += dt;
    if (dpsAcc >= 0.5) {
      const dmg = stat.dps * dpsAcc;
      dpsAcc = 0;
      if (cur && cur.hp > 0) {
        cur.hp -= dmg;
        G.render.damageNumber(G.fmt.num(dmg), false, G.render.center().x + G.rng.range(-50, 50), G.render.center().y + 40, '#9be7ff');
        if (cur.hp <= 0) onMonsterDeath(); else G.ui.updateMonsterHP(cur);
      }
    }
  }

  /* ============================ 보스 타이머 ============================ */
  function updateBoss(dt) {
    if (cur && cur.isBoss && cur.hp > 0) {
      cur.bossTimer -= dt;
      if (cur.bossTimer <= 0) {
        // 실패: 보스 체력 일부 회복 후 재도전(페널티 없음)
        cur.bossTimer = 30;
        cur.hp = cur.maxHp;
        G.ui.bossTimeout();
      }
      G.ui.updateBossTimer(cur.bossTimer);
    }
  }

  /* ============================ 장비 ============================ */
  function generateItem(forceRarity) {
    const rar = forceRarity != null ? D.rarities[forceRarity]
      : G.rng.weighted(D.rarities, r => r.weight * (1 + state.stage * 0.002));
    const slot = G.rng.pick(D.slots);
    const item = { slot: slot.id, rarity: rar.id, level: 0, roll: G.rng.range(0.85, 1.25), id: Date.now() + Math.random() };
    if (rar.id >= 4) state.stats.legend++;
    return item;
  }
  function itemPower(item) {
    const slot = D.slots.find(s => s.id === item.slot);
    const rar = D.rarities[item.rarity];
    return slot.base * rar.mult * (1 + item.level * 0.12) * item.roll;
  }
  function tryEquip(item) {
    const eqd = state.equipped[item.slot];
    const better = !eqd || itemPower(item) > itemPower(eqd);
    state.inv.push(item);
    if (better) {
      state.equipped[item.slot] = item;
      state.stats.equippedCount = Object.keys(state.equipped).length;
      refreshStats();
      G.ui.refreshTopBar();
      return true;
    }
    return false;
  }
  function equipItem(item) {
    state.equipped[item.slot] = item;
    state.stats.equippedCount = Object.keys(state.equipped).length;
    refreshStats(); G.ui.refreshEquip(); G.ui.refreshTopBar(); queueSave();
    G.audio.play('upgrade');
  }
  function itemUpgradeCost(item) { return Math.floor(200 * Math.pow(2.2, item.rarity) * Math.pow(1.5, item.level)); }
  function upgradeItem(item) {
    const cost = itemUpgradeCost(item);
    if (state.gold < cost) { G.audio.play('error'); return false; }
    state.gold -= cost; item.level++;
    refreshStats(); G.ui.refreshEquip(); G.ui.refreshTopBar();
    G.audio.play('upgrade'); G.haptic.medium(); queueSave();
    return true;
  }
  function sellItem(item) {
    const idx = state.inv.indexOf(item);
    if (idx < 0) return false;
    if (state.equipped[item.slot] === item) { G.audio.play('error'); return false; } // 장착 중엔 불가
    state.inv.splice(idx, 1);
    const val = Math.floor(150 * Math.pow(2, item.rarity) * (1 + item.level));
    state.gold += val; state.insurance += (item.rarity + 1);
    G.audio.play('coin'); G.ui.refreshEquip(); G.ui.refreshTopBar(); queueSave();
    return val;
  }
  // 현재 장착보다 약하거나 같은 미장착 장비 일괄 판매
  function sellWeakDuplicates() {
    let count = 0, gold = 0;
    for (let i = state.inv.length - 1; i >= 0; i--) {
      const it = state.inv[i];
      const eq = state.equipped[it.slot];
      if (eq === it) continue;                    // 장착 중 제외
      if (!eq || itemPower(it) > itemPower(eq)) continue; // 더 강하거나 빈 슬롯이면 보존
      state.inv.splice(i, 1);
      gold += Math.floor(150 * Math.pow(2, it.rarity) * (1 + it.level));
      state.insurance += (it.rarity + 1);
      count++;
    }
    if (count) { state.gold += gold; G.audio.play('coin'); G.haptic.medium(); refreshStats(); G.ui.refreshEquip(); G.ui.refreshTopBar(); queueSave(); }
    return { count, gold };
  }

  /* ============================ 환생(Prestige) ============================ */
  function prestigeGain() {
    if (state.maxStage < 50) return 0;
    return Math.floor(Math.pow((state.maxStage - 40) / 8, 1.5));
  }
  function canPrestige() { return prestigeGain() > 0; }
  function doPrestige() {
    const gain = prestigeGain();
    if (gain <= 0) { G.audio.play('error'); return false; }
    state.safety += gain;
    state.stats.prestiges++;
    // 초기화: 스테이지/골드/강화/장비/스킬쿨 리셋 (퍼크/다이아/안전포인트/업적/도감 유지)
    state.stage = 1; state.maxStage = 1; state.killsInStage = 0;
    state.gold = 0; state.upgrades = {}; state.skillCd = {};
    state.inv = []; state.equipped = {}; state.stats.equippedCount = 0;
    buffs = []; autotaps = []; comboCount = 0;
    refreshStats();
    spawnMonster();
    G.audio.play('reward'); G.haptic.level();
    checkAchievements();
    G.ui.afterPrestige(gain);
    save();
    return true;
  }
  // 퍼크 구매(안전포인트 소비)
  const PERKS = [
    { id: 'atk', name: '영구 공격력', icon: '⚔️', desc: '모든 공격력 +15%', base: 1, growth: 1.6 },
    { id: 'gold', name: '영구 골드', icon: '💰', desc: '골드 획득 +20%', base: 1, growth: 1.6 },
    { id: 'crit', name: '영구 치명', icon: '🎯', desc: '크리티컬 피해 +10%', base: 2, growth: 1.7 },
    { id: 'start', name: '시작 가속', icon: '🚀', desc: '시작 스테이지 +5', base: 3, growth: 2.0 }
  ];
  function perkCost(p) { return Math.floor(p.base * Math.pow(p.growth, state.perks[p.id] || 0)); }
  function buyPerk(id) {
    const p = PERKS.find(x => x.id === id);
    const cost = perkCost(p);
    if (state.safety < cost) { G.audio.play('error'); return false; }
    state.safety -= cost; state.perks[id] = (state.perks[id] || 0) + 1;
    if (id === 'start') { state.stage = Math.max(state.stage, 1 + (state.perks.start) * 5); state.maxStage = Math.max(state.maxStage, state.stage); }
    refreshStats(); G.audio.play('upgrade'); G.haptic.medium();
    G.ui.refreshPrestige(); G.ui.refreshTopBar(); queueSave();
    return true;
  }

  /* ============================ 업적 ============================ */
  function metricValue(m) {
    switch (m) {
      case 'kills': return state.stats.kills;
      case 'taps': return state.stats.taps;
      case 'maxStage': return state.maxStage;
      case 'prestiges': return state.stats.prestiges;
      case 'equipped': return state.stats.equippedCount;
      case 'legend': return state.stats.legend;
      default: return 0;
    }
  }
  function checkAchievements() {
    for (const a of D.achievements) {
      if (state.achDone[a.id]) continue;
      if (metricValue(a.metric) >= a.goal) {
        state.achDone[a.id] = true;
        state.dia += a.dia;
        G.audio.play('reward');
        G.ui.achievementUnlocked(a);
      }
    }
  }

  /* ============================ 일일 콘텐츠 ============================ */
  function today() { return new Date().toISOString().slice(0, 10); }
  function claimAttendance() {
    if (state.daily.lastAttend === today()) { G.audio.play('error'); return null; }
    state.daily.lastAttend = today();
    state.daily.attendDay = (state.daily.attendDay % 7) + 1;
    const rewards = [
      { dia: 5 }, { gold: 'x' }, { dia: 8 }, { item: 2 }, { dia: 12 }, { item: 3 }, { dia: 25, item: 4 }
    ];
    const r = rewards[state.daily.attendDay - 1];
    applyReward(r);
    G.audio.play('reward'); queueSave();
    return { day: state.daily.attendDay, reward: r };
  }
  function spinRoulette() {
    if (state.daily.roulette === today()) { G.audio.play('error'); return null; }
    state.daily.roulette = today();
    const prizes = [{ dia: 3 }, { gold: 'x' }, { dia: 10 }, { item: 1 }, { gold: 'xx' }, { dia: 20 }, { item: 3 }, { dia: 50 }];
    const idx = G.rng.int(0, prizes.length - 1);
    applyReward(prizes[idx]);
    G.audio.play('reward'); queueSave();
    return { idx, reward: prizes[idx] };
  }
  function openFreeBox() {
    if (state.daily.freebox === today()) { G.audio.play('error'); return null; }
    state.daily.freebox = today();
    const item = generateItem(G.rng.weighted([{ r: 2, w: 50 }, { r: 3, w: 30 }, { r: 4, w: 15 }, { r: 5, w: 5 }], x => x.w).r);
    tryEquip(item);
    state.dia += 5;
    G.audio.play('box'); queueSave();
    return item;
  }
  function applyReward(r) {
    if (r.dia) state.dia += r.dia;
    if (r.gold === 'x') state.gold += goldForKill(state.maxStage, false) * 50;
    if (r.gold === 'xx') state.gold += goldForKill(state.maxStage, false) * 200;
    if (r.item) { const it = generateItem(r.item); tryEquip(it); }
    G.ui.refreshTopBar();
  }

  /* ============================ 오프라인 보상 ============================ */
  function offlineReward() {
    const now = Date.now();
    const elapsed = Math.min((now - state.lastSeen) / 1000, OFFLINE_CAP_H * 3600);
    if (elapsed < 60 || stat.dps <= 0) return null;
    const gold = Math.floor(stat.dps * elapsed * 0.5);
    if (gold <= 0) return null;
    return { gold, elapsed };
  }
  function claimOffline(reward, doubled) {
    const g = reward.gold * (doubled ? 2 : 1);
    state.gold += g; state.stats.totalGold += g;
    G.audio.play('reward'); G.ui.refreshTopBar(); queueSave();
  }

  /* ============================ 메인 루프 ============================ */
  function frame(ts) {
    if (!lastFrame) lastFrame = ts;
    let dt = (ts - lastFrame) / 1000;
    lastFrame = ts;
    if (dt > 0.25) dt = 0.25; // 탭 전환 등 큰 점프 방지
    update(dt);
    G.render.update(dt);
    G.render.draw({ zone: zoneForStage(state.stage), isBoss: cur && cur.isBoss });
    requestAnimationFrame(frame);
  }
  function update(dt) {
    // 팝업(모달)이 떠 있으면 게임 일시정지 — 뒤에서 계속 진행되지 않도록
    if (document.querySelector('.modal-bg')) return;
    state.stats.playSec += dt;
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { comboCount = 0; G.ui.updateCombo(0, 0); } }
    updateSkills(dt);
    updateIdle(dt);
    updateBoss(dt);
    if (stageClearAnim > 0) stageClearAnim -= dt;
  }

  /* ============================ 초기화 ============================ */
  function init() {
    const loaded = G.storage.load();
    state = loaded ? Object.assign(defaultState(), loaded) : defaultState();
    // 중첩 객체 보정
    const d = defaultState();
    for (const k of ['perks', 'stats', 'daily', 'settings']) state[k] = Object.assign(d[k], state[k] || {});
    state.upgrades = state.upgrades || {}; state.skillCd = state.skillCd || {};
    state.equipped = state.equipped || {}; state.inv = state.inv || [];
    state.achDone = state.achDone || {}; state.seenMonsters = state.seenMonsters || {};

    G.audio.setEnabled(state.settings.sound);
    G.haptic.setEnabled(state.settings.vibrate);

    refreshStats();
    G.ui.init(API);
    spawnMonster();

    // 오프라인 보상
    const off = offlineReward();
    if (off) G.ui.showOffline(off);

    requestAnimationFrame(frame);
    // 주기 저장
    setInterval(save, 20000);
    window.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  /* ============================ 외부 API ============================ */
  const API = {
    get state() { return state; },
    get cur() { return cur; },
    get stat() { return stat; },
    get buffs() { return buffs; },
    get autotaps() { return autotaps; },
    D, PERKS,
    performTap, buyUpgrade, upgradeCost,
    useSkill, skillUnlocked, skillReady,
    itemPower, equipItem, upgradeItem, sellItem, sellWeakDuplicates, itemUpgradeCost,
    prestigeGain, canPrestige, doPrestige, buyPerk, perkCost,
    claimAttendance, spinRoulette, openFreeBox, claimOffline,
    metricValue, computeStats,
    monsterHP, zoneForStage, isBossStage,
    setSound(v) { state.settings.sound = v; G.audio.setEnabled(v); if (v) G.audio.ensure(); save(); },
    setVibrate(v) { state.settings.vibrate = v; G.haptic.setEnabled(v); save(); },
    wipe() { saveDisabled = true; G.storage.wipe(); location.reload(); },
    titleForStage(s) { let t = G.data.titles[0]; for (const x of G.data.titles) if (s >= x.stage) t = x; return t.name; }
  };

  return { init, API };
})();
