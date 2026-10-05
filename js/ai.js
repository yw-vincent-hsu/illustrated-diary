// 階段 1～2 的「模擬 AI」：依關鍵字產生無印風色塊 SVG。
// 介面與階段 4 的正式版一致：generateImage(entry, style) → { blob, mood, prompt }
const SCENES = [
  { re: /雨|潮濕/, mood: 'calm', scene: 'rain' },
  { re: /海|湖|河|水|游泳/, mood: 'peaceful', scene: 'water' },
  { re: /咖啡|茶|早餐|午餐|晚餐|吃|飯|甜點|蛋糕/, mood: 'cozy', scene: 'cup' },
  { re: /夜|晚上|星|月/, mood: 'quiet', scene: 'night' },
  { re: /花|草|樹|公園|散步|植物|山/, mood: 'fresh', scene: 'leaf' },
  { re: /書|讀|電影|學習/, mood: 'thoughtful', scene: 'book' },
  { re: /晴|太陽|陽光|曬/, mood: 'warm', scene: 'sun' },
];

const PALETTES = [
  ['#EFE9DD', '#D9D0BF', '#B7AA94'],
  ['#F1ECE2', '#DDD3C3', '#A89F90'],
  ['#EAE6DC', '#CFC8B8', '#9C9484'],
  ['#F3EEE4', '#E0D6C6', '#BFA98E'],
];

function hash(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
}

const shapes = {
  rain: (c) => Array.from({ length: 9 }, (_, i) =>
    `<line x1="${120 + i * 70}" y1="${120 + (i % 3) * 40}" x2="${100 + i * 70}" y2="${260 + (i % 3) * 40}" stroke="${c[2]}" stroke-width="3" stroke-linecap="round"/>`).join('')
    + `<ellipse cx="400" cy="420" rx="220" ry="14" fill="${c[1]}"/>`,
  water: (c) => [0, 1, 2].map((i) =>
    `<path d="M0 ${340 + i * 50} Q100 ${310 + i * 50} 200 ${340 + i * 50} T400 ${340 + i * 50} T600 ${340 + i * 50} T800 ${340 + i * 50} V600 H0Z" fill="${c[i === 0 ? 1 : 2]}" opacity="${0.5 + i * 0.2}"/>`).join(''),
  cup: (c) => `<rect x="300" y="280" width="170" height="130" rx="8" fill="${c[1]}"/><path d="M470 310 q50 0 50 35 q0 35 -50 35" fill="none" stroke="${c[1]}" stroke-width="14"/><ellipse cx="385" cy="420" rx="150" ry="12" fill="${c[2]}" opacity=".5"/>`,
  night: (c) => `<rect width="800" height="600" fill="${c[2]}" opacity=".35"/><circle cx="560" cy="200" r="70" fill="#F5F2EB"/><circle cx="530" cy="185" r="62" fill="${c[2]}" opacity=".35"/>`,
  leaf: (c) => `<path d="M400 440 C300 380 300 260 400 180 C500 260 500 380 400 440Z" fill="${c[1]}"/><line x1="400" y1="440" x2="400" y2="230" stroke="${c[2]}" stroke-width="4"/><ellipse cx="400" cy="460" rx="130" ry="10" fill="${c[2]}" opacity=".4"/>`,
  book: (c) => `<rect x="260" y="250" width="140" height="180" fill="${c[1]}"/><rect x="400" y="250" width="140" height="180" fill="${c[2]}" opacity=".7"/><line x1="400" y1="250" x2="400" y2="430" stroke="#F5F2EB" stroke-width="4"/>`,
  sun: (c) => `<circle cx="400" cy="270" r="95" fill="${c[1]}"/><circle cx="400" cy="270" r="140" fill="none" stroke="${c[1]}" stroke-width="3" opacity=".6"/><rect y="440" width="800" height="160" fill="${c[2]}" opacity=".35"/>`,
  plain: (c) => `<circle cx="300" cy="300" r="110" fill="${c[1]}"/><rect x="420" y="250" width="180" height="180" fill="${c[2]}" opacity=".6"/>`,
};

export async function generateImage(entry) {
  const text = `${entry.title ?? ''}${entry.content ?? ''}`;
  const hit = SCENES.find((s) => s.re.test(text));
  const scene = hit?.scene ?? 'plain';
  const palette = PALETTES[hash(text) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${palette[0]}"/>${shapes[scene](palette)}</svg>`;
  return {
    blob: new Blob([svg], { type: 'image/svg+xml' }),
    mood: hit?.mood ?? 'neutral',
    prompt: `[mock] ${scene}`,
  };
}
