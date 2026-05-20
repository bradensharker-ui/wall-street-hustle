import React, { useState, useEffect, useRef } from 'react';
import {
  ASSETS, START, AVATAR_FACES, AVATAR_ACCESSORIES, AVATAR_COLORS, defaultAvatar,
  LIFESTYLE_TIERS, getLifestyle, HORIZON_YEARS, GAME_LENGTHS, AUTO_SPEEDS,
  EVENT_RATE_PER_YEAR, EVENT_SHOCK_SCALE, eventProbPerTurn,
  EVENTS, gaussian, stepPrice, predictedMedian, monteCarloSim, createSchedule,
  makeRng, generateSeedCode, normalizeSeedCode, pickRandom,
} from './sim.js';

// ===== ASSETS, START, AVATAR_*, LIFESTYLE_TIERS, getLifestyle, GAME_LENGTHS,
// AUTO_SPEEDS, EVENT_*, EVENTS, gaussian, stepPrice, predictedMedian,
// monteCarloSim, createSchedule — all live in sim.js (pure, testable).
// Inline declarations removed below — App.jsx is now the React shell only.
// ===== CHAD THE FINFLUENCER =====
const CHAD_TIPS = [
  { text: "BRO. $YOLO is going to the MOON. I'm all in. You're either in or you're poor.", asset: 'MEME', direction: 1, accuracy: 0.25 },
  { text: "Just spoke to my insider at TechCo. Earnings next week are gonna SHOCK the street. Buy buy buy.", asset: 'TECH', direction: 1, accuracy: 0.40 },
  { text: "Bitcoin is DEAD. I'm shorting heavy. Don't catch a falling knife, normies.", asset: 'BTC', direction: -1, accuracy: 0.30 },
  { text: "Gold is for boomers. Move that money into REAL assets like $YOLO. Trust me bro.", asset: 'MEME', direction: 1, accuracy: 0.20 },
  { text: "Bonds are SO 2010. Everyone I know is dumping them. Get out while you can!", asset: 'BOND', direction: -1, accuracy: 0.30 },
  { text: "My algo just flashed BUY on Bitcoin. 100x incoming. NFA but you'd be DUMB not to.", asset: 'BTC', direction: 1, accuracy: 0.50 },
  { text: "S&P 500 is overbought. Recession imminent. I'm 100% cash. (Also buy my course.)", asset: 'SPX', direction: -1, accuracy: 0.20 },
  { text: "TechCo is the new Enron. Insider told me. SHORT IT.", asset: 'TECH', direction: -1, accuracy: 0.25 },
];

const CHAD_QUOTES_BAD_TIP = [
  "Hey bro, no hard feelings about that last call. Markets, am I right?",
  "I'm telling you, my new tip is even better. Slide me into your DMs.",
  "Look, even Warren Buffett has bad days. Anyway, NEXT TIP coming!",
  "Wasn't my fault, market manipulation. Anyway, you should buy this...",
];
const CHAD_QUOTES_GOOD_TIP = [
  "Told ya. Pay me back? Just kidding... unless?",
  "See? CHAD WAS RIGHT. Smash that follow.",
  "I'm basically a genius. Anyway, ready for the next play?",
];

// ===== LEO THE FRIEND =====
// Leo is the *peer-pressure* character (vs. Chad the finfluencer). He's
// image-conscious, anxious-popular, earnest. His lane: lifestyle inflation,
// herd behavior, social signaling. Not a villain — a friend who's wrong about
// what matters. Voice is intentionally specific.
const LEO_LIFESTYLE_OFFERS = [
  { item: 'Designer Sneakers', emoji: '👟', cost: 400,
    pitch: "Bro. These sneakers. We HAVE to. You can't show up looking like a fien." },
  { item: 'New iPhone', emoji: '📱', cost: 1200,
    pitch: "New phone dropped bro. Don't be the kid with the cracked screen at lunch." },
  { item: 'Designer Jacket', emoji: '🧥', cost: 800,
    pitch: "This jacket bro. Trust. The boys will respect you." },
  { item: 'Fresh Fade', emoji: '💇', cost: 250,
    pitch: "Bro my guy does the BEST fades. Your hair is looking kinda fien rn ngl." },
  { item: 'Elite Wrestling Camp', emoji: '🤼', cost: 600,
    pitch: "Bro summer camp. We grind, we lock in. Worth every dollar bro." },
  { item: 'Custom Lax Stick', emoji: '🥍', cost: 350,
    pitch: "New stick bro. The whip is UNREAL. Can't be out there with a fien stick." },
  { item: 'Intro Flight Lesson', emoji: '🛩️', cost: 1500,
    pitch: "Bro. INTRO FLIGHT LESSON. We're going to be PILOTS bro. Future me thanks you." },
  { item: 'Travis Scott Tickets', emoji: '🎤', cost: 500,
    pitch: "Travis is in town bro. We HAVE to. We HAVE to. don't be a fien." },
  { item: 'Designer Watch', emoji: '⌚', cost: 1800,
    pitch: "Bro this watch. Just look at it. you'd be UNSTOPPABLE in this." },
];

const LEO_REACT_BUY = [
  "okayyyy 🔥🔥🔥 you're not poor anymore",
  "BROOO YES. lock in. drip is drippin.",
  "we cooking bro. WE COOKING.",
  "bro you really did that. respect.",
  "the boys will respect you for this fr",
  "this is character development bro 📈",
];

const LEO_REACT_DECLINE = [
  "bruh... you're really showing up like that?",
  "okay fien. enjoy looking dry.",
  "bro... you're built different (negative)",
  "ngl that's a wrestling-practice fit and not in a good way",
  "okay grandma 😭",
  "you're choosing violence (against yourself)",
];

const LEO_GROUP_CHAT = {
  BOND: [
    "BONDS?? bro what. delete this. you're 14 not 70 😭",
    "bro bonds are for people who own crocs unironically",
    "you're literally buying grandma's portfolio bro",
  ],
  TBILL: [
    "T-bills bro? that's grandma money fr",
    "okay accountant 🤓 where's the risk bro",
    "bro you might as well bury cash in the yard",
  ],
  SPX: [
    "S&P? bro. respectable. boring but respectable.",
    "the boomer pick but ok bro at least it's something",
    "S&P 500 is the 'I'm responsible' starter pack",
  ],
  TECH: [
    "TECH bro YES. we're tech bros now. lock in.",
    "Nasdaq bro 🚀 this is private-jet money",
    "OK MR. SILICON VALLEY 👀 buy me lunch",
  ],
  GOLD: [
    "gold? bro are you a doomsday prepper",
    "bro gold is just shiny grandpa rocks 😭",
    "okay pirate 🏴‍☠️ where's the treasure map",
  ],
  BTC: [
    "OK MR. WALL STREET 👀 buy me lunch",
    "Bitcoin bro YES. we're not fiens we're CHADS",
    "bro if this hits we're flying private 🛩️",
  ],
  MEME: [
    "BROOO same we're cooking 🚀🚀",
    "$YOLO bro?? we're CRASHING OUT together let's go",
    "bro this stock is so fien but we ride or die",
  ],
};

const LEO_PEER_PITCHES = [
  { asset: 'MEME', text: "Yo bro EVERYONE at school just bought $YOLO. like EVERYONE. don't be the only fien who missed it." },
  { asset: 'BTC',  text: "Bro the whole lax team is in Bitcoin rn. The WHOLE team. you're seriously sitting out?" },
  { asset: 'TECH', text: "Bro everyone's buying Nasdaq. like even kids who don't know what Nasdaq IS are buying it." },
  { asset: 'MEME', text: "bro $YOLO is trending HARD. group chat is unhinged. don't be that guy bro." },
  { asset: 'BTC',  text: "Bro my wrestling coach is in Bitcoin. MY COACH. that's a signal bro. get in." },
  { asset: 'TECH', text: "Bro Nasdaq is the move. Everyone says so. like literally everyone. lock in." },
];

const LEO_TIER_REACT = {
  low: [
    "bro your apartment is so DRY. when's the upgrade",
    "bro your setup is fien. like deeply fien.",
    "okay bro we GOTTA fix the lifestyle. boys gonna talk.",
  ],
  mid: [
    "okay bro you're cooking. keep going.",
    "respect bro. the glow up is real.",
    "this is movement bro. lock in.",
  ],
  high: [
    "OKAY BRO. flying private next? 🛩️",
    "bro the BOYS are TALKING. character development fr.",
    "this is private-jet money bro. when we becoming pilots",
  ],
};

const LEO_FILLER = [
  "hold on bro fixing my hair",
  "we lock in like it's regionals",
  "drip is drippin 🔥",
  "bro I'm built for this",
  "I'm tryna get my pilot's license bro",
  "took an L at practice yesterday lowkey 😔",
  "hair check 💇",
  "the boys are watching bro",
  "wrestling tournament saturday bro you coming",
  "Travis dropped a new one bro have you HEARD it",
  "lax practice was MOVEMENT today",
  "I look kinda crazy in the mirror rn ngl",
];

// Vibe score from holdings — "cool" assets boost vibe, "dry" assets tank it.
const LEO_VIBE_BY_ASSET = { BOND: -2, TBILL: -2, GOLD: -1, SPX: 0, TECH: 2, BTC: 3, MEME: 3 };

// pickRandom now imported from sim.js (accepts an rng argument for determinism).

// Build a shareable URL with the class seed baked in. Students click the link
// and the game opens with the seed pre-filled — no transcription required.
function buildShareUrl(seed) {
  if (typeof window === 'undefined') return `?seed=${seed}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?seed=${seed}`;
}

// Best-effort clipboard write. Modern Clipboard API on HTTPS/localhost; a
// hidden <textarea> + execCommand fallback for older browsers / odd contexts.
async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

// ===== AUDIO =====
let audioCtx = null;
let musicNodes = [];
let musicVolume = 0.15;
let musicEnabled = true;

function getAudio() {
  if (!audioCtx && typeof window !== 'undefined') {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioCtx;
}

function playTone(freq, duration = 0.1, type = 'sine', volume = 0.1) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

const sfx = {
  buy: () => { playTone(440, 0.08); setTimeout(() => playTone(660, 0.1), 60); },
  sell: () => { playTone(660, 0.08); setTimeout(() => playTone(440, 0.1), 60); },
  cashRegister: () => { for (let i = 0; i < 3; i++) setTimeout(() => playTone(800 + i * 200, 0.05, 'square', 0.08), i * 50); },
  loss: () => playTone(200, 0.3, 'sawtooth', 0.08),
  jail: () => { for (let i = 0; i < 4; i++) setTimeout(() => playTone(i % 2 ? 400 : 600, 0.15, 'square', 0.1), i * 150); },
  crisis: () => { for (let i = 0; i < 6; i++) setTimeout(() => playTone(200 + Math.random() * 100, 0.1, 'sawtooth', 0.08), i * 40); },
  click: () => playTone(800, 0.03, 'square', 0.05),
  next: () => { playTone(523, 0.06); setTimeout(() => playTone(659, 0.06), 50); setTimeout(() => playTone(784, 0.1), 100); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.15), i * 80)),
  achievement: () => { playTone(1046, 0.08); setTimeout(() => playTone(1318, 0.15), 80); },
  chad: () => { playTone(220, 0.1, 'square'); setTimeout(() => playTone(330, 0.08, 'square'), 80); },
  milestone: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.12), i * 100)),
};

// === PROCEDURAL MUSIC ===
function stopMusic() {
  musicNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  musicNodes = [];
}

function startMusic(mode = 'normal') {
  if (!musicEnabled) return;
  stopMusic();
  const ctx = getAudio();
  if (!ctx) return;

  // Mode configs: scale (semitones from root), tempo (ms/step), root freq
  const modes = {
    normal: { scale: [0, 3, 5, 7, 10], tempo: 320, root: 110, type: 'triangle', vol: 1 },
    streak: { scale: [0, 4, 7, 11, 12], tempo: 240, root: 110, type: 'triangle', vol: 1.2 },
    crisis: { scale: [0, 1, 6, 8, 11], tempo: 180, root: 82, type: 'sawtooth', vol: 1 },
    jail: { scale: [0, 3, 6, 8], tempo: 600, root: 55, type: 'sine', vol: 0.8 },
    title: { scale: [0, 3, 7, 10, 12], tempo: 400, root: 110, type: 'sine', vol: 1 },
    win: { scale: [0, 4, 7, 12], tempo: 200, root: 220, type: 'triangle', vol: 1.3 },
  };
  const m = modes[mode] || modes.normal;

  // Bass line — slower
  const bassGain = ctx.createGain();
  bassGain.gain.value = musicVolume * 0.4 * m.vol;
  bassGain.connect(ctx.destination);

  let step = 0;
  const playStep = () => {
    if (!musicEnabled) return;
    // Bass note every 4 steps
    if (step % 4 === 0) {
      const bassFreq = m.root / 2 * Math.pow(2, m.scale[step % m.scale.length] / 12);
      const osc = ctx.createOscillator();
      osc.type = m.type;
      osc.frequency.value = bassFreq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + m.tempo * 4 / 1000);
      osc.connect(g);
      g.connect(bassGain);
      osc.start();
      osc.stop(ctx.currentTime + m.tempo * 4 / 1000);
      musicNodes.push(osc);
    }
    // Melody arpeggio
    const noteFreq = m.root * Math.pow(2, m.scale[step % m.scale.length] / 12);
    const osc = ctx.createOscillator();
    osc.type = m.type;
    osc.frequency.value = noteFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(musicVolume * 0.25 * m.vol, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    musicNodes.push(osc);
    step++;
  };

  const intervalId = setInterval(() => {
    if (!musicEnabled) { clearInterval(intervalId); return; }
    playStep();
  }, m.tempo);
  musicNodes.push({ stop: () => clearInterval(intervalId) });
}

// GAME LENGTH, EVENT_*, gaussian, stepPrice, predictedMedian, monteCarloSim,
// EVENTS, and createSchedule all live in sim.js (pure, testable).

const MENTOR_LINES = {
  start: "Welcome. Ten years to build wealth. Don't blow it.",
  bigLoss: "Rule one: don't lose money. Rule two: never forget rule one.",
  bigWin: "Be fearful when others are greedy. Don't get cocky.",
  jail: "I've never met a rich man who got that way by going to prison.",
  insider: "The SEC tracks trading patterns. The risk doesn't disappear just because you 'knew.'",
  diversify: "All eggs in one basket? Even I diversify.",
  benchmark: "See that dotted line? Beat it.",
  ccDebt: "22% APR'll eat you alive. Pay it down.",
  chad: "That kid Chad? He's selling courses for a reason. He'd be rich if he was right.",
};

// ===== DECISION DILEMMAS =====
// Real personal-finance choices. The lesson is taught by the consequence of
// the player's own decision, not by an assigned character buff.
const DILEMMAS = {
  match: {
    id: 'match',
    title: '💼 Employer Retirement Match',
    body: "Your job offers to match 50% of what you invest, up to a cap — it's literally free money on every future paycheck. Opt in?",
    options: [
      { key: 'in', label: '✅ Opt in (recommended)', detail: '+50% on all future income' },
      { key: 'skip', label: '🚫 Skip it', detail: 'Leave the free money on the table' },
    ],
  },
  emergency: {
    id: 'emergency',
    title: '🚗 Emergency Expense',
    body: 'Your car dies. The repair is $1,200 and you need the car for work. How do you cover it?',
    options: [
      { key: 'cash', label: '💵 Pay $1,200 cash', detail: 'Drains cash, no interest' },
      { key: 'cc', label: '💳 Put it on the 22% card', detail: 'Keep cash, owe 22% APR' },
    ],
  },
  raise: {
    id: 'raise',
    title: '📈 Raise / Side-Gig Offer',
    body: 'You can take on a side gig (or pursue a raise) that bumps your paycheck by 30% for the rest of the game. It costs evenings — but the dollars compound.',
    options: [
      { key: 'take', label: '✅ Take the bump (+30% income)', detail: 'Your future paychecks grow' },
      { key: 'pass', label: '🛋️ Pass — keep your free time', detail: 'No change' },
    ],
  },
  margin: {
    id: 'margin',
    title: '⚡ Margin Account Offer',
    body: 'A broker offers you margin: borrow up to your cash balance to invest, at ~10% APR. Gains and losses are amplified. Real risk.',
    options: [
      { key: 'unlock', label: '⚡ Unlock margin (raise your CC limit by $3,000 @ 22%)', detail: 'Leverage cuts both ways' },
      { key: 'pass', label: '🛡️ Pass — no leverage', detail: 'Stick to cash investing' },
    ],
  },
};

// Human-readable labels for the lesson flags (used in the Teacher view tally).
const LESSON_LABEL = {
  lost_to_index: '📊 Lost to the index',
  chased_meme: '🚀 Chased the meme stock',
  insider: '🤫 Traded on an insider tip',
  jailed: '🚔 Got jailed for fraud',
  cc_debt: '💳 Invested while in high-APR debt',
  cc_remaining: '💸 Ended with credit-card debt',
  panic: '😱 Panic-sold a dip',
  fomo: '🚀 FOMO-bought a pump',
  chad: '🦄 Followed the finfluencer',
  emergency_cc: '🚗 Financed the emergency at 22%',
  declined_match: '💼 Declined the employer match',
  lifestyle_inflation: '🛍️ Lifestyle inflation (Leo got to them)',
  peer_pressure: '👥 Bought what everyone was buying',
};

// ===== PERSISTENT PROFILE (localStorage, same-browser only) =====
const PROFILE_KEY = 'wsh_profile';
function defaultProfile() { return { runs: 0, beatIndex: 0, bestNetWorth: null, avatar: defaultAvatar() }; }
function loadProfile() {
  try { return { ...defaultProfile(), ...(JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}) }; }
  catch (e) { return defaultProfile(); }
}
function saveAvatar(avatar) {
  const p = loadProfile();
  p.avatar = avatar;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
  return p;
}
function recordRun({ netWorth, beat }) {
  const p = loadProfile();
  p.runs += 1;
  if (beat) p.beatIndex += 1;
  if (p.bestNetWorth == null || netWorth > p.bestNetWorth) p.bestNetWorth = netWorth;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {}
  return p;
}

// ===== ANIMATED COUNTER =====
function AnimatedNumber({ value, prefix = '$', decimals = 0, style = {} }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 400;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={style}>{prefix}{display.toFixed(decimals)}</span>;
}

// ===== CHAD CHARACTER =====
function ChadAvatar({ mood, visible }) {
  if (!visible) return null;
  const eyeBlink = Math.random() < 0.1;
  return (
    <div style={{
      ...styles.chadAvatar,
      transform: mood === 'angry' ? 'rotate(-3deg)' : mood === 'smug' ? 'rotate(3deg)' : 'none',
    }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        {/* Hair (purple, spiky) */}
        <path d="M 10 20 Q 15 5 30 8 Q 45 5 50 20 L 48 25 L 42 18 L 35 25 L 28 16 L 22 25 L 16 18 L 12 25 Z" fill="#aa44ff" />
        {/* Face */}
        <ellipse cx="30" cy="32" rx="18" ry="20" fill="#ffd4a8" />
        {/* Sunglasses */}
        <rect x="13" y="26" width="34" height="8" fill="#000" rx="2" />
        <line x1="29" y1="30" x2="31" y2="30" stroke="#000" strokeWidth="2" />
        {/* Mouth */}
        {mood === 'smug' && <path d="M 22 42 Q 30 48 38 42" stroke="#000" strokeWidth="2" fill="none" />}
        {mood === 'angry' && <path d="M 22 46 Q 30 40 38 46" stroke="#000" strokeWidth="2" fill="none" />}
        {mood === 'neutral' && <line x1="24" y1="44" x2="36" y2="44" stroke="#000" strokeWidth="2" />}
        {/* Chain */}
        <circle cx="30" cy="56" r="2" fill="#ffd700" />
        <line x1="25" y1="52" x2="30" y2="54" stroke="#ffd700" strokeWidth="2" />
        <line x1="35" y1="52" x2="30" y2="54" stroke="#ffd700" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ===== LEO CHARACTER =====
// Blonde, blue-green eyes, carefully styled hair. Jock-with-soft-side energy.
function LeoAvatar({ mood = 'cool', visible = true }) {
  if (!visible) return null;
  return (
    <div style={{
      ...styles.chadAvatar,
      transform: mood === 'hyped' ? 'rotate(-2deg) scale(1.05)' : mood === 'worried' ? 'rotate(2deg)' : 'none',
    }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        {/* Hair (blonde, swept) — Leo cares a LOT about this */}
        <path d="M 10 22 Q 12 6 30 6 Q 48 6 50 22 Q 46 14 38 12 Q 30 16 22 12 Q 14 14 10 22 Z" fill="#ffd966" />
        <path d="M 18 14 Q 24 8 32 11" stroke="#e6b800" strokeWidth="1" fill="none" />
        {/* Face */}
        <ellipse cx="30" cy="33" rx="17" ry="19" fill="#ffe0c2" />
        {/* Eyes (blue-green) */}
        <ellipse cx="23" cy="30" rx="3" ry="3.5" fill="#fff" />
        <ellipse cx="37" cy="30" rx="3" ry="3.5" fill="#fff" />
        <circle cx="23" cy="30" r="1.8" fill="#4abfa0" />
        <circle cx="37" cy="30" r="1.8" fill="#4abfa0" />
        <circle cx="23.5" cy="29.5" r="0.6" fill="#fff" />
        <circle cx="37.5" cy="29.5" r="0.6" fill="#fff" />
        {/* Eyebrows — slight worry on `worried`, raised on `hyped` */}
        <line x1="19" y1={mood === 'worried' ? '25' : '24'} x2="27" y2={mood === 'hyped' ? '22' : '25'} stroke="#a87a1a" strokeWidth="1.5" />
        <line x1="33" y1={mood === 'hyped' ? '22' : '25'} x2="41" y2={mood === 'worried' ? '25' : '24'} stroke="#a87a1a" strokeWidth="1.5" />
        {/* Mouth */}
        {mood === 'hyped' && <path d="M 22 41 Q 30 48 38 41" stroke="#000" strokeWidth="2" fill="none" />}
        {mood === 'worried' && <path d="M 23 44 Q 30 41 37 44" stroke="#000" strokeWidth="1.5" fill="none" />}
        {mood === 'cool' && <line x1="24" y1="43" x2="36" y2="43" stroke="#000" strokeWidth="2" />}
        {/* A little lacrosse stick badge over the shoulder */}
        <line x1="6" y1="58" x2="14" y2="50" stroke="#888" strokeWidth="1.5" />
        <circle cx="14" cy="50" r="2" fill="none" stroke="#888" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ===== MONTE CARLO PANEL =====
function MonteCarloPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [numRuns, setNumRuns] = useState(1000);
  function runSim() {
    setRunning(true);
    setTimeout(() => {
      const out = {};
      ASSETS.forEach(a => { out[a.id] = monteCarloSim(a, numRuns); });
      setResults(out); setRunning(false);
    }, 50);
  }
  return (
    <div style={styles.dashCard}>
      <div style={styles.cardTitle}>🧪 MONTE CARLO VERIFICATION</div>
      <div style={styles.mcExplain}>Runs {numRuns} silent 10-year simulations <b>including the damped event process the game actually uses</b>. "Trend" = pure-GBM analytical median (no events); realized median sits near it, with events adding spread and a little vol drag.</div>
      <div style={styles.tradeRow}>
        <select value={numRuns} onChange={e => setNumRuns(parseInt(e.target.value))} style={styles.input}>
          <option value={500}>500 runs</option>
          <option value={1000}>1,000 runs</option>
          <option value={5000}>5,000 runs</option>
        </select>
        <button onClick={runSim} disabled={running} style={styles.submitBtn}>{running ? 'Running...' : 'Run'}</button>
      </div>
      {results && (
        <div style={{ marginTop: '12px' }}>
          <div style={styles.mcTableHeader}>
            <span style={{ flex: 2 }}>Asset</span>
            <span style={{ flex: 1, textAlign: 'right' }}>p10</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Median</span>
            <span style={{ flex: 1, textAlign: 'right' }}>p90</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Trend</span>
          </div>
          {ASSETS.map(a => {
            const r = results[a.id];
            // Realized (with events) should sit in a sensible band around the
            // pure-GBM trend — not exactly on it, because events add spread.
            const match = Math.abs(r.median - r.predicted) / r.predicted < 0.25;
            return (
              <div key={a.id} style={styles.mcRow}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontWeight: 'bold' }}>{a.emoji} {a.id}</div>
                  <div style={{ fontSize: '9px', color: '#888' }}>μ={(a.mu*100).toFixed(1)}% σ={(a.sigma*100).toFixed(1)}%</div>
                </div>
                <span style={{ flex: 1, textAlign: 'right', color: '#ff8855' }}>${r.p10.toFixed(0)}</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#39ff14' }}>${r.median.toFixed(0)}</span>
                <span style={{ flex: 1, textAlign: 'right', color: '#39ff14' }}>${r.p90.toFixed(0)}</span>
                <span style={{ flex: 1, textAlign: 'right', color: match ? '#39ff14' : '#ff8855' }}>${r.predicted.toFixed(0)} {match ? '✓' : '⚠'}</span>
              </div>
            );
          })}
          <div style={styles.mcStats}>
            <div style={styles.cardTitle}>🎯 LESSON CHECK</div>
            <div style={styles.mcInsight}><b>Stocks beat bonds (risk premium)?</b> {results.SPX.median > results.BOND.median ? '✅ YES' : '❌ broken'}</div>
            <div style={styles.mcInsight}><b>Tech edges broad market (more drift & vol)?</b> {results.TECH.median > results.SPX.median ? '✅ YES' : '❌ broken'}</div>
            <div style={styles.mcInsight}><b>Bitcoin: huge σ drags the median below its μ?</b> {results.BTC.median < results.BTC.predicted * 1.0 && results.BTC.median < results.SPX.median ? '✅ YES — vol drag' : '⚠ check'}</div>
            <div style={styles.mcInsight}><b>Meme stock is a wealth trap?</b> {results.MEME.median < 50 ? '✅ YES' : '❌ broken'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== TEACHER DASHBOARD =====
function TeacherDashboard({ onClose }) {
  const [results, setResults] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [tab, setTab] = useState('class');
  const [selectedSeed, setSelectedSeed] = useState(''); // '' = all

  useEffect(() => {
    try { setResults(JSON.parse(localStorage.getItem('wsh_class_results') || '[]')); }
    catch (e) { setResults([]); }
  }, []);

  function submitResult() {
    if (!studentCode.trim() || !studentName.trim()) return;
    try {
      const parts = studentCode.split('|');
      // New format: seed|handle|finalScore|indexScore|lessons. Old codes from
      // pre-seed builds had 4 parts (handle|...); accept both for backward compat.
      let seed = '', handle, finalScore, indexScore, lessons;
      if (parts.length >= 5) {
        [seed, handle, finalScore, indexScore, lessons] = parts;
      } else if (parts.length === 4) {
        [handle, finalScore, indexScore, lessons] = parts;
      } else {
        alert('Invalid code'); return;
      }
      const newR = {
        name: studentName.trim(), handle, seed,
        finalScore: parseFloat(finalScore), indexScore: parseFloat(indexScore),
        beat: parseFloat(finalScore) > parseFloat(indexScore),
        lessons: lessons.split(','), timestamp: Date.now(),
      };
      const updated = [...results, newR];
      setResults(updated);
      localStorage.setItem('wsh_class_results', JSON.stringify(updated));
      setStudentName(''); setStudentCode('');
    } catch (e) { alert('Invalid code'); }
  }
  function clearAll() {
    if (window.confirm('Clear all?')) { localStorage.removeItem('wsh_class_results'); setResults([]); }
  }
  // Filter view by seed if one is selected. Useful when several classes have
  // played different sessions on the same device.
  const filtered = selectedSeed
    ? results.filter(r => (r.seed || '') === selectedSeed)
    : results;
  const beatIndex = filtered.filter(r => r.beat).length;
  const lessonTally = {};
  filtered.forEach(r => (r.lessons || []).forEach(l => { if (l) lessonTally[l] = (lessonTally[l] || 0) + 1; }));
  // Seed tally across ALL results, so the teacher can see what sessions exist.
  const seedTally = {};
  results.forEach(r => { const k = r.seed || '—'; seedTally[k] = (seedTally[k] || 0) + 1; });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>TEACHER VIEW</div>
        <button onClick={onClose} style={styles.maxBtn}>Exit</button>
      </div>
      <div style={styles.tabRow}>
        <button onClick={() => setTab('class')} style={{ ...styles.tabBtn, background: tab === 'class' ? '#0f1f0f' : '#0a0a0a', borderColor: tab === 'class' ? '#39ff14' : '#333' }}>📋 Class</button>
        <button onClick={() => setTab('math')} style={{ ...styles.tabBtn, background: tab === 'math' ? '#0f1f0f' : '#0a0a0a', borderColor: tab === 'math' ? '#39ff14' : '#333' }}>🧪 Math</button>
        <button onClick={() => setTab('discuss')} style={{ ...styles.tabBtn, background: tab === 'discuss' ? '#0f1f0f' : '#0a0a0a', borderColor: tab === 'discuss' ? '#39ff14' : '#333' }}>💬 Prompts</button>
      </div>

      {tab === 'class' && <>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>📋 SUBMIT</div>
          <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Student name" style={styles.input} />
          <input value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="Code from student" style={styles.input} />
          <button onClick={submitResult} style={styles.submitBtn}>Add</button>
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>🎓 SESSIONS BY SEED</div>
          {Object.keys(seedTally).length === 0 ? <div style={styles.muted}>No results yet.</div> :
            <>
              <div style={styles.tradeRow}>
                <button onClick={() => setSelectedSeed('')} style={{...styles.maxBtn, borderColor: selectedSeed === '' ? '#39ff14' : '#555', color: selectedSeed === '' ? '#39ff14' : '#aaa'}}>All ({results.length})</button>
              </div>
              {Object.entries(seedTally).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
                <div key={s} style={styles.tradeRow}>
                  <button onClick={() => setSelectedSeed(s === '—' ? '' : s)}
                    style={{...styles.maxBtn, textAlign: 'left', borderColor: selectedSeed === s ? '#39ff14' : '#555', color: selectedSeed === s ? '#39ff14' : '#ddd'}}>
                    {s === '—' ? '(no seed — solo runs)' : s} · <b>{n}</b>
                  </button>
                </div>
              ))}
            </>}
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>📊 STATS ({filtered.length}{selectedSeed ? ` · ${selectedSeed}` : ''})</div>
          <div style={styles.statLine}>Beat index: <b>{beatIndex}/{filtered.length}</b> ({filtered.length ? Math.round(beatIndex/filtered.length*100) : 0}%)</div>
          <div style={styles.muted}>In real markets, ~80% of active traders lose to passive indexing.</div>
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>🧭 BEHAVIORS THIS COHORT FELL INTO</div>
          {Object.keys(lessonTally).length === 0 ? <div style={styles.muted}>No results yet</div> :
            Object.entries(lessonTally).sort((a,b) => b[1]-a[1]).map(([l, n]) => (
              <div key={l} style={styles.statLine}>{LESSON_LABEL[l] || l}: <b>{n}</b></div>
            ))}
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>👥 RESULTS</div>
          {filtered.length === 0 ? <div style={styles.muted}>No results in this view</div> :
            [...filtered].sort((a,b)=>b.finalScore-a.finalScore).map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <div><b>{r.name}</b> <span style={{ color: '#666' }}>@{r.handle}</span></div>
                <div style={{ color: r.beat ? '#39ff14' : '#ff3b3b', fontSize: '11px' }}>${r.finalScore.toFixed(0)} vs ${r.indexScore.toFixed(0)} ({r.beat ? '✓' : '✗'})</div>
              </div>
            ))}
        </div>
        <button onClick={clearAll} style={styles.dangerBtn}>Clear All</button>
      </>}

      {tab === 'math' && <>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>📐 PARAMETERS</div>
          <div style={styles.mcExplain}>GBM formula: <code style={{ color: '#39ff14', fontSize: '10px' }}>price × exp((μ−σ²/2)·dt + σ·√dt·Z)</code></div>
          {ASSETS.map(a => (
            <div key={a.id} style={styles.paramRow}>
              <div><b>{a.emoji} {a.name}</b></div>
              <div style={styles.paramDetail}>μ={(a.mu*100).toFixed(1)}% σ={(a.sigma*100).toFixed(1)}% drag={((a.sigma*a.sigma)/2*100).toFixed(2)}%</div>
              <div style={styles.paramSource}>📚 {a.source}</div>
            </div>
          ))}
        </div>
        <MonteCarloPanel />
      </>}

      {tab === 'discuss' && <div style={styles.dashCard}>
        <div style={styles.cardTitle}>💬 DISCUSSION PROMPTS</div>
        <div style={styles.prompt}><b>1.</b> Everyone started identically. Why did outcomes differ so much? What does that say about behavior vs. luck vs. the market?</div>
        <div style={styles.prompt}><b>2.</b> Using μ − σ²/2 (volatility drag): why can an asset with a positive average return still lose money at the median? (See Bitcoin in the Math tab.)</div>
        <div style={styles.prompt}><b>3.</b> The credit card is 22% APR; the market averages ~8–10%. Why is paying the card a better guaranteed "return" than investing?</div>
        <div style={styles.prompt}><b>4.</b> The employer match was a guaranteed 50%. Who declined it and why? What does that cost over a career?</div>
        <div style={styles.prompt}><b>5.</b> Who panic-sold a dip or chased a pump? Pull up the price chart — what would holding have done instead?</div>
        <div style={styles.prompt}><b>6.</b> The emergency expense: cash vs. 22% card. Connect this to why an emergency fund exists.</div>
        <div style={styles.prompt}><b>7.</b> Insider tips & Chad the finfluencer: was either ever worth it? Show the expected-value math.</div>
      </div>}
    </div>
  );
}

// ===== STUDENT LEADERBOARD =====
// Reads the same localStorage store the Teacher Dashboard writes. This is
// same-browser only (a shared/kiosk machine, or one the teacher populates via
// student codes). Cross-device ranking would require a backend, which this
// build deliberately does not have.
function Leaderboard({ onClose }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    try { setResults(JSON.parse(localStorage.getItem('wsh_class_results') || '[]')); }
    catch (e) { setResults([]); }
  }, []);
  const ranked = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const beat = results.filter(r => r.beat).length;
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🏆 LEADERBOARD</div>
        <button onClick={onClose} style={styles.maxBtn}>Back</button>
      </div>
      <div style={styles.dashCard}>
        <div style={styles.statLine}>
          {results.length === 0 ? 'No results on this device yet.' :
            <>Beat the index: <b>{beat}/{results.length}</b> ({Math.round(beat / results.length * 100)}%). Most active traders don't.</>}
        </div>
        <div style={styles.muted}>Same-browser only — a shared/kiosk machine or codes the teacher entered.</div>
      </div>
      {ranked.length > 0 && (
        <div style={styles.dashCard}>
          {ranked.map((r, i) => (
            <div key={i} style={styles.resultRow}>
              <div>
                <b>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {r.name}</b>
                {' '}<span style={{ color: '#666' }}>@{r.handle}</span>
                {r.seed && <div style={{ fontSize: '9px', color: '#39a0ff', marginTop: '2px' }}>🎓 {r.seed}</div>}
              </div>
              <div style={{ color: r.beat ? '#39ff14' : '#ff3b3b', fontSize: '11px' }}>
                ${r.finalScore.toFixed(0)} vs index ${r.indexScore.toFixed(0)} ({r.beat ? 'beat ✓' : 'lost ✗'})
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} style={styles.bigButton}>BACK</button>
    </div>
  );
}

// ===== START SCREEN =====
function StartScreen({ onStart, avatar, setAvatar, onTeacher, onLeaderboard, settings, setSettings }) {
  const profile = loadProfile();
  const lenKey = settings.gameLength || 'standard';
  const turns = (GAME_LENGTHS[lenKey] || GAME_LENGTHS.standard).turns;
  const av = avatar || defaultAvatar();
  const set = (patch) => setAvatar({ ...av, ...patch });
  const cleanHandle = (s) => s.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 16);
  const [toast, setToast] = useState('');
  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2000); }
  useEffect(() => { startMusic('title'); return () => stopMusic(); }, []);
  return (
    <div style={styles.container}>
      <div style={styles.startHero}>
        <div style={styles.startTitle}>WALL ST.</div>
        <div style={styles.startTitle2}>HUSTLE</div>
        <div style={styles.startSub}>{turns} turns • 10 years • Beat the index</div>
        {profile.runs > 0 && (
          <div style={styles.startCareer}>
            🏅 {profile.runs} runs · beat index {profile.beatIndex}/{profile.runs} · best ${(profile.bestNetWorth ?? 0).toFixed(0)}
          </div>
        )}
      </div>

      <div style={styles.settingsRow}>
        <button onClick={() => {
          const newM = !settings.music;
          setSettings({ ...settings, music: newM });
          musicEnabled = newM;
          if (newM) startMusic('title'); else stopMusic();
        }} style={styles.settingBtn}>🎵 {settings.music ? 'ON' : 'OFF'}</button>
        <button onClick={() => { setSettings({ ...settings, gameLength: lenKey === 'standard' ? 'quick' : 'standard' }); sfx.click(); }} style={styles.settingBtn}>
          ⏱️ {(GAME_LENGTHS[lenKey] || GAME_LENGTHS.standard).label}
        </button>
        <button onClick={() => {
          const order = ['off', 'slow', 'fast'];
          const next = order[(order.indexOf(settings.autoSpeed || 'off') + 1) % order.length];
          setSettings({ ...settings, autoSpeed: next }); sfx.click();
        }} style={styles.settingBtn}>▶ {(AUTO_SPEEDS[settings.autoSpeed] || AUTO_SPEEDS.off).label}</button>
      </div>

      <div style={styles.classDetail}>
        <div style={styles.classDetailName}>🪪 BUILD YOUR INVESTOR</div>
        <div style={{ textAlign: 'center', fontSize: '48px', margin: '6px 0' }}>
          <span style={{ filter: `drop-shadow(0 0 6px ${av.color})` }}>{av.face}</span>
          {av.accessory !== '—' && <span>{av.accessory}</span>}
        </div>

        <div style={styles.avatarRow}>
          {AVATAR_FACES.map(f => (
            <button key={f} onClick={() => { set({ face: f }); sfx.click(); }}
              style={{ ...styles.avatarChip, borderColor: av.face === f ? av.color : '#333' }}>{f}</button>
          ))}
        </div>
        <div style={styles.avatarRow}>
          {AVATAR_ACCESSORIES.map(x => (
            <button key={x} onClick={() => { set({ accessory: x }); sfx.click(); }}
              style={{ ...styles.avatarChip, borderColor: av.accessory === x ? av.color : '#333' }}>{x}</button>
          ))}
        </div>
        <div style={styles.avatarRow}>
          {AVATAR_COLORS.map(c => (
            <button key={c} onClick={() => { set({ color: c }); sfx.click(); }}
              style={{ ...styles.avatarChip, background: c, borderColor: av.color === c ? '#fff' : '#333' }} />
          ))}
        </div>

        <input value={av.name} maxLength={18} onChange={e => set({ name: e.target.value })}
          placeholder="Your name" style={styles.input} />
        <input value={av.handle} maxLength={16} onChange={e => set({ handle: cleanHandle(e.target.value) })}
          placeholder="trader handle" style={styles.input} />
        <div style={styles.classStats}>You start with ${START.cash} cash and a ${START.loan} student loan @ {(START.loanAPR*100).toFixed(0)}%. Everyone's the same — the lessons come from your choices.</div>
      </div>

      {/* Class seed — for synchronous classroom play. Teacher generates and
          shares the code; students enter it and play the identical 10 years. */}
      <div style={styles.classDetail}>
        <div style={styles.classDetailName}>🎓 CLASSROOM (OPTIONAL)</div>
        <div style={styles.muted}>Leave blank for a fresh random market. Enter a class seed to play the identical 10 years as the rest of your class.</div>
        <div style={styles.tradeRow}>
          <input value={settings.classSeed || ''}
            onChange={e => setSettings({ ...settings, classSeed: normalizeSeedCode(e.target.value) })}
            placeholder="WSH-XXXXXX"
            style={{ ...styles.input, marginBottom: 0 }} />
          <button onClick={() => { setSettings({ ...settings, classSeed: generateSeedCode() }); sfx.click(); }}
            style={styles.maxBtn}>🎲 Generate (teacher)</button>
        </div>
        {settings.classSeed && <>
          <div style={{ ...styles.classStats, color: '#39a0ff' }}>Active seed: <b>{settings.classSeed}</b> — every student who enters this gets identical events &amp; prices.</div>
          <button onClick={async () => {
              const ok = await copyToClipboard(buildShareUrl(settings.classSeed));
              flash(ok ? '🔗 Class link copied — paste it for your students.' : '⚠️ Copy failed — select the URL bar manually.');
              sfx.click();
            }}
            style={{ ...styles.maxBtn, width: '100%', marginTop: '8px', borderColor: '#39a0ff', color: '#39a0ff' }}>
            🔗 Copy class link (paste into Google Classroom / Slack)
          </button>
        </>}
      </div>

      <button onClick={() => { sfx.next(); onStart(); }} style={styles.bigButton}>BEGIN ▶</button>
      <button onClick={onLeaderboard} style={styles.teacherBtn}>🏆 Leaderboard</button>
      <button onClick={onTeacher} style={styles.teacherBtn}>👨‍🏫 Teacher Dashboard</button>
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ===== MAIN GAME =====
function Game({ avatar, seed, onEnd, settings, setSettings }) {
  const av = avatar || defaultAvatar();
  const totalTurns = (GAME_LENGTHS[settings.gameLength] || GAME_LENGTHS.standard).turns;
  const dt = HORIZON_YEARS / totalTurns;
  const baseIncomePerTurn = START.incomePerYear * dt;
  // Autosave restore. If localStorage holds an in-progress save that matches
  // this seed and game length, we restore it; otherwise start fresh. The
  // restore happens exactly once at mount via the ref-cache pattern.
  const SAVE_KEY = `wsh_savegame_v1_${seed || 'solo'}`;
  const savedRef = useRef(null);
  if (savedRef.current === null) {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(SAVE_KEY) : null;
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 1 && !s.gameOver && s.totalTurns === totalTurns) {
          savedRef.current = s;
        }
      }
    } catch (e) { /* ignore */ }
    if (savedRef.current === null) savedRef.current = {};
  }
  const saved = savedRef.current;
  // Single Game-scoped seeded RNG. Every gameplay random draw flows through
  // this — events, asset shocks in MC, Chad/Leo triggers, insider tips, the
  // schedule. Same seed → identical 10 years for every player in a class.
  // On restore, we replay the RNG state so post-refresh draws are byte-
  // identical to what would have happened without the refresh.
  const rngRef = useRef(null);
  if (rngRef.current === null) {
    rngRef.current = makeRng(seed || 'WSH-UNSEEDED');
    if (typeof saved.rngState === 'number') rngRef.current.setState(saved.rngState);
  }
  const rng = rngRef.current;
  // Helper: pick saved value if present, else default. Using `in` lets us
  // preserve falsy values (0, false, null, '') that hasOwnProperty would too
  // but `in` is concise and reads cleanly.
  const sv = (key, def) => (key in saved ? saved[key] : def);
  const [turn, setTurn] = useState(() => sv('turn', 1));
  const [cash, setCash] = useState(() => sv('cash', START.cash));
  const [loan, setLoan] = useState(() => sv('loan', START.loan));
  const [creditCard, setCreditCard] = useState(() => sv('creditCard', START.cc));
  const [holdings, setHoldings] = useState(() => sv('holdings', {}));
  const [prices, setPrices] = useState(() => sv('prices', Object.fromEntries(ASSETS.map(a => [a.id, 100]))));
  const [priceHistory, setPriceHistory] = useState(() => sv('priceHistory', Object.fromEntries(ASSETS.map(a => [a.id, [100]]))));
  const initialNW = START.cash - START.loan - START.cc;
  const [netWorthHistory, setNetWorthHistory] = useState(() => sv('netWorthHistory', [initialNW]));
  const [indexHistory, setIndexHistory] = useState(() => sv('indexHistory', [initialNW]));
  // Benchmark = a passive "responsible twin": same start cash invested 60/40,
  // same starting debt at same rates, same paycheck — uses income to pay down
  // debt (CC first) before investing the rest. This makes "beat the index" a
  // fair comparison instead of one inflated by the player's exogenous income.
  const [idxInvested, setIdxInvested] = useState(() => sv('idxInvested', START.cash));
  const [idxLoan, setIdxLoan] = useState(() => sv('idxLoan', START.loan));
  const [idxCC, setIdxCC] = useState(() => sv('idxCC', START.cc));
  // Per-asset buy-and-hold counterfactual: same paycheck/debt cash flows as the
  // benchmark twin, but the investable remainder goes 100% into one asset.
  // Powers the end-of-run "best single asset in hindsight" comparison.
  const [cfInvested, setCfInvested] = useState(() => sv('cfInvested', Object.fromEntries(ASSETS.map(a => [a.id, START.cash]))));
  // Emergent-lesson state: employer match opted-in, a pending decision dilemma,
  // and behavior counts detected from the player's OWN trades (not forced).
  const [matchOn, setMatchOn] = useState(() => sv('matchOn', false));
  const [raiseMultiplier, setRaiseMultiplier] = useState(() => sv('raiseMultiplier', 1));
  const [marginUnlocked, setMarginUnlocked] = useState(() => sv('marginUnlocked', false));
  const [ccLimitState, setCcLimitState] = useState(() => sv('ccLimitState', START.ccLimit));
  const [dilemma, setDilemma] = useState(() => sv('dilemma', null));
  const [dilemmaSeen, setDilemmaSeen] = useState(() => sv('dilemmaSeen', {}));
  const incomePerTurn = baseIncomePerTurn * (matchOn ? 1.5 : 1) * raiseMultiplier;
  const [eventLog, setEventLog] = useState(() => sv('eventLog', [{ turn: 0, text: `📰 ${av.face} ${av.name} starts with $${START.cash} and a $${START.loan} student loan.` }]));
  const [mentorMsg, setMentorMsg] = useState(() => sv('mentorMsg', MENTOR_LINES.start));
  const [insiderTip, setInsiderTip] = useState(() => sv('insiderTip', null));
  const [pendingInvestigation, setPendingInvestigation] = useState(() => sv('pendingInvestigation', null));
  const [inJail, setInJail] = useState(() => sv('inJail', 0));
  const [winStreak, setWinStreak] = useState(() => sv('winStreak', 0));
  const [holdStreak, setHoldStreak] = useState(() => sv('holdStreak', Object.fromEntries(ASSETS.map(a => [a.id, 0]))));
  const [achievements, setAchievements] = useState(() => sv('achievements', []));
  const [flags, setFlags] = useState(() => sv('flags', { chasedMeme: 0, insiderRevealed: 0, insiderTraded: 0, jailed: 0, ccBorrows: 0, panicSells: 0, fomoBuys: 0, chadFollowed: 0, chadIgnored: 0, emergencyToCC: 0, declinedMatch: 0, leveredUp: 0, lifestyleBuys: 0, peerPressureBuys: 0, leoIgnored: 0, raiseAccepted: 0, marginUsed: 0 }));
  const [selectedAsset, setSelectedAsset] = useState(() => sv('selectedAsset', 'SPX'));
  const [tradeAmount, setTradeAmount] = useState(1);
  const [showInfo, setShowInfo] = useState(null);
  const [screenShake, setScreenShake] = useState(0);
  const [priceFlash, setPriceFlash] = useState({});
  const [gameOver, setGameOver] = useState(() => sv('gameOver', false));
  const [schedule, setSchedule] = useState(() => sv('schedule', null) || createSchedule(totalTurns, rng));
  const [chadTip, setChadTip] = useState(() => sv('chadTip', null));
  const [chadMood, setChadMood] = useState(() => sv('chadMood', 'smug'));
  const [chadHistory, setChadHistory] = useState(() => sv('chadHistory', [])); // {correct: bool}
  // Leo: the peer (vs. Chad the finfluencer). Separate state — Leo's offers
  // and his peer-pressure pitches don't crowd Chad out, they alternate.
  const [leoOffer, setLeoOffer] = useState(() => sv('leoOffer', null));   // {item,emoji,cost,pitch}
  const [leoTip, setLeoTip] = useState(() => sv('leoTip', null));       // {asset,text,turn,resolved,correct}
  const [leoMood, setLeoMood] = useState(() => sv('leoMood', 'cool'));
  const [leoHistory, setLeoHistory] = useState(() => sv('leoHistory', [])); // peer-pressure track record
  const [leoFlavor, setLeoFlavor] = useState(null); // transient filler quip (not persisted)
  const [lifestyleSpent, setLifestyleSpent] = useState(() => sv('lifestyleSpent', 0));
  const [milestone, setMilestone] = useState(null); // { tier } for celebration (transient)
  const [lifestyle, setLifestyle] = useState(() => sv('lifestyle', getLifestyle(initialNW)));
  const [musicMode, setMusicMode] = useState('normal');
  const [toast, setToast] = useState('');
  function flashToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2000); }

  const portfolioValue = Object.entries(holdings).reduce((sum, [id, qty]) => sum + qty * prices[id], 0);
  const totalDebt = loan + creditCard;
  const netWorth = cash + portfolioValue - totalDebt;
  const indexValue = indexHistory[indexHistory.length - 1];

  // Music state management
  useEffect(() => {
    if (!settings.music) return;
    startMusic(musicMode);
    return () => stopMusic();
  }, [musicMode, settings.music]);

  useEffect(() => {
    let newMode = 'normal';
    if (inJail > 0) newMode = 'jail';
    else if (winStreak >= 3) newMode = 'streak';
    if (newMode !== musicMode) setMusicMode(newMode);
  }, [winStreak, inJail]);

  // Lifestyle progression
  useEffect(() => {
    const newLs = getLifestyle(netWorth);
    if (newLs.index > lifestyle.index) {
      setMilestone(newLs);
      sfx.milestone();
      setTimeout(() => setMilestone(null), 3500);
    }
    setLifestyle(newLs);
  }, [netWorth]);

  // Auto-advance: re-armed every time `turn` changes, so each scheduled call
  // closes over fresh state instead of a stale setInterval snapshot.
  useEffect(() => {
    const sp = AUTO_SPEEDS[settings.autoSpeed] || AUTO_SPEEDS.off;
    if (sp.ms <= 0 || gameOver || dilemma) return;
    const id = setTimeout(() => advanceTurn(), sp.ms);
    return () => clearTimeout(id);
  }, [turn, gameOver, dilemma, settings.autoSpeed]);

  // Record the run to the persistent profile exactly once when the game ends.
  const savedRunRef = useRef(false);
  useEffect(() => {
    if (!gameOver || savedRunRef.current) return;
    savedRunRef.current = true;
    recordRun({ netWorth, beat: netWorth > indexValue });
  }, [gameOver]);

  // Autosave: writes a full snapshot to localStorage on every turn change so
  // a refresh (or accidental tab close) doesn't blow away the game. RNG state
  // is snapshotted too — restore is byte-identical to a no-refresh continuation.
  // Cleared on game-over so we don't restore a finished run on a fresh start.
  useEffect(() => {
    if (gameOver) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      return;
    }
    try {
      const snapshot = {
        v: 1, totalTurns, seed: seed || null,
        turn, cash, loan, creditCard, holdings, prices, priceHistory,
        netWorthHistory, indexHistory,
        idxInvested, idxLoan, idxCC, cfInvested,
        matchOn, raiseMultiplier, marginUnlocked, ccLimitState,
        dilemma, dilemmaSeen,
        eventLog, mentorMsg,
        insiderTip, pendingInvestigation,
        inJail, winStreak, holdStreak,
        achievements, flags,
        selectedAsset, gameOver,
        schedule,
        chadTip, chadMood, chadHistory,
        leoOffer, leoTip, leoMood, leoHistory, lifestyleSpent,
        lifestyle,
        rngState: rngRef.current.getState(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    } catch (e) { /* localStorage quota or serialization issue — best effort */ }
    // Intentionally narrow deps: writing on every micro-state-change would be
    // wasteful. Per-turn (and on gameOver flip) is the right granularity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameOver]);

  function addAchievement(text) {
    if (achievements.includes(text)) return;
    setAchievements(a => [...a, text]);
    sfx.achievement();
  }

  // Get upcoming events for display
  function upcomingEvents() {
    return schedule.filter(s => s.turn >= turn && s.turn <= turn + 5).slice(0, 3);
  }

  function advanceTurn() {
    if (gameOver) return;
    sfx.next();

    // Income first (always); employer match boosts it if opted in.
    let newCash = cash + incomePerTurn;

    // Damped, Poisson-style event. Most turns are uneventful so the calibrated
    // GBM trend (not an arbitrary shock stream) drives realized returns.
    const event = rng() < eventProbPerTurn(dt)
      ? EVENTS[Math.floor(rng() * EVENTS.length)]
      : { text: '🟢 Quiet market — no major news.', shocks: {} };
    if (event.sfx) sfx[event.sfx]();
    if (event.sfx === 'crisis') { setScreenShake(8); setMusicMode('crisis'); setTimeout(() => setMusicMode('normal'), 3000); }

    const newPrices = {};
    const newHistory = { ...priceHistory };
    const flashes = {};
    ASSETS.forEach(a => {
      let shock = (event.shocks[a.id] || 0) * EVENT_SHOCK_SCALE;
      // Apply scheduled events (also damped, for the same reason)
      schedule.forEach(s => {
        if (s.turn === turn + 1 && s.asset === a.id) {
          if (s.type === 'earnings') shock += (s.beat ? 0.08 : -0.10) * EVENT_SHOCK_SCALE;
        }
        if (s.turn === turn + 1 && s.type === 'fed') {
          if (a.id === 'BOND') shock += s.direction * 0.03 * (s.surprise ? 2 : 1) * EVENT_SHOCK_SCALE;
          if (a.id === 'TECH') shock += -s.direction * 0.02 * (s.surprise ? 2 : 1) * EVENT_SHOCK_SCALE;
        }
      });
      const newP = stepPrice(prices[a.id], a.mu, a.sigma, shock, dt, rng);
      newPrices[a.id] = newP;
      newHistory[a.id] = [...priceHistory[a.id], newP].slice(-40);
      const change = (newP - prices[a.id]) / prices[a.id];
      if (Math.abs(change) > 0.05) flashes[a.id] = change > 0 ? 'up' : 'down';
    });
    setPriceFlash(flashes);
    setTimeout(() => setPriceFlash({}), 600);

    // Scheduled events log
    schedule.filter(s => s.turn === turn + 1).forEach(s => {
      if (s.type === 'earnings') {
        setEventLog(l => [{ turn: turn + 1, text: `${s.asset === 'TECH' ? '💻' : '🏢'} ${s.asset} earnings: ${s.beat ? 'BEAT 📈' : 'MISS 📉'}` }, ...l].slice(0, 8));
        if (s.beat) sfx.cashRegister(); else sfx.loss();
      } else if (s.type === 'fed') {
        setEventLog(l => [{ turn: turn + 1, text: `🏦 Fed ${s.direction > 0 ? 'cut' : 'hike'}${s.surprise ? ' (SURPRISE!)' : ''}` }, ...l].slice(0, 8));
      } else if (s.type === 'ipo') {
        const moon = rng() < 0.4;
        setEventLog(l => [{ turn: turn + 1, text: `🎯 NewCo IPO ${moon ? 'moons 🚀' : 'flops 💀'} (no shares available — kid, you needed a broker)` }, ...l].slice(0, 8));
      }
    });

    // Decision dilemmas — the lesson emerges from the player's own choice,
    // not an assigned archetype.
    const nextT = turn + 1;
    if (!dilemma && !chadTip && !insiderTip && !leoOffer && !leoTip) {
      if (!dilemmaSeen.match && nextT >= Math.round(0.06 * totalTurns)) {
        setDilemma(DILEMMAS.match); setDilemmaSeen(s => ({ ...s, match: true }));
      } else if (!dilemmaSeen.raise && nextT >= Math.round(0.22 * totalTurns)) {
        setDilemma(DILEMMAS.raise); setDilemmaSeen(s => ({ ...s, raise: true }));
      } else if (!dilemmaSeen.emergency && nextT >= Math.round(0.45 * totalTurns)) {
        setDilemma(DILEMMAS.emergency); setDilemmaSeen(s => ({ ...s, emergency: true }));
      } else if (!dilemmaSeen.margin && nextT >= Math.round(0.65 * totalTurns)) {
        setDilemma(DILEMMAS.margin); setDilemmaSeen(s => ({ ...s, margin: true }));
      }
    }

    // Paycheck notification every ~10 turns
    if ((turn + 1) % 10 === 0) {
      setEventLog(l => [{ turn: turn + 1, text: `💰 Paycheck: +$${incomePerTurn.toFixed(0)}${matchOn ? ' (incl. employer match)' : ''}` }, ...l].slice(0, 8));
    }

    // Compound debts (per-turn rate scales with dt so the APR is the same
    // whether the game is 40 or 100 turns).
    const newLoan = loan * (1 + START.loanAPR * dt);
    const newCC = creditCard * (1 + START.ccAPR * dt);

    // Benchmark: passive "responsible twin" (see state declarations above).
    // Same paycheck and starting debt as the player; pays down debt (CC first,
    // then loan) with income, invests the remainder in a 60/40 SPX/BOND index.
    const spxRet = newPrices.SPX / prices.SPX;
    const bondRet = newPrices.BOND / prices.BOND;
    let bInvested = idxInvested * (0.6 * spxRet + 0.4 * bondRet);
    let bLoan = idxLoan * (1 + START.loanAPR * dt);
    let bCC = idxCC * (1 + START.ccAPR * dt);
    // The responsible twin always takes the employer match — they're the
    // baseline of "did the obvious right thing." Independent of player choice.
    let bIncome = baseIncomePerTurn * 1.5;
    const bPayCC = Math.min(bIncome, bCC); bCC -= bPayCC; bIncome -= bPayCC;
    const bPayLoan = Math.min(bIncome, bLoan); bLoan -= bPayLoan; bIncome -= bPayLoan;
    bInvested += bIncome;
    const newIndex = bInvested - bLoan - bCC;

    // Per-asset buy-and-hold counterfactual: identical debt servicing and the
    // same investable remainder as the twin, but 100% into a single asset.
    const newCfInvested = {};
    ASSETS.forEach(a => {
      newCfInvested[a.id] = cfInvested[a.id] * (newPrices[a.id] / prices[a.id]) + bIncome;
    });

    // No forced behavior — panic-selling and FOMO-buying are now DETECTED from
    // the player's own trades (see buy/sell), so the lesson is emergent.
    let updatedHoldings = { ...holdings };

    // Chad tip (every 8-12 turns)
    if (!chadTip && !insiderTip && turn > 3 && turn % (8 + Math.floor(rng() * 5)) === 0) {
      const tip = CHAD_TIPS[Math.floor(rng() * CHAD_TIPS.length)];
      setChadTip({ ...tip, turn, resolved: false });
      setChadMood('smug');
      sfx.chad();
    }

    // Resolve previous Chad tip (after 5 turns since given)
    if (chadTip && !chadTip.resolved && turn - chadTip.turn >= 5) {
      const asset = ASSETS.find(a => a.id === chadTip.asset);
      const currPrice = newPrices[chadTip.asset];
      const startPrice = priceHistory[chadTip.asset][priceHistory[chadTip.asset].length - 5] || currPrice;
      const moved = (currPrice - startPrice) / startPrice;
      const correct = (chadTip.direction > 0 && moved > 0.05) || (chadTip.direction < 0 && moved < -0.05);
      setChadHistory(h => [...h, { correct, asset: chadTip.asset }]);
      setChadMood(correct ? 'smug' : 'angry');
      setChadTip({ ...chadTip, resolved: true, correct });
      setTimeout(() => setChadTip(null), 4500);
    }

    // Leo: lifestyle upgrade offer (Poisson-style, dt-scaled so the count is
    // stable across game lengths). Targeting ~3 offers per 10-yr game.
    if (!leoOffer && !chadTip && !leoTip && !dilemma && turn > 4 && rng() < 0.35 * dt) {
      setLeoOffer(pickRandom(LEO_LIFESTYLE_OFFERS, rng));
      setLeoMood('hyped');
    }
    // Leo: peer-pressure pitch — rarer than Chad and offset from him.
    if (!leoTip && !chadTip && !leoOffer && !insiderTip && turn > 6 && rng() < 0.25 * dt) {
      const t = pickRandom(LEO_PEER_PITCHES, rng);
      setLeoTip({ ...t, turn, resolved: false });
      setLeoMood('hyped');
    }
    // Resolve previous Leo peer-pressure pitch (after 5 turns).
    if (leoTip && !leoTip.resolved && turn - leoTip.turn >= 5) {
      const currPrice = newPrices[leoTip.asset];
      const startPrice = priceHistory[leoTip.asset][priceHistory[leoTip.asset].length - 5] || currPrice;
      const moved = (currPrice - startPrice) / startPrice;
      // Leo's pitch is always bullish ("everyone is buying X") — correct iff up.
      const correct = moved > 0.05;
      setLeoHistory(h => [...h, { correct, asset: leoTip.asset }]);
      setLeoMood(correct ? 'hyped' : 'worried');
      setLeoTip({ ...leoTip, resolved: true, correct });
      setTimeout(() => setLeoTip(null), 4500);
    }
    // Filler flavor every so often — Leo is just... talking
    if (!leoFlavor && !leoTip && !chadTip && rng() < 0.10 * dt) {
      setLeoFlavor(pickRandom(LEO_FILLER, rng));
      setTimeout(() => setLeoFlavor(null), 3500);
    }

    // Insider tip
    let newTip = insiderTip;
    if (!insiderTip && rng() < 0.06 && turn > 5) {
      const tipAsset = ASSETS[Math.floor(rng() * (ASSETS.length - 1)) + 1];
      newTip = { asset: tipAsset.id, direction: rng() < 0.6 ? 1 : -1, magnitude: 0.15 + rng() * 0.15, expiryTurn: turn + 3, revealed: false };
    }
    if (insiderTip && turn >= insiderTip.expiryTurn) {
      const shock = insiderTip.direction * insiderTip.magnitude;
      newPrices[insiderTip.asset] *= (1 + shock);
      setEventLog(l => [{ turn: turn + 1, text: `📰 ${insiderTip.asset}: ${insiderTip.direction > 0 ? '+' : ''}${(shock*100).toFixed(0)}%` }, ...l].slice(0, 8));
      if (pendingInvestigation) {
        const roll = rng();
        if (roll < 0.15) {
          setInJail(5); setFlags(f => ({ ...f, jailed: f.jailed + 1 }));
          newCash = Math.max(0, newCash - 1500);
          setMentorMsg(MENTOR_LINES.jail);
          sfx.jail(); setScreenShake(10);
          setEventLog(l => [{ turn: turn + 1, text: `🚔 BUSTED! 5 turns jail + $1500.` }, ...l].slice(0, 8));
        } else if (roll < 0.40) {
          const fine = Math.min(newCash, 1500); newCash -= fine;
          setEventLog(l => [{ turn: turn + 1, text: `⚖️ SEC fine: $${fine.toFixed(0)}` }, ...l].slice(0, 8));
          sfx.loss();
        } else {
          setEventLog(l => [{ turn: turn + 1, text: `💰 Got away clean.` }, ...l].slice(0, 8));
        }
        setPendingInvestigation(null);
      }
      newTip = null;
    }

    const newHoldStreak = { ...holdStreak };
    ASSETS.forEach(a => {
      if ((updatedHoldings[a.id] || 0) > 0) newHoldStreak[a.id] = (newHoldStreak[a.id] || 0) + 1;
      else newHoldStreak[a.id] = 0;
    });

    // Post-turn net worth, computed from the freshly updated state (cash,
    // holdings, prices, debt). Using the live `netWorth` here would be stale
    // by one turn, lagging the chart and the streak/achievement checks.
    const newPortfolioValue = ASSETS.reduce((s, a) => s + (updatedHoldings[a.id] || 0) * newPrices[a.id], 0);
    const newNetWorth = newCash + newPortfolioValue - (newLoan + newCC);

    const oldNW = netWorthHistory[netWorthHistory.length - 1];
    const change = (newNetWorth - oldNW) / Math.abs(oldNW || 1);
    if (change > 0.05) setWinStreak(s => s + 1); else if (change < 0) setWinStreak(0);
    if (winStreak + 1 >= 3 && change > 0.05) addAchievement('🔥 3-turn streak');
    if (winStreak + 1 >= 5 && change > 0.05) addAchievement('🔥🔥 5-turn streak');
    if (newHoldStreak.SPX >= 30) addAchievement('💎 Diamond hands SPX');
    if (newNetWorth > initialNW * 3) addAchievement('💰 Tripled net worth');
    if (newNetWorth > newIndex * 1.5) addAchievement('🏆 Crushing the index');

    setEventLog(l => [{ turn: turn + 1, text: event.text }, ...l].slice(0, 8));

    let newMentor = mentorMsg;
    if (creditCard > 1000) newMentor = MENTOR_LINES.ccDebt;
    else if (change < -0.15) newMentor = MENTOR_LINES.bigLoss;
    else if (change > 0.20) newMentor = MENTOR_LINES.bigWin;
    else if (turn === 10) newMentor = MENTOR_LINES.benchmark;
    else if (chadHistory.length >= 3 && flags.chadFollowed >= 2) newMentor = MENTOR_LINES.chad;

    setPrices(newPrices);
    setPriceHistory(newHistory);
    setCash(newCash);
    setLoan(newLoan);
    setCreditCard(newCC);
    setHoldings(updatedHoldings);
    setIndexHistory([...indexHistory, newIndex]);
    setNetWorthHistory([...netWorthHistory, newNetWorth]);
    setIdxInvested(bInvested);
    setIdxLoan(bLoan);
    setIdxCC(bCC);
    setCfInvested(newCfInvested);
    setInsiderTip(newTip);
    setInJail(Math.max(0, inJail - 1));
    setMentorMsg(newMentor);
    setHoldStreak(newHoldStreak);
    setTurn(turn + 1);

    setTimeout(() => setScreenShake(0), 500);

    if (turn + 1 >= totalTurns) {
      setTimeout(() => { sfx.win(); setMusicMode('win'); setGameOver(true); }, 600);
    }
  }

  function buy(assetId, qty) {
    if (inJail > 0 || qty < 1) return;
    const asset = ASSETS.find(a => a.id === assetId);
    const cost = qty * prices[assetId] * (1 + asset.spread);
    if (cost > cash) return;
    setCash(cash - cost);
    setHoldings({ ...holdings, [assetId]: (holdings[assetId] || 0) + qty });
    sfx.buy();
    if (asset.id === 'MEME') setFlags(f => ({ ...f, chasedMeme: f.chasedMeme + 1 }));
    // Emergent FOMO: buying right after a sharp run-up = chasing the top.
    const ph = priceHistory[assetId];
    const prevP = ph.length >= 2 ? ph[ph.length - 2] : prices[assetId];
    if ((prices[assetId] - prevP) / prevP >= 0.15) setFlags(f => ({ ...f, fomoBuys: f.fomoBuys + 1 }));
    // Emergent leverage: investing while carrying credit-card debt.
    if (creditCard > 0) setFlags(f => ({ ...f, leveredUp: f.leveredUp + 1 }));
    // Leo's group chat reacts to what you just bought (occasionally).
    const leoLines = LEO_GROUP_CHAT[assetId];
    if (leoLines && rng() < 0.45) {
      const quip = pickRandom(leoLines, rng);
      setEventLog(l => [{ turn, text: `💬 Leo: "${quip}"` }, ...l].slice(0, 8));
    }
    if (insiderTip && insiderTip.revealed && insiderTip.asset === assetId && insiderTip.direction > 0) {
      setPendingInvestigation({ asset: assetId });
      setFlags(f => ({ ...f, insiderTraded: f.insiderTraded + 1 }));
      setMentorMsg(MENTOR_LINES.insider);
    }
  }
  function sell(assetId, qty) {
    if (inJail > 0) return;
    const owned = holdings[assetId] || 0;
    if (qty > owned || qty < 1) return;
    const asset = ASSETS.find(a => a.id === assetId);
    setCash(cash + qty * prices[assetId] * (1 - asset.spread));
    setHoldings({ ...holdings, [assetId]: owned - qty });
    sfx.sell();
    // Emergent panic-sell: dumping right after a sharp drop = locking losses.
    const ph = priceHistory[assetId];
    const prevP = ph.length >= 2 ? ph[ph.length - 2] : prices[assetId];
    if ((prices[assetId] - prevP) / prevP <= -0.10) setFlags(f => ({ ...f, panicSells: f.panicSells + 1 }));
    if (insiderTip && insiderTip.revealed && insiderTip.asset === assetId && insiderTip.direction < 0) {
      setPendingInvestigation({ asset: assetId });
      setFlags(f => ({ ...f, insiderTraded: f.insiderTraded + 1 }));
      setMentorMsg(MENTOR_LINES.insider);
    }
  }
  function revealTip() { setInsiderTip({ ...insiderTip, revealed: true }); setFlags(f => ({ ...f, insiderRevealed: f.insiderRevealed + 1 })); sfx.click(); }
  function dismissTip() { setInsiderTip(null); addAchievement('🦉 Walked away from tip'); }

  function followChad() {
    if (!chadTip || chadTip.resolved) return;
    const asset = ASSETS.find(a => a.id === chadTip.asset);
    if (chadTip.direction > 0) {
      // Buy the asset
      const maxQty = Math.floor(cash / (prices[chadTip.asset] * 1.02));
      if (maxQty > 0) buy(chadTip.asset, Math.min(maxQty, 5));
    } else {
      // Sell holdings of that asset
      const owned = holdings[chadTip.asset] || 0;
      if (owned > 0) sell(chadTip.asset, owned);
    }
    setFlags(f => ({ ...f, chadFollowed: f.chadFollowed + 1 }));
    setChadTip({ ...chadTip, followed: true });
  }
  function ignoreChad() {
    setFlags(f => ({ ...f, chadIgnored: f.chadIgnored + 1 }));
    setChadTip(null);
    addAchievement('🧠 Ignored Chad');
  }

  function acceptLeoOffer() {
    if (!leoOffer) return;
    const cost = leoOffer.cost;
    if (cash < cost) {
      // Buy on the card — Leo loves this
      setCreditCard(c => c + cost);
      setFlags(f => ({ ...f, ccBorrows: f.ccBorrows + 1 }));
    } else {
      setCash(c => c - cost);
    }
    setLifestyleSpent(s => s + cost);
    setFlags(f => ({ ...f, lifestyleBuys: f.lifestyleBuys + 1 }));
    setEventLog(l => [{ turn, text: `🛍️ Bought ${leoOffer.emoji} ${leoOffer.item} ($${cost}). Leo: "${pickRandom(LEO_REACT_BUY)}"` }, ...l].slice(0, 8));
    sfx.cashRegister();
    setLeoMood('hyped');
    setLeoOffer(null);
  }
  function declineLeoOffer() {
    if (!leoOffer) return;
    setFlags(f => ({ ...f, leoIgnored: f.leoIgnored + 1 }));
    setEventLog(l => [{ turn, text: `🚫 Skipped ${leoOffer.emoji} ${leoOffer.item}. Leo: "${pickRandom(LEO_REACT_DECLINE)}"` }, ...l].slice(0, 8));
    setLeoMood('worried');
    setLeoOffer(null);
  }
  function followLeo() {
    if (!leoTip || leoTip.resolved) return;
    const asset = ASSETS.find(a => a.id === leoTip.asset);
    const maxQty = Math.floor(cash / (prices[leoTip.asset] * 1.02));
    if (maxQty > 0) buy(leoTip.asset, Math.min(maxQty, 5));
    setFlags(f => ({ ...f, peerPressureBuys: f.peerPressureBuys + 1 }));
    setLeoTip({ ...leoTip, followed: true });
  }
  function ignoreLeoTip() {
    setFlags(f => ({ ...f, leoIgnored: f.leoIgnored + 1 }));
    setLeoTip(null);
    addAchievement('🧠 Ignored the peer pressure');
  }

  function payLoan(amt) { const p = Math.min(amt, cash, loan); setCash(cash - p); setLoan(loan - p); sfx.click(); }
  function payCC(amt) { const p = Math.min(amt, cash, creditCard); setCash(cash - p); setCreditCard(creditCard - p); sfx.click(); }
  function borrowCC(amt) {
    if (creditCard + amt > ccLimitState) return;
    setCash(cash + amt); setCreditCard(creditCard + amt);
    setFlags(f => ({ ...f, ccBorrows: f.ccBorrows + 1 }));
    sfx.click();
  }
  function resolveDilemma(key) {
    if (!dilemma) return;
    if (dilemma.id === 'match') {
      if (key === 'in') {
        setMatchOn(true);
        setEventLog(l => [{ turn, text: '💼 Opted into the employer match — every paycheck now +50%.' }, ...l].slice(0, 8));
        sfx.cashRegister();
      } else {
        setFlags(f => ({ ...f, declinedMatch: f.declinedMatch + 1 }));
        setEventLog(l => [{ turn, text: '💼 Declined the employer match (free money skipped).' }, ...l].slice(0, 8));
      }
    } else if (dilemma.id === 'emergency') {
      if (key === 'cash' && cash >= 1200) {
        setCash(cash - 1200);
        setEventLog(l => [{ turn, text: '🚗 Paid the $1,200 repair in cash.' }, ...l].slice(0, 8));
      } else {
        setCreditCard(creditCard + 1200);
        setFlags(f => ({ ...f, emergencyToCC: f.emergencyToCC + 1 }));
        setEventLog(l => [{ turn, text: '🚗 Put the $1,200 repair on the 22% card.' }, ...l].slice(0, 8));
        sfx.loss();
      }
    } else if (dilemma.id === 'raise') {
      if (key === 'take') {
        setRaiseMultiplier(1.3);
        setFlags(f => ({ ...f, raiseAccepted: f.raiseAccepted + 1 }));
        setEventLog(l => [{ turn, text: '📈 Took the bump. Paychecks now +30%.' }, ...l].slice(0, 8));
        sfx.cashRegister();
      } else {
        setEventLog(l => [{ turn, text: '🛋️ Passed on the side gig.' }, ...l].slice(0, 8));
      }
    } else if (dilemma.id === 'margin') {
      if (key === 'unlock') {
        setMarginUnlocked(true);
        setCcLimitState(c => c + 3000);
        setFlags(f => ({ ...f, marginUsed: f.marginUsed + 1 }));
        setEventLog(l => [{ turn, text: '⚡ Margin unlocked. Borrow limit raised by $3,000 — leverage cuts both ways.' }, ...l].slice(0, 8));
      } else {
        setEventLog(l => [{ turn, text: '🛡️ Skipped margin. Sticking to cash investing.' }, ...l].slice(0, 8));
      }
    }
    setDilemma(null);
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    setSettings({ ...settings, music: musicEnabled });
    if (musicEnabled) startMusic(musicMode); else stopMusic();
  }

  if (gameOver) {
    const beatIndex = netWorth > indexValue;
    const won = beatIndex;
    const lessons = [];
    if (flags.chasedMeme > 3) lessons.push('chased_meme');
    if (flags.insiderTraded > 0) lessons.push('insider');
    if (flags.jailed > 0) lessons.push('jailed');
    if (flags.ccBorrows > 0 || flags.leveredUp > 0) lessons.push('cc_debt');
    if (flags.panicSells > 0) lessons.push('panic');
    if (flags.fomoBuys > 0) lessons.push('fomo');
    if (flags.chadFollowed > 0) lessons.push('chad');
    if (flags.emergencyToCC > 0) lessons.push('emergency_cc');
    if (flags.declinedMatch > 0) lessons.push('declined_match');
    if (flags.lifestyleBuys > 1 || lifestyleSpent > 1500) lessons.push('lifestyle_inflation');
    if (flags.peerPressureBuys > 0) lessons.push('peer_pressure');
    if (!beatIndex) lessons.push('lost_to_index');
    if (creditCard > 0) lessons.push('cc_remaining');
    const shareCode = `${seed || 'NOSEED'}|${av.handle}|${netWorth.toFixed(0)}|${indexValue.toFixed(0)}|${lessons.join(',')}`;
    const chadCorrect = chadHistory.filter(h => h.correct).length;
    const leoCorrect = leoHistory.filter(h => h.correct).length;
    // Honest counterfactual: dollars spent on Leo's status purchases, compounded
    // at 8% over ~5 yrs avg (mid-game spending) = lifestyleSpent × 1.47.
    const lifestyleAtEight = lifestyleSpent * Math.pow(1.08, 5);

    // Counterfactuals: same paychecks/debt, but one passive choice all game.
    const cfDebt = idxLoan + idxCC;
    const cfRows = ASSETS.map(a => ({ id: a.id, emoji: a.emoji, name: a.name, nw: cfInvested[a.id] - cfDebt }));
    const bestCf = cfRows.reduce((b, x) => (x.nw > b.nw ? x : b), cfRows[0]);
    const profile = loadProfile();

    return (
      <div style={{ ...styles.container, background: lifestyle.bg }}>
        <div style={styles.gameOver}>
          <div style={styles.gameOverTitle}>10 YEARS COMPLETE</div>
          <div style={styles.classBadge}>{av.face}{av.accessory !== '—' ? av.accessory : ''} {av.name} <span style={{ color: '#666' }}>@{av.handle}</span></div>
          <div style={styles.lifestyleBadge}>{lifestyle.emoji} {lifestyle.name}</div>
          <AnimatedNumber value={netWorth} style={styles.finalScore} />
          <div style={styles.indexCompare}>
            Index: ${indexValue.toFixed(0)}<br />
            <span style={{ color: won ? '#39ff14' : '#ff3b3b', fontWeight: 'bold' }}>
              {won ? `🏆 YOU WIN!` : `📉 You lost to the index.`}
            </span>
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>🔁 IF YOU'D DONE NOTHING BUT…</div>
            <div style={styles.cfRow}>
              <span>🧍 You (active trading)</span>
              <b style={{ color: '#39ff14' }}>${netWorth.toFixed(0)}</b>
            </div>
            <div style={styles.cfRow}>
              <span>⚖️ Passive 60/40, paid debt first</span>
              <b style={{ color: netWorth >= indexValue ? '#888' : '#ff8855' }}>${indexValue.toFixed(0)}</b>
            </div>
            <div style={styles.cfRow}>
              <span>{bestCf.emoji} All-in {bestCf.name} (best in hindsight)</span>
              <b style={{ color: '#888' }}>${bestCf.nw.toFixed(0)}</b>
            </div>
            <div style={styles.muted}>
              Hindsight always finds a winner — you can't know it in advance. That's the case for diversifying, not picking.
            </div>
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>😎 LEO'S FINAL READ</div>
            <div style={styles.cfRow}>
              <span>Final Vibe</span>
              <b style={{ color: '#ffd966' }}>{vibeEmoji} {leoVibe}/10</b>
            </div>
            <div style={styles.cfRow}>
              <span>Actual Net Worth</span>
              <b style={{ color: netWorth >= indexValue ? '#39ff14' : '#ff3b3b' }}>${netWorth.toFixed(0)}</b>
            </div>
            {lifestyleSpent > 0 && <>
              <div style={styles.cfRow}><span>🛍️ Spent on Leo's lifestyle hits</span><b>${lifestyleSpent.toFixed(0)}</b></div>
              <div style={styles.cfRow}><span>📈 Same money invested @ 8% for ~5 yrs</span><b style={{ color: '#39ff14' }}>${lifestyleAtEight.toFixed(0)}</b></div>
            </>}
            {leoHistory.length > 0 && (
              <div style={styles.cfRow}>
                <span>👥 Leo's "everyone's buying" tips</span>
                <b>{leoCorrect}/{leoHistory.length} correct</b>
              </div>
            )}
            <div style={styles.muted}>Vibe doesn't compound. Net worth does.</div>
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>📈 YOUR CAREER</div>
            <div style={styles.cfRow}><span>Runs played</span><b>{profile.runs}</b></div>
            <div style={styles.cfRow}><span>Beat the index</span><b>{profile.beatIndex}/{profile.runs}</b></div>
            <div style={styles.cfRow}><span>All-time best net worth</span><b style={{ color: '#39ff14' }}>${(profile.bestNetWorth ?? netWorth).toFixed(0)}</b></div>
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>📖 LESSONS</div>
            {lessons.length === 0 && <div style={styles.recapItem}>✨ Clean run — disciplined play.</div>}
            {lessons.includes('lost_to_index') && <div style={styles.recapItem}>📊 You lost to a passive 60/40 index. ~80% of active traders do too.</div>}
            {lessons.includes('chased_meme') && <div style={styles.recapItem}>🚀 High-σ assets eaten by vol drag (σ²/2). Higher μ doesn't mean higher return.</div>}
            {lessons.includes('insider') && <div style={styles.recapItem}>🤫 Insider trading: real prosecutions = up to 20 years prison.</div>}
            {lessons.includes('jailed') && <div style={styles.recapItem}>🚔 Securities fraud is one of the most-prosecuted white-collar crimes.</div>}
            {lessons.includes('cc_debt') && <div style={styles.recapItem}>💳 22% APR debt = guaranteed 22% "return" if paid. Better math than stocks at ~10%.</div>}
            {lessons.includes('cc_remaining') && <div style={styles.recapItem}>💸 You ended with CC debt. It keeps compounding after the game.</div>}
            {lessons.includes('panic') && <div style={styles.recapItem}>😱 Panic selling = locking in losses, missing recovery.</div>}
            {lessons.includes('fomo') && <div style={styles.recapItem}>🚀 FOMO = buying tops. By the time everyone notices, the move is over.</div>}
            {lessons.includes('chad') && <div style={styles.recapItem}>🦄 You followed Chad {flags.chadFollowed}x. His real-life accuracy: {chadHistory.length ? Math.round(chadCorrect/chadHistory.length*100) : 0}%. Most "finfluencers" are like this.</div>}
            {lessons.includes('lifestyle_inflation') && <div style={styles.recapItem}>🛍️ You spent ${lifestyleSpent.toFixed(0)} on visible status (Leo approved). Lifestyle inflation is the silent compounder working in reverse.</div>}
            {lessons.includes('peer_pressure') && <div style={styles.recapItem}>👥 You bought "what everyone was buying" {flags.peerPressureBuys}x. The crowd is sometimes right, but the herd doesn't owe you a return.</div>}
            {lessons.includes('emergency_cc') && <div style={styles.recapItem}>🚗 You financed the emergency at 22%. An emergency fund exists so a $1,200 surprise doesn't cost far more than $1,200.</div>}
            {lessons.includes('declined_match') && <div style={styles.recapItem}>💼 You skipped the employer match — that's a guaranteed 50% return you turned down. Almost nothing else pays that.</div>}
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>🏅 ACHIEVEMENTS</div>
            {achievements.length === 0 ? <div style={styles.muted}>None unlocked</div> :
              achievements.map((a, i) => <div key={i} style={styles.recapItem}>{a}</div>)}
          </div>

          <div style={styles.recapCard}>
            <div style={styles.recapTitle}>🎓 CODE FOR TEACHER</div>
            <div style={styles.codeBox}>{shareCode}</div>
            <button onClick={async () => {
                const ok = await copyToClipboard(shareCode);
                flashToast(ok ? '📋 Code copied — paste it where your teacher asked.' : '⚠️ Copy failed — read it to your teacher.');
              }}
              style={{ ...styles.maxBtn, width: '100%', marginTop: '6px', borderColor: '#39ff14', color: '#39ff14' }}>
              📋 Copy share code
            </button>
          </div>

          <button onClick={onEnd} style={styles.bigButton}>PLAY AGAIN</button>
          {toast && <div style={styles.toast}>{toast}</div>}
        </div>
      </div>
    );
  }

  const upcoming = upcomingEvents();
  // Leo's Vibe Check — entirely cosmetic. Status doesn't compound.
  const vibeRaw = 5
    + ASSETS.reduce((s, a) => s + ((holdings[a.id] || 0) > 0 ? (LEO_VIBE_BY_ASSET[a.id] || 0) : 0), 0)
    + Math.min(3, lifestyleSpent / 1000);
  const leoVibe = Math.max(0, Math.min(10, Math.round(vibeRaw)));
  const vibeEmoji = leoVibe >= 8 ? '🔥' : leoVibe >= 5 ? '😎' : leoVibe >= 3 ? '😐' : '💀';

  return (
    <div style={{
      ...styles.container,
      background: lifestyle.bg,
      transform: screenShake ? `translate(${(Math.random()-0.5)*screenShake}px, ${(Math.random()-0.5)*screenShake}px)` : 'none'
    }}>
      {/* Milestone celebration overlay */}
      {milestone && (
        <div style={styles.milestoneOverlay}>
          <div style={styles.milestoneCard}>
            <div style={styles.milestoneEmoji}>{milestone.emoji}</div>
            <div style={styles.milestoneTitle}>NEW LIFESTYLE TIER</div>
            <div style={styles.milestoneName}>{milestone.name.toUpperCase()}</div>
            <div style={styles.milestoneSub}>You've unlocked a {milestone.name.toLowerCase()}.</div>
          </div>
        </div>
      )}

      {/* Decision dilemma — blocks auto-advance until resolved */}
      {dilemma && (
        <div style={styles.milestoneOverlay}>
          <div style={styles.dilemmaCard}>
            <div style={styles.dilemmaTitle}>{dilemma.title}</div>
            <div style={styles.dilemmaBody}>{dilemma.body}</div>
            {dilemma.options.map(o => (
              <button key={o.key} onClick={() => { sfx.click(); resolveDilemma(o.key); }} style={styles.dilemmaBtn}>
                <div style={{ fontWeight: 'bold' }}>{o.label}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>{o.detail}</div>
              </button>
            ))}
            <div style={styles.muted}>Your choice — and its consequence — is the lesson.</div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.title}>{av.face}{av.accessory !== '—' ? av.accessory : ''} {av.name.toUpperCase()}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>{lifestyle.emoji}</span>
          <button onClick={toggleMusic} style={styles.musicBtn} title="Toggle music">{settings.music ? '🎵' : '🔇'}</button>
          <button onClick={() => {
            const order = ['off', 'slow', 'fast'];
            const next = order[(order.indexOf(settings.autoSpeed || 'off') + 1) % order.length];
            setSettings({ ...settings, autoSpeed: next });
          }} style={styles.musicBtn} title="Auto-advance speed">
            {settings.autoSpeed === 'slow' ? '▶' : settings.autoSpeed === 'fast' ? '⏩' : '⏸'}
          </button>
          <span style={styles.dayCounter}>T {turn}/{totalTurns}</span>
        </div>
      </div>

      {seed && <div style={styles.seedBar} title="Same seed = same 10-year market for everyone in your class.">🎓 Class seed: <b>{seed}</b></div>}

      {inJail > 0 && <div style={styles.jail}>🚔 IN JAIL — {inJail} turns</div>}
      {winStreak >= 3 && <div style={styles.streak}>🔥 {winStreak}-turn streak!</div>}

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>NET WORTH</div>
          <AnimatedNumber value={netWorth} style={{ ...styles.statValue, color: netWorth >= 0 ? '#39ff14' : '#ff3b3b' }} />
        </div>
        <div style={styles.stat}><div style={styles.statLabel}>CASH</div><AnimatedNumber value={cash} style={styles.statValue} /></div>
        <div style={styles.stat}><div style={styles.statLabel}>DEBT</div><AnimatedNumber value={totalDebt} style={{ ...styles.statValue, color: '#ff3b3b' }} /></div>
        <div style={styles.stat}><div style={styles.statLabel}>HELD</div><AnimatedNumber value={portfolioValue} style={styles.statValue} /></div>
      </div>

      <div style={styles.vibeBar} title="Cosmetic only. Status does not compound.">
        <span>LEO'S VIBE CHECK</span>
        <span style={styles.vibeValue}>{vibeEmoji} {leoVibe}/10</span>
      </div>

      <div style={styles.chartCard}>
        <div style={styles.chartLabel}>YOU <span style={{color:'#39ff14'}}>━</span>  vs INDEX <span style={{color:'#888'}}>┄</span></div>
        <NetWorthChart netWorthHistory={netWorthHistory} indexHistory={indexHistory} indexValue={indexValue} netWorth={netWorth} />
      </div>

      {/* Upcoming events ticker */}
      {upcoming.length > 0 && (
        <div style={styles.upcomingCard}>
          <div style={styles.upcomingLabel}>📅 UPCOMING</div>
          {upcoming.map((e, i) => (
            <div key={i} style={styles.upcomingItem}>
              <span style={styles.upcomingTurn}>T{e.turn}</span> {e.text}
            </div>
          ))}
        </div>
      )}

      {/* Coached first three turns — students get their bearings before the
          full game opens up. After turn 3 the training wheels come off. */}
      {turn <= 3 && (
        <div style={styles.onboardBanner}>
          <div style={styles.onboardTitle}>🧭 GETTING STARTED · Turn {turn}/3</div>
          <div style={styles.onboardBody}>
            {turn === 1 && "You start with $1,000 cash and a $4,000 student loan. Each turn = ~1.2 months. Pick an asset card below — try the S&P 500 — then BUY. Watch what happens vs the dashed index line."}
            {turn === 2 && "The dashed line is a passive 'responsible twin' that does the boring thing. Beating it is the whole game. Most active traders don't."}
            {turn === 3 && "Heads up: you'll be offered decisions soon (employer match, side gig, emergency, margin). Read them — they matter more than any trade you make."}
          </div>
        </div>
      )}

      <div style={styles.mentorBox}>
        <div style={styles.mentorAvatar}>👴</div>
        <div style={styles.mentorText}>
          <div style={styles.mentorName}>GRANDPA WARREN</div>
          <div style={styles.mentorMessage}>{mentorMsg}</div>
        </div>
      </div>

      {/* Chad the Finfluencer */}
      {chadTip && !chadTip.resolved && (
        <div style={styles.chadBox}>
          <ChadAvatar mood={chadMood} visible={true} />
          <div style={styles.chadContent}>
            <div style={styles.chadName}>🦄 CHAD BULLRUN <span style={styles.chadHandle}>@chadbullrun</span></div>
            <div style={styles.chadText}>"{chadTip.text}"</div>
            <div style={styles.chadStats}>
              Track record: {chadHistory.length === 0 ? 'No history yet' :
                `${chadHistory.filter(h => h.correct).length}/${chadHistory.length} correct (${Math.round(chadHistory.filter(h => h.correct).length/chadHistory.length*100)}%)`}
            </div>
            <div style={styles.chadButtons}>
              {!chadTip.followed && <button onClick={followChad} style={styles.chadFollowBtn}>📈 Follow tip</button>}
              <button onClick={ignoreChad} style={styles.chadIgnoreBtn}>🚫 Ignore</button>
            </div>
          </div>
        </div>
      )}
      {chadTip && chadTip.resolved && (
        <div style={{ ...styles.chadBox, borderColor: chadTip.correct ? '#39ff14' : '#ff3b3b' }}>
          <ChadAvatar mood={chadMood} visible={true} />
          <div style={styles.chadContent}>
            <div style={styles.chadName}>🦄 CHAD BULLRUN</div>
            <div style={styles.chadText}>
              {chadTip.correct ?
                `"${CHAD_QUOTES_GOOD_TIP[Math.floor(Math.random() * CHAD_QUOTES_GOOD_TIP.length)]}"` :
                `"${CHAD_QUOTES_BAD_TIP[Math.floor(Math.random() * CHAD_QUOTES_BAD_TIP.length)]}"`}
            </div>
            <div style={{ ...styles.chadStats, color: chadTip.correct ? '#39ff14' : '#ff3b3b' }}>
              {chadTip.correct ? '✓ Tip was right' : '✗ Tip was wrong'}
            </div>
          </div>
        </div>
      )}

      {/* Leo: lifestyle upgrade offer */}
      {leoOffer && (
        <div style={styles.leoBox}>
          <LeoAvatar mood="hyped" visible={true} />
          <div style={styles.chadContent}>
            <div style={styles.leoName}>😎 LEO <span style={styles.chadHandle}>@leo.the.goat</span></div>
            <div style={styles.chadText}>"{leoOffer.pitch}"</div>
            <div style={styles.chadStats}>{leoOffer.emoji} {leoOffer.item} — ${leoOffer.cost}{cash < leoOffer.cost && ' (goes on the 22% card)'}</div>
            <div style={styles.chadButtons}>
              <button onClick={acceptLeoOffer} style={styles.leoFollowBtn}>💸 Cop it</button>
              <button onClick={declineLeoOffer} style={styles.chadIgnoreBtn}>🚫 Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Leo: peer-pressure pitch */}
      {leoTip && !leoTip.resolved && (
        <div style={styles.leoBox}>
          <LeoAvatar mood="hyped" visible={true} />
          <div style={styles.chadContent}>
            <div style={styles.leoName}>😎 LEO <span style={styles.chadHandle}>@leo.the.goat</span></div>
            <div style={styles.chadText}>"{leoTip.text}"</div>
            <div style={styles.chadStats}>
              Leo's track record: {leoHistory.length === 0 ? 'No history yet' :
                `${leoHistory.filter(h => h.correct).length}/${leoHistory.length} correct (${Math.round(leoHistory.filter(h => h.correct).length/leoHistory.length*100)}%)`}
            </div>
            <div style={styles.chadButtons}>
              {!leoTip.followed && <button onClick={followLeo} style={styles.leoFollowBtn}>👥 Buy what everyone's buying</button>}
              <button onClick={ignoreLeoTip} style={styles.chadIgnoreBtn}>🧠 Think for yourself</button>
            </div>
          </div>
        </div>
      )}
      {leoTip && leoTip.resolved && (
        <div style={{ ...styles.leoBox, borderColor: leoTip.correct ? '#39ff14' : '#ff3b3b' }}>
          <LeoAvatar mood={leoTip.correct ? 'hyped' : 'worried'} visible={true} />
          <div style={styles.chadContent}>
            <div style={styles.leoName}>😎 LEO</div>
            <div style={styles.chadText}>"{leoTip.correct ? 'BRO. CALLED IT. we cooking 🔥' : 'bro... ok that was kinda fien. my bad 😬'}"</div>
            <div style={{ ...styles.chadStats, color: leoTip.correct ? '#39ff14' : '#ff3b3b' }}>
              {leoTip.correct ? '✓ The herd was right (this time)' : '✗ The herd was wrong'}
            </div>
          </div>
        </div>
      )}

      {/* Leo filler quip — small, transient */}
      {leoFlavor && !leoOffer && !leoTip && (
        <div style={styles.leoFiller}>💬 Leo: "{leoFlavor}"</div>
      )}

      {insiderTip && inJail === 0 && (
        <div style={styles.insiderTip}>
          <div style={styles.insiderHeader}>🤫 ANONYMOUS TIP</div>
          {!insiderTip.revealed ? (
            <>
              <div style={styles.insiderText}>Someone slipped you an envelope. Open it?</div>
              <div style={styles.tipWarning}>⚠️ Revealing = possessing MNPI. Trading {insiderTip.asset} til T{insiderTip.expiryTurn} risks 15% jail / 25% fine / 60% clean.</div>
              <div style={styles.tipButtons}>
                <button onClick={revealTip} style={styles.illegalBtn}>👁 Reveal</button>
                <button onClick={dismissTip} style={styles.cleanBtn}>🙅 Walk Away</button>
              </div>
            </>
          ) : (
            <>
              <div style={styles.insiderText}><b>{insiderTip.asset}</b> will {insiderTip.direction > 0 ? `POP +${(insiderTip.magnitude*100).toFixed(0)}%` : `DUMP ${(insiderTip.magnitude*100).toFixed(0)}%`} on T{insiderTip.expiryTurn}.</div>
              <div style={styles.tipWarning}>You possess MNPI. Don't trade it.</div>
            </>
          )}
        </div>
      )}

      {pendingInvestigation && <div style={styles.warning}>⚠️ {pendingInvestigation.asset} trade flagged.</div>}

      <div style={styles.marketTitle}>MARKET</div>
      <div style={styles.marketGrid}>
        {ASSETS.map(a => {
          const prevP = priceHistory[a.id][priceHistory[a.id].length - 2] || prices[a.id];
          const change = ((prices[a.id] - prevP) / prevP) * 100;
          const owned = holdings[a.id] || 0;
          const isSelected = selectedAsset === a.id;
          const flash = priceFlash[a.id];
          const hasUpcoming = schedule.some(s => s.asset === a.id && s.turn > turn && s.turn <= turn + 3);
          return (
            <div key={a.id} onClick={() => { setSelectedAsset(a.id); sfx.click(); }}
              style={{ ...styles.assetCard,
                borderColor: isSelected ? '#39ff14' : '#333',
                background: flash === 'up' ? '#1a3a1a' : flash === 'down' ? '#3a1a1a' : (isSelected ? '#0f1f0f' : '#0a0a0a'),
                transition: 'background 0.4s' }}>
              <div style={styles.assetTop}>
                <span style={styles.assetEmoji}>{a.emoji}</span>
                <span style={styles.assetName}>{a.id}</span>
                <span onClick={e => { e.stopPropagation(); setShowInfo(showInfo === a.id ? null : a.id); }} style={styles.infoBtn}>ℹ</span>
              </div>
              <div style={styles.assetPrice}>${prices[a.id].toFixed(2)}</div>
              <div style={{ ...styles.assetChange, color: change >= 0 ? '#39ff14' : '#ff3b3b' }}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
              </div>
              <Sparkline data={priceHistory[a.id]} color={change >= 0 ? '#39ff14' : '#ff3b3b'} />
              {owned > 0 && <div style={styles.assetOwned}>×{owned}</div>}
              {hasUpcoming && <div style={styles.eventBadge}>📅</div>}
              {showInfo === a.id && (
                <div style={styles.infoBox}>
                  {a.desc}<br/>μ/σ hidden — like real life. (Teacher view shows them.)
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.tradePanel}>
        <div style={styles.tradeTitle}>TRADE: {ASSETS.find(a => a.id === selectedAsset).emoji} {selectedAsset} @ ${prices[selectedAsset].toFixed(2)}</div>
        <div style={styles.tradeRow}>
          <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))} style={styles.qtyBtn}>−</button>
          <input type="number" value={tradeAmount} onChange={e => setTradeAmount(Math.max(1, parseInt(e.target.value) || 1))} style={styles.qtyInput} />
          <button onClick={() => setTradeAmount(tradeAmount + 1)} style={styles.qtyBtn}>+</button>
          <button onClick={() => buy(selectedAsset, tradeAmount)} style={styles.buyBtn}>BUY</button>
          <button onClick={() => sell(selectedAsset, tradeAmount)} style={styles.sellBtn}>SELL</button>
        </div>
        <div style={styles.tradeRow}>
          <button onClick={() => buy(selectedAsset, Math.floor(cash / (prices[selectedAsset] * 1.02)))} style={styles.maxBtn}>BUY MAX</button>
          <button onClick={() => sell(selectedAsset, holdings[selectedAsset] || 0)} style={styles.maxBtn}>SELL ALL</button>
        </div>
      </div>

      <div style={styles.debtPanel}>
        <div style={styles.debtRow}><span>🎓 Student Loan</span><span>${loan.toFixed(0)} @ {(START.loanAPR*100).toFixed(0)}%</span></div>
        <div style={styles.debtBtns}>
          <button onClick={() => payLoan(100)} style={styles.payBtn} disabled={cash < 100 || loan < 1}>$100</button>
          <button onClick={() => payLoan(500)} style={styles.payBtn} disabled={cash < 500 || loan < 1}>$500</button>
          <button onClick={() => payLoan(loan)} style={styles.payBtn} disabled={cash < loan || loan < 1}>All</button>
        </div>
        <div style={{...styles.debtRow, marginTop:'8px'}}><span>💸 Credit Card</span><span style={{color:'#ff8855'}}>${creditCard.toFixed(0)} @ {(START.ccAPR*100).toFixed(0)}%</span></div>
        <div style={styles.debtBtns}>
          <button onClick={() => borrowCC(500)} style={styles.borrowBtn} disabled={creditCard >= ccLimitState - 500}>Borrow $500</button>
          <button onClick={() => payCC(500)} style={styles.payBtn} disabled={cash < 500 || creditCard < 1}>$500</button>
          <button onClick={() => payCC(creditCard)} style={styles.payBtn} disabled={cash < creditCard || creditCard < 1}>All</button>
        </div>
      </div>

      <div style={styles.eventLog}>
        <div style={styles.logTitle}>📰 NEWS</div>
        {eventLog.map((e, i) => (
          <div key={i} style={{ ...styles.logEntry, opacity: 1 - i * 0.12 }}>
            <span style={styles.logDay}>T{e.turn}</span> {e.text}
          </div>
        ))}
      </div>

      <button onClick={advanceTurn} style={styles.bigButton}>
        {(AUTO_SPEEDS[settings.autoSpeed] || AUTO_SPEEDS.off).ms > 0 ? '⏩ AUTO — tap for next now' : `⏭️ NEXT TURN (+$${incomePerTurn.toFixed(0)})`}
      </button>
    </div>
  );
}

function Sparkline({ data, color, width = 60, height = 24 }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

function NetWorthChart({ netWorthHistory, indexHistory, indexValue, netWorth }) {
  const w = 320, h = 100;
  const all = [...netWorthHistory, ...indexHistory];
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  const toPts = arr => arr.map((v, i) => `${(i / Math.max(1, netWorthHistory.length - 1)) * w},${h - ((v - min) / range) * h + 4}`).join(' ');
  return (
    <svg width={w} height={h + 8}>
      <polyline points={toPts(indexHistory)} fill="none" stroke="#888" strokeWidth="1.5" strokeDasharray="3 3" />
      <polyline points={toPts(netWorthHistory)} fill="none" stroke={netWorth >= indexValue ? '#39ff14' : '#ff3b3b'} strokeWidth="2" />
    </svg>
  );
}

export default function App() {
  const [screen, setScreen] = useState('start');
  const [avatar, setAvatar] = useState(() => loadProfile().avatar || defaultAvatar());
  const [settings, setSettings] = useState(() => {
    // Pre-fill classSeed from the URL when the link includes ?seed=WSH-XXXXXX.
    // Lets a teacher share one link instead of dictating a code to 30 kids.
    let seedFromUrl = '';
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const code = normalizeSeedCode(new URLSearchParams(window.location.search).get('seed') || '');
      if (/^WSH-[A-Z0-9]{6}$/.test(code)) seedFromUrl = code;
    }
    return { music: true, gameLength: 'standard', autoSpeed: 'off', classSeed: seedFromUrl };
  });
  const [activeSeed, setActiveSeed] = useState(null); // seed used by the current/last game
  useEffect(() => { musicEnabled = settings.music; }, [settings.music]);
  function startGame() {
    // Class seed (if the teacher distributed one) → identical 10 years for
    // every student who enters it. Otherwise a fresh random seed per run.
    const code = normalizeSeedCode(settings.classSeed);
    const seed = code || generateSeedCode();
    setActiveSeed(seed);
    setScreen('game');
  }
  if (screen === 'teacher') return <TeacherDashboard onClose={() => setScreen('start')} />;
  if (screen === 'leaderboard') return <Leaderboard onClose={() => setScreen('start')} />;
  if (screen === 'game') return <Game avatar={avatar} seed={activeSeed} onEnd={() => setScreen('start')} settings={settings} setSettings={setSettings} />;
  return <StartScreen
    onStart={startGame}
    avatar={avatar}
    setAvatar={(a) => { setAvatar(a); saveAvatar(a); }}
    onTeacher={() => setScreen('teacher')}
    onLeaderboard={() => setScreen('leaderboard')}
    settings={settings} setSettings={setSettings} />;
}

const styles = {
  container: { fontFamily: '"JetBrains Mono", "Courier New", monospace', background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '14px', maxWidth: '480px', margin: '0 auto', transition: 'background 0.8s ease', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #39ff14', paddingBottom: '8px', marginBottom: '12px' },
  title: { fontSize: '14px', fontWeight: 'bold', color: '#39ff14', letterSpacing: '1px' },
  dayCounter: { fontSize: '14px', color: '#888' },
  musicBtn: { background: 'transparent', border: '1px solid #333', color: '#888', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '14px' },
  settingsRow: { display: 'flex', gap: '6px', marginBottom: '14px', justifyContent: 'center' },
  settingBtn: { padding: '6px 12px', background: '#1a1a1a', border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', borderRadius: '4px' },
  startHero: { textAlign: 'center', padding: '20px 0', borderBottom: '2px solid #39ff14', marginBottom: '20px' },
  startTitle: { fontSize: '32px', fontWeight: 'bold', color: '#39ff14', letterSpacing: '4px', lineHeight: '1' },
  startTitle2: { fontSize: '32px', fontWeight: 'bold', color: '#fff', letterSpacing: '4px', marginTop: '4px' },
  startSub: { fontSize: '11px', color: '#888', marginTop: '8px', letterSpacing: '2px' },
  startCareer: { fontSize: '10px', color: '#d4a017', marginTop: '8px', letterSpacing: '1px' },
  classGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '14px' },
  classCard: { border: '2px solid #333', padding: '10px 4px', borderRadius: '4px', cursor: 'pointer', textAlign: 'center', position: 'relative' },
  clearedBadge: { position: 'absolute', top: '2px', right: '4px', fontSize: '10px', color: '#d4a017' },
  avatarRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '8px' },
  avatarChip: { width: '36px', height: '36px', fontSize: '18px', background: '#0a0a0a', border: '2px solid #333', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  classEmoji: { fontSize: '24px' },
  className: { fontSize: '9px', color: '#aaa', marginTop: '4px' },
  classDetail: { background: '#0a0a0a', border: '1px solid #39ff14', padding: '14px', borderRadius: '4px', marginBottom: '14px' },
  classDetailName: { fontSize: '16px', color: '#39ff14', marginBottom: '6px' },
  classTagline: { fontSize: '12px', marginBottom: '8px', color: '#ddd' },
  classLesson: { fontSize: '11px', color: '#d4a017', fontStyle: 'italic', marginBottom: '8px', lineHeight: '1.4' },
  classStats: { fontSize: '10px', color: '#888' },
  teacherBtn: { width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', borderRadius: '4px', marginTop: '8px' },
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '12px' },
  stat: { background: '#0a0a0a', border: '1px solid #222', padding: '6px', borderRadius: '4px' },
  statLabel: { fontSize: '9px', color: '#888', letterSpacing: '1px' },
  statValue: { fontSize: '13px', fontWeight: 'bold', marginTop: '2px', display: 'block' },
  chartCard: { background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  chartLabel: { fontSize: '10px', color: '#888', marginBottom: '6px', letterSpacing: '1px' },
  upcomingCard: { background: 'linear-gradient(135deg, #1a1a08, #0a0a0a)', border: '1px solid #d4a017', padding: '8px 10px', borderRadius: '4px', marginBottom: '12px' },
  upcomingLabel: { fontSize: '10px', color: '#d4a017', letterSpacing: '1px', marginBottom: '4px' },
  upcomingItem: { fontSize: '11px', padding: '2px 0', color: '#e8d5a0' },
  upcomingTurn: { color: '#d4a017', marginRight: '6px', fontWeight: 'bold' },
  mentorBox: { background: 'linear-gradient(135deg, #1a1408, #0a0a0a)', border: '1px solid #8b6914', padding: '10px', borderRadius: '4px', marginBottom: '12px', display: 'flex', gap: '10px' },
  onboardBanner: { background: 'linear-gradient(135deg, #08182a, #0a0a0a)', border: '1px solid #39a0ff', padding: '10px', borderRadius: '4px', marginBottom: '10px' },
  seedBar: { fontSize: '10px', color: '#39a0ff', textAlign: 'center', padding: '4px 8px', background: '#0a0a14', border: '1px solid #1a2a3a', borderRadius: '4px', marginBottom: '10px', letterSpacing: '1px' },
  toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#0f1f0f', border: '1px solid #39ff14', color: '#39ff14', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', boxShadow: '0 0 20px rgba(57,255,20,0.3)', zIndex: 200, fontFamily: 'inherit' },
  onboardTitle: { fontSize: '10px', color: '#39a0ff', letterSpacing: '2px', marginBottom: '6px' },
  onboardBody: { fontSize: '11px', lineHeight: '1.5', color: '#d0e6ff' },
  mentorAvatar: { fontSize: '32px' },
  mentorText: { flex: 1 },
  mentorName: { fontSize: '10px', color: '#d4a017', letterSpacing: '1px', marginBottom: '4px' },
  mentorMessage: { fontSize: '12px', lineHeight: '1.4', color: '#e8d5a0', fontStyle: 'italic' },
  // Chad
  chadBox: { background: 'linear-gradient(135deg, #1a0a2a, #0a0a14)', border: '2px solid #aa55ff', padding: '10px', borderRadius: '4px', marginBottom: '12px', display: 'flex', gap: '10px' },
  leoBox: { background: 'linear-gradient(135deg, #0a1828, #0a0a14)', border: '2px solid #4abfa0', padding: '10px', borderRadius: '4px', marginBottom: '12px', display: 'flex', gap: '10px' },
  leoName: { fontSize: '12px', color: '#ffd966', fontWeight: 'bold', marginBottom: '2px' },
  leoFollowBtn: { flex: 1, padding: '6px', background: '#0a3a2a', border: '1px solid #4abfa0', color: '#4abfa0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  leoFiller: { fontSize: '11px', color: '#ffd966', fontStyle: 'italic', padding: '6px 10px', borderLeft: '2px solid #4abfa0', background: 'rgba(74,191,160,0.05)', marginBottom: '10px', borderRadius: '0 4px 4px 0' },
  vibeBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#0a0a0a', border: '1px solid #4abfa0', borderRadius: '4px', marginBottom: '10px', fontSize: '10px', color: '#888', letterSpacing: '1px' },
  vibeValue: { color: '#ffd966', fontWeight: 'bold', fontSize: '12px' },
  chadAvatar: { transition: 'transform 0.3s' },
  chadContent: { flex: 1 },
  chadName: { fontSize: '12px', color: '#aa55ff', fontWeight: 'bold', marginBottom: '2px' },
  chadHandle: { fontSize: '9px', color: '#666', fontWeight: 'normal' },
  chadText: { fontSize: '11px', color: '#e0d0ff', fontStyle: 'italic', marginBottom: '6px', lineHeight: '1.4' },
  chadStats: { fontSize: '9px', color: '#888', marginBottom: '6px' },
  chadButtons: { display: 'flex', gap: '6px' },
  chadFollowBtn: { flex: 1, padding: '6px', background: '#2a0a3a', border: '1px solid #aa55ff', color: '#aa55ff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  chadIgnoreBtn: { flex: 1, padding: '6px', background: '#1a1a1a', border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  insiderTip: { background: 'linear-gradient(135deg, #2a0810, #1a0408)', border: '2px dashed #ff3b3b', padding: '12px', borderRadius: '4px', marginBottom: '12px' },
  insiderHeader: { fontSize: '12px', color: '#ff3b3b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' },
  insiderText: { fontSize: '12px', marginBottom: '8px' },
  tipWarning: { fontSize: '10px', color: '#aaa', marginBottom: '8px', lineHeight: '1.4' },
  tipButtons: { display: 'flex', gap: '6px' },
  illegalBtn: { flex: 1, padding: '10px', background: '#3b0a10', border: '1px solid #ff3b3b', color: '#ff3b3b', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' },
  cleanBtn: { flex: 1, padding: '10px', background: '#0a3b0a', border: '1px solid #39ff14', color: '#39ff14', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' },
  warning: { background: '#2a0810', border: '1px solid #ff3b3b', color: '#ff3b3b', padding: '8px', borderRadius: '4px', marginBottom: '10px', fontSize: '11px', textAlign: 'center' },
  marketTitle: { fontSize: '11px', color: '#888', letterSpacing: '2px', marginBottom: '6px' },
  marketGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' },
  assetCard: { border: '1px solid #333', padding: '8px', borderRadius: '4px', cursor: 'pointer', position: 'relative' },
  assetTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' },
  assetEmoji: { fontSize: '14px' },
  assetName: { fontSize: '10px', fontWeight: 'bold', color: '#aaa', flex: 1 },
  infoBtn: { fontSize: '10px', color: '#666', cursor: 'pointer', padding: '2px 4px' },
  assetPrice: { fontSize: '13px', fontWeight: 'bold', marginTop: '2px' },
  assetChange: { fontSize: '10px', marginBottom: '4px' },
  assetOwned: { position: 'absolute', top: '4px', right: '4px', fontSize: '9px', color: '#39ff14', background: '#0a3b0a', padding: '1px 4px', borderRadius: '2px' },
  eventBadge: { position: 'absolute', bottom: '4px', right: '4px', fontSize: '10px' },
  infoBox: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #39ff14', padding: '6px', fontSize: '9px', zIndex: 10, borderRadius: '4px', marginTop: '2px', lineHeight: '1.4' },
  tradePanel: { background: '#0a0a0a', border: '1px solid #39ff14', padding: '10px', borderRadius: '4px', marginBottom: '10px' },
  tradeTitle: { fontSize: '12px', color: '#39ff14', marginBottom: '8px' },
  tradeRow: { display: 'flex', gap: '6px', marginBottom: '6px' },
  qtyBtn: { width: '32px', height: '32px', background: '#111', border: '1px solid #444', color: '#fff', cursor: 'pointer', fontSize: '16px', fontFamily: 'inherit' },
  qtyInput: { flex: 1, background: '#111', border: '1px solid #444', color: '#fff', padding: '0 8px', fontFamily: 'inherit', fontSize: '14px', textAlign: 'center' },
  buyBtn: { flex: 1, padding: '8px', background: '#0a3b0a', border: '1px solid #39ff14', color: '#39ff14', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 'bold' },
  sellBtn: { flex: 1, padding: '8px', background: '#3b0a10', border: '1px solid #ff3b3b', color: '#ff3b3b', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 'bold' },
  maxBtn: { flex: 1, padding: '6px', background: '#1a1a1a', border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  dorBtn: { width: '100%', padding: '10px', background: 'linear-gradient(135deg, #aa55ff, #5500aa)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', borderRadius: '4px', marginBottom: '10px' },
  debtPanel: { background: '#0a0a0a', border: '1px solid #3b0a0a', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '11px' },
  debtRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  debtBtns: { display: 'flex', gap: '6px' },
  payBtn: { flex: 1, padding: '6px', background: '#1a1a1a', border: '1px solid #ff8855', color: '#ff8855', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  borrowBtn: { flex: 1, padding: '6px', background: '#1a0a1a', border: '1px solid #aa55ff', color: '#aa55ff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px' },
  eventLog: { background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '4px', marginBottom: '10px', maxHeight: '140px', overflowY: 'auto' },
  logTitle: { fontSize: '11px', color: '#888', letterSpacing: '1px', marginBottom: '6px' },
  logEntry: { fontSize: '11px', padding: '3px 0', borderBottom: '1px solid #1a1a1a' },
  logDay: { color: '#39ff14', marginRight: '6px' },
  bigButton: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #39ff14, #1a8b08)', border: 'none', color: '#000', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit', marginBottom: '10px' },
  jail: { background: '#3b0a10', border: '1px solid #ff3b3b', color: '#ff3b3b', padding: '10px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', fontSize: '12px' },
  streak: { background: 'linear-gradient(135deg, #3b2a08, #1a1408)', border: '1px solid #ffaa00', color: '#ffaa00', padding: '8px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', fontSize: '11px', borderRadius: '4px' },
  // Milestone overlay
  milestoneOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.3s' },
  milestoneCard: { background: 'linear-gradient(135deg, #1a3a1a, #0a1a0a)', border: '3px solid #39ff14', borderRadius: '8px', padding: '40px', textAlign: 'center', maxWidth: '300px', boxShadow: '0 0 40px #39ff14' },
  milestoneEmoji: { fontSize: '80px', marginBottom: '12px' },
  milestoneTitle: { fontSize: '10px', color: '#39ff14', letterSpacing: '3px', marginBottom: '8px' },
  milestoneName: { fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '2px', marginBottom: '12px' },
  milestoneSub: { fontSize: '11px', color: '#aaa', fontStyle: 'italic' },
  dilemmaCard: { background: 'linear-gradient(135deg, #1a1408, #0a0a0a)', border: '3px solid #d4a017', borderRadius: '8px', padding: '24px', textAlign: 'center', maxWidth: '340px', boxShadow: '0 0 40px rgba(212,160,23,0.4)' },
  dilemmaTitle: { fontSize: '16px', fontWeight: 'bold', color: '#d4a017', marginBottom: '10px' },
  dilemmaBody: { fontSize: '12px', color: '#e8d5a0', lineHeight: '1.5', marginBottom: '16px' },
  dilemmaBtn: { display: 'block', width: '100%', padding: '12px', marginBottom: '8px', background: '#0f1f0f', border: '1px solid #555', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', textAlign: 'left' },
  gameOver: { textAlign: 'center', padding: '10px' },
  gameOverTitle: { fontSize: '18px', color: '#39ff14', letterSpacing: '3px', marginBottom: '10px' },
  classBadge: { fontSize: '14px', color: '#d4a017', marginBottom: '4px' },
  lifestyleBadge: { fontSize: '16px', color: '#fff', marginBottom: '12px' },
  finalScore: { fontSize: '40px', fontWeight: 'bold', color: '#39ff14', marginBottom: '8px', display: 'block' },
  indexCompare: { fontSize: '12px', color: '#aaa', marginBottom: '16px', lineHeight: '1.6' },
  recapCard: { background: '#0a0a0a', border: '1px solid #222', padding: '14px', borderRadius: '4px', marginBottom: '12px', textAlign: 'left' },
  recapTitle: { fontSize: '11px', color: '#888', letterSpacing: '2px', marginBottom: '10px' },
  recapItem: { fontSize: '11px', padding: '5px 0', lineHeight: '1.5', color: '#ddd' },
  cfRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #1a1a1a', gap: '8px' },
  codeBox: { background: '#1a1a1a', padding: '8px', fontSize: '10px', wordBreak: 'break-all', borderRadius: '2px', color: '#39ff14', marginBottom: '6px', fontFamily: 'monospace' },
  muted: { fontSize: '10px', color: '#666', fontStyle: 'italic' },
  tabRow: { display: 'flex', gap: '4px', marginBottom: '10px' },
  tabBtn: { flex: 1, padding: '8px', border: '1px solid', color: '#ddd', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', borderRadius: '4px' },
  dashCard: { background: '#0a0a0a', border: '1px solid #222', padding: '12px', borderRadius: '4px', marginBottom: '10px' },
  cardTitle: { fontSize: '11px', color: '#39ff14', letterSpacing: '2px', marginBottom: '10px' },
  statLine: { fontSize: '12px', padding: '4px 0' },
  input: { width: '100%', padding: '8px', background: '#111', border: '1px solid #444', color: '#fff', fontFamily: 'inherit', fontSize: '12px', marginBottom: '6px', borderRadius: '2px', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '8px', background: '#0a3b0a', border: '1px solid #39ff14', color: '#39ff14', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', borderRadius: '2px' },
  resultRow: { padding: '8px 0', borderBottom: '1px solid #222', fontSize: '11px' },
  prompt: { fontSize: '11px', padding: '8px 0', lineHeight: '1.5', color: '#ddd', borderBottom: '1px solid #1a1a1a' },
  dangerBtn: { width: '100%', padding: '10px', background: '#3b0a10', border: '1px solid #ff3b3b', color: '#ff3b3b', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', borderRadius: '4px', marginTop: '10px' },
  paramRow: { padding: '8px 0', borderBottom: '1px solid #222', fontSize: '11px' },
  paramDetail: { color: '#39ff14', fontSize: '10px', fontFamily: 'monospace', marginTop: '2px' },
  paramSource: { color: '#888', fontSize: '9px', marginTop: '2px', fontStyle: 'italic' },
  mcExplain: { fontSize: '10px', color: '#aaa', lineHeight: '1.5', marginBottom: '10px' },
  mcTableHeader: { display: 'flex', fontSize: '9px', color: '#888', padding: '4px 0', borderBottom: '1px solid #222', fontWeight: 'bold' },
  mcRow: { display: 'flex', padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontSize: '10px', alignItems: 'center' },
  mcStats: { marginTop: '14px' },
  mcInsight: { fontSize: '10px', padding: '4px 0', color: '#ddd', lineHeight: '1.5' },
};
