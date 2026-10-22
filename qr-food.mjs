import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createCode, escape, place, renderCode } from './qr-lib.mjs'

const site = JSON.parse(readFileSync('site.json', 'utf8'))
const code = createCode(site.url)

const BLACK = '#0d0d0b'
const YELLOW = '#ffd21f'
const CREAM = '#f6f3ea'
const INK = '#2a1708'
const BADGE = { fill: BLACK, ring: YELLOW, text: YELLOW }

const tile = (light) =>
  renderCode(code, site.letters, {
    modules: 'rounded',
    eyes: 'rounded',
    dark: INK,
    light,
    badgeColors: BADGE,
    rx: 26
  })

const STICKER =
  '<filter id="sticker" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/><feFlood flood-color="#f6f3ea" result="c"/><feComposite in="c" in2="d" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'

const svg = (viewBox, defs, scene, overlay) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="600" height="600"><defs>${STICKER}${defs}</defs><g filter="url(#sticker)"><g stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">${scene}</g></g>${overlay}</svg>`

const linear = (id, from, to, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`

const polar = (cx, cy, radius, degrees) => {
  const a = (degrees * Math.PI) / 180
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
}

const burger = () => {
  const seeds = [
    [150, 142, -25],
    [212, 106, 15],
    [300, 90, -10],
    [388, 106, 25],
    [450, 142, -15],
    [250, 160, 20],
    [350, 160, -20]
  ]
    .map(
      ([x, y, rot]) =>
        `<ellipse cx="${x}" cy="${y}" rx="15" ry="8" transform="rotate(${rot} ${x} ${y})" fill="#fbe9c6" stroke="#c9823c" stroke-width="2"/>`
    )
    .join('')
  const step = (542 - 58) / 8
  const scallops = []
  for (let i = 0; i < 8; i += 1) {
    const x = 58 + i * step
    scallops.push(`Q${x + step / 2},266 ${x + step},240`)
  }
  const grill = [
    [86, 320, 150, 300],
    [78, 372, 150, 352],
    [80, 426, 150, 406],
    [450, 300, 514, 320],
    [450, 352, 522, 372],
    [450, 406, 520, 426]
  ]
    .map(
      ([x1, y1, x2, y2]) =>
        `<path d="M${x1},${y1} L${x2},${y2}" stroke="#8a5030" stroke-width="8" paint-order="normal"/>`
    )
    .join('')
  return svg(
    '0 0 600 640',
    `${linear('bun', '#f6c97f', '#c9823c')}${linear('bunb', '#e3a85e', '#b06d2a')}${linear('patty', '#7a4220', '#4a2410')}${linear('cheese', '#ffd23f', '#f5a400')}`,
    `<rect x="70" y="532" width="460" height="92" rx="42" fill="url(#bunb)"/>
<rect x="80" y="498" width="440" height="52" rx="26" fill="#e63946"/>
<rect x="96" y="506" width="408" height="36" rx="18" fill="#ff6b6b" stroke="none"/>
<rect x="56" y="256" width="488" height="260" rx="46" fill="url(#patty)"/>
${grill}
<path d="M70,226 H530 V258 L512,292 C504,306 490,306 484,292 L478,258 H152 L146,292 C140,306 126,306 118,292 L112,258 H70 Z" fill="url(#cheese)"/>
<path d="M58,200 H542 V240 ${scallops.join(' ')} Z" fill="#8cc766"/>
<path d="M66,214 C66,56 534,56 534,214 Z" fill="url(#bun)"/>
<path d="M118,152 C156,98 232,78 300,78" fill="none" stroke="#fbe3b0" stroke-width="12" paint-order="normal"/>
${seeds}`,
    place(tile('#fff6e3'), 300, 386, 250)
  )
}

const pizza = () => {
  const bubbles = []
  for (let i = 0; i < 10; i += 1) {
    const [x, y] = polar(300, 300, 268, i * 36 + 10)
    bubbles.push(`<circle cx="${x}" cy="${y}" r="${7 + (i % 3) * 2}" fill="#b7702e" stroke="none"/>`)
  }
  const toppings = []
  for (let i = 0; i < 8; i += 1) {
    const [x, y] = polar(300, 300, 208, 22.5 + i * 45)
    toppings.push(
      `<circle cx="${x}" cy="${y}" r="25" fill="url(#pep)"/><circle cx="${x - 8}" cy="${y - 6}" r="4" fill="#8e2420" stroke="none"/><circle cx="${x + 8}" cy="${y + 4}" r="4" fill="#8e2420" stroke="none"/><circle cx="${x - 1}" cy="${y + 12}" r="3" fill="#8e2420" stroke="none"/>`
    )
    const [bx, by] = polar(300, 300, 228, i * 45)
    toppings.push(
      `<g transform="rotate(${i * 45 + 90} ${bx} ${by})"><ellipse cx="${bx}" cy="${by}" rx="19" ry="10" fill="#5fa043"/><path d="M${bx - 14},${by} H${bx + 14}" stroke="#3f7a2a" stroke-width="2" paint-order="normal"/></g>`
    )
    if (i % 2 === 0) {
      const [ox, oy] = polar(300, 300, 196, 45 + i * 45 + 22)
      toppings.push(`<circle cx="${ox}" cy="${oy}" r="9" fill="none" stroke="#1c1a16" stroke-width="7"/>`)
    }
  }
  const slices = []
  for (let i = 0; i < 8; i += 1) {
    const [x, y] = polar(300, 300, 236, i * 45)
    slices.push(`<line x1="300" y1="300" x2="${x}" y2="${y}" stroke="#e4ab2a" stroke-width="4" paint-order="normal"/>`)
  }
  return svg(
    '0 0 600 600',
    `<radialGradient id="crust"><stop offset="0.82" stop-color="#f0b86a"/><stop offset="1" stop-color="#c98343"/></radialGradient><radialGradient id="cheesy"><stop offset="0.72" stop-color="#f7c948"/><stop offset="1" stop-color="#e9a92e"/></radialGradient><radialGradient id="pep" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="#e05a48"/><stop offset="1" stop-color="#a52a22"/></radialGradient>`,
    `<circle cx="300" cy="300" r="288" fill="url(#crust)"/>
${bubbles.join('')}
<circle cx="300" cy="300" r="248" fill="#c43d2c"/>
<circle cx="300" cy="300" r="236" fill="url(#cheesy)"/>
${slices.join('')}
${toppings.join('')}`,
    place(tile('#f7c948'), 300, 300, 250)
  )
}

const chai = () => {
  const steam = [252, 300, 348]
    .map(
      (x, i) =>
        `<path d="M${x},${112 - i * 8} c-24,-30 24,-50 0,-82" fill="none" stroke="${YELLOW}" stroke-width="9" stroke-linecap="round" opacity="${0.85 - i * 0.2}"/>`
    )
    .join('')
  const body = 'M108,160 L132,500 Q137,540 177,540 H423 Q463,540 468,500 L492,160 Z'
  return svg(
    '0 0 600 600',
    `${linear('saucer', '#fbf8f0', '#d9d2bd')}<clipPath id="cup"><path d="${body}"/></clipPath>`,
    `<ellipse cx="300" cy="552" rx="262" ry="36" fill="url(#saucer)"/>
<ellipse cx="300" cy="544" rx="200" ry="20" fill="#e8e0cc" stroke="none"/>
<path d="M486,246 C650,226 650,452 484,448 L486,408 C596,412 596,268 488,288 Z" fill="${CREAM}"/>
<path d="${body}" fill="#fffaf0"/>
<path d="M440,170 L492,160 L468,500 Q463,540 423,540 L430,520 Q450,500 452,470 Z" fill="#e8e0cc" stroke="none" clip-path="url(#cup)"/>
<rect x="100" y="480" width="400" height="70" fill="${YELLOW}" stroke="none" clip-path="url(#cup)"/>
<ellipse cx="300" cy="160" rx="192" ry="30" fill="#ebe5d4"/>
<ellipse cx="300" cy="160" rx="176" ry="22" fill="#7a4a24"/>
<ellipse cx="282" cy="156" rx="90" ry="9" fill="#9a6238" stroke="none"/>`,
    `${steam}${place(tile('#fffaf0'), 300, 325, 250)}`
  )
}

const fries = () => {
  const sticks = [238, 274, 300, 290, 300, 270, 240]
    .map((h, i) => {
      const x = 125 + i * 50
      return `<g transform="rotate(${(i - 3) * 6} ${x + 22} 330)"><rect x="${x}" y="${330 - h}" width="44" height="${h}" rx="12" fill="url(#fry)"/><rect x="${x + 8}" y="${338 - h}" width="10" height="${h - 60}" rx="5" fill="#fff0a8" stroke="none"/></g>`
    })
    .join('')
  return svg(
    '0 0 600 600',
    `${linear('fry', '#ffe066', '#f2b705')}${linear('box', '#2a2722', '#141210')}`,
    `${sticks}
<path d="M78,300 L130,586 Q132,600 148,600 H452 Q468,600 470,586 L522,300 Z" fill="url(#box)"/>
<path d="M96,336 L134,586 H150 L112,336 Z" fill="${YELLOW}" stroke="none"/>
<path d="M504,336 L466,586 H450 L488,336 Z" fill="${YELLOW}" stroke="none"/>
<path d="M78,300 H522 L516,336 H84 Z" fill="${YELLOW}"/>`,
    place(tile('#ffffff'), 300, 464, 250)
  )
}

const rice = () => {
  const grains = []
  for (let i = 0; i < 26; i += 1) {
    const a = (i * 137.5) % 360
    const r = 40 + ((i * 53) % 110)
    const [x, y] = polar(300, 262, r, a)
    if (y > 282) continue
    grains.push(
      `<path d="M${x - 7},${y} L${x + 7},${y}" stroke="#d9d2bd" stroke-width="5" transform="rotate(${(i * 47) % 180} ${x} ${y})" paint-order="normal"/>`
    )
  }
  const steam = [250, 300, 350]
    .map(
      (x, i) =>
        `<path d="M${x},${118 - i * 6} c-22,-26 22,-44 0,-72" fill="none" stroke="${YELLOW}" stroke-width="8" stroke-linecap="round" opacity="${0.8 - i * 0.2}"/>`
    )
    .join('')
  return svg(
    '0 0 600 600',
    `${linear('ricey', '#fffaf0', '#ebe3cc')}${linear('bowl', '#2a2722', '#141210')}`,
    `<path d="M96,300 C96,176 504,176 504,300 Z" fill="url(#ricey)"/>
${grains.join('')}
<path d="M236,214 C226,178 262,166 276,190 C288,166 322,174 318,206 Z" fill="#5fa043"/>
<path d="M312,236 C352,206 392,208 416,232" fill="none" stroke="#d7263d" stroke-width="12"/>
<path d="M178,262 L210,206 L232,256 Z" fill="${YELLOW}"/>
<path d="M80,300 L120,520 Q128,560 170,560 H430 Q472,560 480,520 L520,300 Z" fill="url(#bowl)"/>
<path d="M80,300 H520 L514,334 H86 Z" fill="${YELLOW}"/>`,
    `${steam}${place(tile('#fffaf0'), 300, 447, 220)}`
  )
}

const soda = () => {
  const drops = [
    [150, 300],
    [138, 380],
    [160, 455],
    [446, 320],
    [458, 400],
    [438, 470]
  ]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="11" fill="#cfe8ff" stroke="none"/>`)
    .join('')
  const body = 'M118,190 L150,560 Q154,590 184,590 H416 Q446,590 450,560 L482,190 Z'
  return svg(
    '0 0 600 600',
    `${linear('lid', '#2a2722', '#141210')}<clipPath id="soda"><path d="${body}"/></clipPath>`,
    `<g transform="rotate(18 343 150)"><rect x="330" y="26" width="26" height="244" rx="13" fill="${YELLOW}"/><rect x="330" y="60" width="26" height="14" fill="#d7263d" stroke="none"/><rect x="330" y="96" width="26" height="14" fill="#d7263d" stroke="none"/></g>
<path d="${body}" fill="#fffaf0"/>
<path d="M432,190 L482,190 L450,560 Q446,590 416,590 L420,560 Q436,540 438,500 Z" fill="#e8e0cc" stroke="none" clip-path="url(#soda)"/>
<rect x="100" y="190" width="400" height="48" fill="${YELLOW}" stroke="none" clip-path="url(#soda)"/>
${drops}
<path d="M105,172 Q105,120 150,120 H450 Q495,120 495,172 Z" fill="url(#lid)"/>
<rect x="95" y="166" width="410" height="28" rx="12" fill="#2a2722"/>
<g transform="translate(468 138)"><circle r="40" fill="${YELLOW}"/><circle r="30" fill="#fff6c2" stroke="none"/><path d="M0,-30 V30 M-30,0 H30 M-21,-21 L21,21 M21,-21 L-21,21" stroke="${YELLOW}" stroke-width="4" paint-order="normal"/></g>`,
    place(tile('#fffaf0'), 300, 405, 250)
  )
}

const designs = [
  { key: 'burger', name: 'Burger', note: 'The code is the patty', draw: burger },
  { key: 'pizza', name: 'Pizza', note: 'The code sits on the cheese', draw: pizza },
  { key: 'chai', name: 'Chai', note: 'On the cup, with steam', draw: chai },
  { key: 'fries', name: 'Fries', note: 'A label on the fries box', draw: fries },
  { key: 'rice', name: 'Rice bowl', note: 'Biryani bowl with chilli and lemon', draw: rice },
  { key: 'soda', name: 'Cold drink', note: 'Takeaway cup with a straw and lemon', draw: soda }
]

const SPARKS = `<svg class="spark" viewBox="0 0 100 100" aria-hidden="true"><path d="M12 18l2.4 5.6L20 26l-5.6 2.4L12 34l-2.4-5.6L4 26l5.6-2.4z" fill="${YELLOW}"/><path d="M88 30l1.8 4.2 4.2 1.8-4.2 1.8L88 42l-1.8-4.2L82 36l4.2-1.8z" fill="${CREAM}"/><path d="M14 80l1.8 4.2 4.2 1.8-4.2 1.8L14 92l-1.8-4.2L8 86l4.2-1.8z" fill="${CREAM}"/><path d="M86 76l2.4 5.6 5.6 2.4-5.6 2.4L86 92l-2.4-5.6L78 84l5.6-2.4z" fill="${YELLOW}"/><circle cx="26" cy="54" r="2.2" fill="${YELLOW}"/><circle cx="76" cy="14" r="2" fill="${YELLOW}"/><circle cx="72" cy="60" r="1.8" fill="${CREAM}"/><circle cx="30" cy="12" r="1.6" fill="${CREAM}"/></svg>`

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Caveat+Brush&display=swap">'

const css = ({ cols, rows, brand, scan, art, hint, bar, tagline }) => `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { width: 210mm; height: 297mm; display: grid; grid-template-columns: ${cols}; grid-template-rows: ${rows}; font-family: 'Barlow', Arial, sans-serif; }
.card { position: relative; overflow: hidden; background: #0d0d0b; color: #f6f3ea; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2mm; text-align: center; outline: 0.2mm dashed #8a8676; outline-offset: -0.1mm; padding: 5mm 6mm ${bar + 4}mm; }
.card::before { content: ''; position: absolute; inset: -40% -40% auto; height: 120%; background: radial-gradient(circle at 50% 60%, rgba(255,210,31,0.16), rgba(255,210,31,0) 48%); }
.card > * { position: relative; }
.brand { font-family: 'Caveat Brush', cursive; font-size: ${brand}mm; line-height: 0.9; color: #ffd21f; }
.brand span { display: block; font-family: 'Barlow', Arial, sans-serif; font-weight: 700; font-size: ${brand * 0.46}mm; letter-spacing: ${brand * 0.07}mm; color: #f6f3ea; text-transform: uppercase; margin-top: 0.6mm; }
.tag { font-size: ${tagline}mm; font-weight: 700; letter-spacing: 0.45mm; text-transform: uppercase; color: #c9a227; }
.scan { margin-top: 1mm; font-family: 'Caveat Brush', cursive; font-size: ${scan}mm; line-height: 1; color: #14130f; background: #ffd21f; padding: ${scan * 0.13}mm ${scan * 0.55}mm ${scan * 0.17}mm; border-radius: 1.5mm 3.5mm 2mm 3mm; transform: rotate(-1.5deg); box-shadow: 0 1mm 0 #b8920a; }
.art { position: relative; width: ${art}mm; height: ${art}mm; margin-top: 1.5mm; background: radial-gradient(circle at 50% 55%, rgba(255,210,31,0.3), rgba(255,210,31,0) 62%); }
.art > svg { display: block; width: 100%; height: 100%; }
.art .spark { position: absolute; inset: 0; }
.hint { font-size: ${hint}mm; font-weight: 600; color: #f6f3ea; margin-top: 1mm; }
.meta { font-size: ${hint * 0.88}mm; color: #aaa598; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: ${bar}mm; display: flex; align-items: center; justify-content: center; background: #ffd21f; color: #14130f; font-weight: 700; font-size: ${hint * 0.95}mm; letter-spacing: 0.1mm; }
.label { font-size: 2.9mm; line-height: 1.4; color: #aaa598; max-width: 80mm; }
.label b { display: block; color: #ffd21f; font-size: 3.6mm; letter-spacing: 0.3mm; text-transform: uppercase; }
`

const page = (title, style, cards) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
${FONTS}
<style>${style}</style>
</head>
<body>
${cards}
</body>
</html>
`

const head = () => `<div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="tag">${escape(site.tagline)}</div>
  <div class="scan">Scan for menu</div>`

const overviewCard = (design, index) => `<div class="card">
  ${head()}
  <div class="art">${design.svg}${SPARKS}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="label"><b>${index + 1} · ${escape(design.name)}</b></div>
  <div class="bar">WhatsApp ${escape(site.whatsapp)} · ${escape(site.phone)}</div>
</div>`

const tableCard = (design) => `<div class="card">
  ${head()}
  <div class="art">${design.svg}${SPARKS}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="meta">Open ${escape(site.hoursLabel)}</div>
  <div class="bar">WhatsApp ${escape(site.whatsapp)} · ${escape(site.phone)}</div>
</div>`

mkdirSync('qr-food', { recursive: true })
const built = designs.map((design) => {
  const svg = design.draw()
  writeFileSync(`qr-food/${design.key}.svg`, svg)
  return { ...design, svg }
})

writeFileSync(
  'qr-food.html',
  page(
    `${site.name} ${site.suffix} food QR designs`,
    css({ cols: '105mm 105mm', rows: '99mm 99mm 99mm', brand: 8.5, scan: 7, art: 42, hint: 3, bar: 6, tagline: 2.2 }),
    built.map(overviewCard).join('\n')
  )
)
built.forEach((design, index) => {
  const card = tableCard(design)
  writeFileSync(
    `qr-food/${index + 1}-${design.key}.html`,
    page(
      `${site.name} ${site.suffix} table cards, design ${index + 1} ${design.name}`,
      css({ cols: '105mm 105mm', rows: '148.5mm 148.5mm', brand: 12.5, scan: 9.5, art: 76, hint: 3.6, bar: 9, tagline: 2.7 }),
      [card, card, card, card].join('\n')
    )
  )
})
console.log(`Built ${built.length} food QR designs into qr-food/ and qr-food.html`)
