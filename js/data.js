/* =========================================================================
 *  data.js — 게임 콘텐츠 데이터 (존 / 몬스터 / 장비 / 스킬 / 강화 / 업적)
 *  데이터-드리븐 설계: 새 콘텐츠 추가가 쉽도록 분리.
 * ========================================================================= */
G.data = {};

/* ------------------------------------------------------------------ *
 *  지역(Zone) — 10스테이지마다 변경. 배경/팔레트/등장 몬스터 정의.
 * ------------------------------------------------------------------ */
G.data.zones = [
  { id: 'city',   name: '도심',       sky: ['#7fb2ff', '#cfe4ff'], ground: '#5b6b8c', accent: '#ffd166', monsters: ['car', 'phishing', 'thief', 'fire'] },
  { id: 'forest', name: '숲',         sky: ['#7fe0a8', '#dffbe8'], ground: '#3f7a4f', accent: '#ffe08a', monsters: ['flood', 'storm', 'pet', 'lightning'] },
  { id: 'factory',name: '공장',       sky: ['#ffb27f', '#ffe3cf'], ground: '#7a5b4f', accent: '#ff6f61', monsters: ['fire', 'industrial', 'lightning', 'hacker'] },
  { id: 'sea',    name: '바다',       sky: ['#5fc8ff', '#cdefff'], ground: '#2f6f9c', accent: '#9af0ff', monsters: ['flood', 'storm', 'typhoon', 'thief'] },
  { id: 'volcano',name: '화산',       sky: ['#ff7f7f', '#ffd0c0'], ground: '#6b3030', accent: '#ffae42', monsters: ['fire', 'phoenix', 'lightning', 'industrial'] },
  { id: 'glacier',name: '빙하',       sky: ['#bfe6ff', '#eef9ff'], ground: '#6f8fae', accent: '#d8f4ff', monsters: ['ice', 'storm', 'typhoon', 'flood'] },
  { id: 'space',  name: '우주',       sky: ['#2a2350', '#4b3f8f'], ground: '#1a1636', accent: '#b18cff', monsters: ['hacker', 'virus', 'ai', 'lightning'] },
  { id: 'cyber',  name: '사이버시티', sky: ['#23114d', '#5a1f8f'], ground: '#180a33', accent: '#39f6ff', monsters: ['hacker', 'virus', 'ai', 'phantom'] },
  { id: 'kingdom',name: '보험왕국',   sky: ['#ffd86b', '#fff3c4'], ground: '#8a6b2f', accent: '#fff0a0', monsters: ['phantom', 'phishing', 'ai', 'typhoon'] }
];

/* ------------------------------------------------------------------ *
 *  몬스터 정의 — 귀엽고 캐주얼한 벡터 스타일.
 *  shape: 렌더러의 드로잉 루틴 키 / colors: 메인/보조/눈
 * ------------------------------------------------------------------ */
G.data.monsters = {
  car:        { name: '교통사고 괴물',  shape: 'blob',   colors: ['#ff6b6b', '#ffd23f', '#fff'], emoji: '🚗' },
  fire:       { name: '불꽃 드래곤',    shape: 'dragon', colors: ['#ff7b29', '#ffd23f', '#fff'], emoji: '🔥' },
  flood:      { name: '홍수 슬라임',    shape: 'slime',  colors: ['#3fa9f5', '#9be7ff', '#fff'], emoji: '💧' },
  phishing:   { name: '보이스피싱 마왕',shape: 'devil',  colors: ['#9b5de5', '#f15bb5', '#fff'], emoji: '📞' },
  virus:      { name: '바이러스 킹',    shape: 'virus',  colors: ['#43d68a', '#b9ffce', '#fff'], emoji: '🦠' },
  typhoon:    { name: '태풍 골렘',      shape: 'golem',  colors: ['#5c7cfa', '#c5d3ff', '#fff'], emoji: '🌀' },
  ice:        { name: '빙판 악마',      shape: 'devil',  colors: ['#74e0ff', '#d6f6ff', '#fff'], emoji: '🧊' },
  lightning:  { name: '낙뢰 타이탄',    shape: 'titan',  colors: ['#ffd23f', '#fff3a0', '#333'], emoji: '⚡' },
  thief:      { name: '도둑 고블린',    shape: 'goblin', colors: ['#8d6e63', '#d7ccc8', '#fff'], emoji: '🦝' },
  phoenix:    { name: '산불 피닉스',    shape: 'dragon', colors: ['#ff5252', '#ffab40', '#fff'], emoji: '🐦‍🔥' },
  phantom:    { name: '보험사기 팬텀',  shape: 'ghost',  colors: ['#b388ff', '#e6dbff', '#fff'], emoji: '👻' },
  hacker:     { name: '해킹 스파이더',  shape: 'spider', colors: ['#26c6da', '#84ffff', '#fff'], emoji: '🕷️' },
  storm:      { name: '폭설 예티',      shape: 'golem',  colors: ['#e0f0ff', '#bcd9f0', '#333'], emoji: '❄️' },
  industrial: { name: '산업재해 로봇',  shape: 'titan',  colors: ['#ff9800', '#ffcc80', '#333'], emoji: '⚙️' },
  pet:        { name: '말썽 반려괴수',  shape: 'blob',   colors: ['#ffb3c1', '#ffd6e0', '#fff'], emoji: '🐾' },
  ai:         { name: '우주 해킹 AI',   shape: 'ai',     colors: ['#536dfe', '#8c9eff', '#fff'], emoji: '🤖' }
};

// 보스 — 20스테이지마다 등장하는 거대 재난 (art = 의인화 드로잉 키)
G.data.bosses = [
  { name: '초대형 태풍',       art: 'typhoon',    colors: ['#3949ab', '#9fa8ff', '#fff'] },
  { name: '메가 산불',         art: 'fire',       colors: ['#d32f2f', '#ff8a50', '#fff'] },
  { name: '도시 침수',         art: 'flood',      colors: ['#0277bd', '#80d8ff', '#fff'] },
  { name: '초거대 화재 드래곤', art: 'phoenix',    colors: ['#ff5722', '#ffd54f', '#fff'] },
  { name: '우주 해킹 AI',      art: 'ai',         colors: ['#311b92', '#b388ff', '#39f6ff'] },
  { name: '재난의 군주',       art: 'phantom',    colors: ['#6a1b9a', '#ce93d8', '#fff'] }
];

/* ------------------------------------------------------------------ *
 *  희귀도 정의
 * ------------------------------------------------------------------ */
G.data.rarities = [
  { id: 0, name: '일반', color: '#b0bec5', mult: 1.0,  weight: 100 },
  { id: 1, name: '고급', color: '#66bb6a', mult: 1.6,  weight: 55 },
  { id: 2, name: '희귀', color: '#42a5f5', mult: 2.6,  weight: 26 },
  { id: 3, name: '영웅', color: '#ab47bc', mult: 4.4,  weight: 11 },
  { id: 4, name: '전설', color: '#ffa726', mult: 7.5,  weight: 4 },
  { id: 5, name: '신화', color: '#ef5350', mult: 13.0, weight: 1.2 },
  { id: 6, name: '초월', color: '#ec407a', mult: 22.0, weight: 0.3 }
];

/* ------------------------------------------------------------------ *
 *  장비 슬롯 정의 — 슬롯마다 주 스탯이 다름
 *  stat: 'tap'(탭공격) | 'dps'(자동공격) | 'all'(전체공격) | 'gold' | 'crit'
 * ------------------------------------------------------------------ */
G.data.slots = [
  { id: 'helmet',  name: '헬멧',          icon: '⛑️', stat: 'all',  base: 0.06 },
  { id: 'shield',  name: '방패',          icon: '🛡️', stat: 'all',  base: 0.06 },
  { id: 'badge',   name: '보험배지',      icon: '🎖️', stat: 'gold', base: 0.10 },
  { id: 'hammer',  name: '안전망치',      icon: '🔨', stat: 'tap',  base: 0.12 },
  { id: 'laser',   name: '레이저건',      icon: '🔫', stat: 'tap',  base: 0.12 },
  { id: 'drone',   name: '드론',          icon: '🛩️', stat: 'dps',  base: 0.12 },
  { id: 'cannon',  name: '소화기 캐논',   icon: '🧯', stat: 'dps',  base: 0.12 },
  { id: 'ai',      name: 'AI 탐지기',     icon: '📡', stat: 'crit', base: 0.04 },
  { id: 'kit',     name: '응급키트',      icon: '🧰', stat: 'all',  base: 0.05 },
  { id: 'truck',   name: '긴급출동 차량', icon: '🚑', stat: 'dps',  base: 0.14 }
];

/* ------------------------------------------------------------------ *
 *  골드 강화(업그레이드) — 무한 레벨. cost = base * growth^level
 *  type: 'tap' 탭공격력 / 'hero' 자동DPS / 'crit' / 'critdmg' / 'gold' / 'allmul'
 * ------------------------------------------------------------------ */
// 곱연산 성장 모델: tap/hero 는 레벨마다 dmgG 배율로 증가 → 지수 HP를 따라잡음
G.data.upgrades = [
  { id: 'tap',     name: '강화 주먹',   icon: '✊', type: 'tap',  desc: '탭 공격력 ×1.10',  base: 10,     growth: 1.125, dmgG: 1.10 },
  { id: 'hero_p',  name: '신입 설계사', icon: '🧑‍💼', type: 'hero', desc: '자동 공격 ×1.09', base: 60,     growth: 1.125, dmgG: 1.092, heroBase: 3,     unlock: 1 },
  { id: 'hero_d',  name: '구조 드론',   icon: '🛩️', type: 'hero', desc: '자동 공격 ×1.09', base: 1200,   growth: 1.125, dmgG: 1.092, heroBase: 55,    unlock: 8 },
  { id: 'hero_t',  name: '긴급출동대',  icon: '🚑', type: 'hero', desc: '자동 공격 ×1.09', base: 30000,  growth: 1.125, dmgG: 1.092, heroBase: 850,   unlock: 20 },
  { id: 'hero_ai', name: 'AI 방어망',   icon: '🤖', type: 'hero', desc: '자동 공격 ×1.09', base: 800000, growth: 1.125, dmgG: 1.092, heroBase: 14000, unlock: 40 },
  { id: 'crit',    name: '치명 분석',   icon: '🎯', type: 'crit',    desc: '크리티컬 확률 +1%',  base: 1500, growth: 1.35, gain: 0.01, max: 45 },
  { id: 'critdmg', name: '필살 설계',   icon: '💥', type: 'critdmg', desc: '크리티컬 피해 +25%', base: 2200, growth: 1.30, gain: 0.25 },
  { id: 'gold',    name: '보험금 협상', icon: '💰', type: 'gold',    desc: '골드 획득 +8%',     base: 3000, growth: 1.30, gain: 0.08 },
  { id: 'allmul',  name: '히어로 단련', icon: '🦸', type: 'allmul',  desc: '모든 공격력 +5%',   base: 25000, growth: 1.40, gain: 0.05 }
];

/* ------------------------------------------------------------------ *
 *  스킬 — 액티브 스킬(쿨타임). 화려한 이펙트.
 *  effect: 'burst' 즉시대량 / 'autotap' 일정시간 자동연타 / 'mult' 일정시간 버프 / 'gold' 즉시골드
 * ------------------------------------------------------------------ */
G.data.skills = [
  { id: 'rapid',   name: '연속폭격', icon: '💣', effect: 'autotap', cd: 30,  dur: 6,  value: 12, fx: 'missiles', unlock: 1,  desc: '6초간 초당 12회 자동 연타' },
  { id: 'laser',   name: '레이저',   icon: '🔫', effect: 'burst',   cd: 25,  dur: 0,  value: 30, fx: 'laser',    unlock: 3,  desc: '탭공격 30배 즉시 폭격' },
  { id: 'thunder', name: '번개',     icon: '⚡', effect: 'burst',   cd: 35,  dur: 0,  value: 55, fx: 'thunder',  unlock: 8,  desc: '탭공격 55배 낙뢰' },
  { id: 'missile', name: '미사일',   icon: '🚀', effect: 'burst',   cd: 45,  dur: 0,  value: 90, fx: 'missiles', unlock: 15, desc: '탭공격 90배 미사일 융단폭격' },
  { id: 'barrier', name: '보험배리어', icon: '🛡️', effect: 'mult',  cd: 60,  dur: 10, value: 3,  fx: 'barrier',  unlock: 22, desc: '10초간 모든 피해 3배' },
  { id: 'dispatch',name: '긴급출동', icon: '🚨', effect: 'autotap', cd: 70,  dur: 10, value: 20, fx: 'truck',    unlock: 30, desc: '10초간 초당 20회 자동 연타' },
  { id: 'aifire',  name: 'AI 자동공격', icon: '🤖', effect: 'mult', cd: 90,  dur: 15, value: 4,  fx: 'ai',       unlock: 45, desc: '15초간 모든 피해 4배' },
  { id: 'nuke',    name: '화면 전체 공격', icon: '☄️', effect: 'burst', cd: 120, dur: 0, value: 250, fx: 'nuke',    unlock: 60, desc: '탭공격 250배 메테오' }
];

/* ------------------------------------------------------------------ *
 *  업적 — 달성 시 다이아 보상
 * ------------------------------------------------------------------ */
G.data.achievements = [
  { id: 'kill10',   name: '첫 출동',     desc: '몬스터 10마리 처치',   metric: 'kills', goal: 10,     dia: 5 },
  { id: 'kill100',  name: '베테랑',      desc: '몬스터 100마리 처치',  metric: 'kills', goal: 100,    dia: 10 },
  { id: 'kill1k',   name: '리스크 슬레이어', desc: '몬스터 1,000마리 처치', metric: 'kills', goal: 1000, dia: 25 },
  { id: 'kill10k',  name: '전설의 히어로', desc: '몬스터 10,000마리 처치', metric: 'kills', goal: 10000, dia: 60 },
  { id: 'stage20',  name: '보스 헌터',   desc: '스테이지 20 도달',     metric: 'maxStage', goal: 20,  dia: 10 },
  { id: 'stage50',  name: '재난 정벌자', desc: '스테이지 50 도달',     metric: 'maxStage', goal: 50,  dia: 20 },
  { id: 'stage100', name: '백전노장',    desc: '스테이지 100 도달',    metric: 'maxStage', goal: 100, dia: 40 },
  { id: 'stage250', name: '세계 수호자', desc: '스테이지 250 도달',    metric: 'maxStage', goal: 250, dia: 100 },
  { id: 'tap1k',    name: '손맛 중독',   desc: '1,000번 탭',           metric: 'taps', goal: 1000,   dia: 10 },
  { id: 'tap10k',   name: '광클의 화신', desc: '10,000번 탭',          metric: 'taps', goal: 10000,  dia: 30 },
  { id: 'prestige1',name: '새로운 시작', desc: '첫 환생',              metric: 'prestiges', goal: 1, dia: 30 },
  { id: 'prestige5',name: '윤회의 길',   desc: '5회 환생',             metric: 'prestiges', goal: 5, dia: 80 },
  { id: 'equip5',   name: '무장 완료',   desc: '장비 5종 장착',        metric: 'equipped', goal: 5,  dia: 20 },
  { id: 'legend1',  name: '전설 발견',   desc: '전설 이상 장비 획득',  metric: 'legend', goal: 1,   dia: 40 }
];

/* ------------------------------------------------------------------ *
 *  칭호 — 환생/스테이지에 따라 부여
 * ------------------------------------------------------------------ */
G.data.titles = [
  { name: '수습 히어로',   stage: 0 },
  { name: '정식 히어로',   stage: 30 },
  { name: '베테랑 히어로', stage: 80 },
  { name: '재난 정벌자',   stage: 150 },
  { name: '전설의 수호자', stage: 300 },
  { name: '세계의 빛',     stage: 600 }
];
