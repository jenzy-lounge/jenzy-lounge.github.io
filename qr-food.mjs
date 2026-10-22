import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createCode, overviewPage, place, renderCode, tableSheet } from './qr-lib.mjs'

const site = JSON.parse(readFileSync('site.json', 'utf8'))
const code = createCode(site.url)

const BLACK = '#0d0d0b'
const YELLOW = '#ffd21f'
const CREAM = '#f6f3ea'
const BADGE = { fill: BLACK, ring: YELLOW, text: YELLOW }

const tile = (light) =>
  renderCode(code, site.letters, {
    modules: 'rounded',
    eyes: 'rounded',
    dark: BLACK,
    light,
    badgeColors: BADGE,
    rx: 24
  })

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="600" height="600">${body}</svg>`

const polar = (cx, cy, radius, degrees) => {
  const a = (degrees * Math.PI) / 180
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
}

const burger = () => {
  const seeds = [
    [150, 140, -25],
    [215, 105, 15],
    [300, 90, -10],
    [385, 105, 25],
    [450, 140, -15],
    [250, 155, 20],
    [350, 155, -20]
  ]
    .map(
      ([x, y, rot]) =>
        `<ellipse cx="${x}" cy="${y}" rx="15" ry="8" transform="rotate(${rot} ${x} ${y})" fill="#fbe3b0"/>`
    )
    .join('')
  const scallops = []
  const step = (542 - 58) / 8
  for (let i = 0; i < 8; i += 1) {
    const x = 58 + i * step
    scallops.push(`Q${x + step / 2},252 ${x + step},232`)
  }
  return svg(
    '0 0 600 620',
    `<rect x="62" y="526" width="476" height="80" rx="34" fill="#d9944a"/>
<rect x="52" y="256" width="496" height="276" rx="40" fill="#6b3a1e"/>
<path d="M74,228 H526 V256 L502,270 L478,256 H122 L98,270 L74,256 Z" fill="${YELLOW}"/>
<path d="M58,200 H542 V232 ${scallops.join(' ')} Z" fill="#7bb661"/>
<path d="M62,208 C62,60 538,60 538,208 Z" fill="#e8a957"/>
${seeds}
${place(tile('#ffffff'), 300, 395, 250)}`
  )
}

const pizza = () => {
  const slices = []
  for (let i = 0; i < 8; i += 1) {
    const [x, y] = polar(300, 300, 246, i * 45)
    slices.push(`<line x1="300" y1="300" x2="${x}" y2="${y}" stroke="#e2ad2a" stroke-width="4"/>`)
  }
  const toppings = []
  for (let i = 0; i < 8; i += 1) {
    const [x, y] = polar(300, 300, 210, 22.5 + i * 45)
    toppings.push(
      `<circle cx="${x}" cy="${y}" r="24" fill="#b3312c"/><circle cx="${x - 7}" cy="${y - 6}" r="4" fill="#8e2420"/><circle cx="${x + 8}" cy="${y + 5}" r="4" fill="#8e2420"/><circle cx="${x - 2}" cy="${y + 11}" r="3" fill="#8e2420"/>`
    )
    const [bx, by] = polar(300, 300, 228, i * 45)
    toppings.push(
      `<ellipse cx="${bx}" cy="${by}" rx="17" ry="9" transform="rotate(${i * 45 + 90} ${bx} ${by})" fill="#4f8a3a"/>`
    )
  }
  return svg(
    '0 0 600 600',
    `<circle cx="300" cy="300" r="292" fill="#d99a4e"/>
<circle cx="300" cy="300" r="258" fill="#c94b2b"/>
<circle cx="300" cy="300" r="246" fill="#f5c243"/>
${slices.join('')}
${toppings.join('')}
${place(tile('#f5c243'), 300, 300, 250)}`
  )
}

const chai = () => {
  const steam = [250, 300, 350]
    .map(
      (x, i) =>
        `<path d="M${x},${118 - i * 6} c-22,-28 22,-48 0,-78" fill="none" stroke="#8f8a7a" stroke-width="9" stroke-linecap="round" opacity="${0.9 - i * 0.15}"/>`
    )
    .join('')
  const body = 'M108,160 L130,500 Q135,540 175,540 H425 Q465,540 470,500 L492,160 Z'
  return svg(
    '0 0 600 600',
    `${steam}
<ellipse cx="300" cy="552" rx="252" ry="34" fill="#d9d2bd"/>
<ellipse cx="300" cy="544" rx="252" ry="34" fill="${CREAM}"/>
<path d="M488,250 C612,235 612,430 486,440" fill="none" stroke="${CREAM}" stroke-width="30" stroke-linecap="round"/>
<defs><clipPath id="cup"><path d="${body}"/></clipPath></defs>
<path d="${body}" fill="${CREAM}"/>
<rect x="100" y="478" width="400" height="70" clip-path="url(#cup)" fill="${YELLOW}"/>
<ellipse cx="300" cy="160" rx="192" ry="30" fill="#ebe5d4"/>
<ellipse cx="300" cy="160" rx="176" ry="22" fill="#7a4a24"/>
${place(tile(CREAM), 300, 325, 250)}`
  )
}

const fries = () => {
  const sticks = [238, 272, 300, 288, 300, 268, 240]
    .map((h, i) => {
      const x = 125 + i * 50
      return `<rect x="${x}" y="${330 - h}" width="44" height="${h}" rx="12" transform="rotate(${(i - 3) * 6} ${x + 22} 330)" fill="${YELLOW}" stroke="#e6b800" stroke-width="2"/>`
    })
    .join('')
  return svg(
    '0 0 600 600',
    `${sticks}
<path d="M80,300 L130,585 Q132,600 148,600 H452 Q468,600 470,585 L520,300 Z" fill="#1c1a16"/>
<path d="M80,300 H520 L514,334 H86 Z" fill="${YELLOW}"/>
${place(tile('#ffffff'), 300, 465, 250)}`
  )
}

const plate = () => {
  const forkGaps = [50, 61, 72]
    .map((x) => `<rect x="${x}" y="126" width="6" height="88" fill="${BLACK}"/>`)
    .join('')
  return svg(
    '0 0 600 600',
    `<circle cx="300" cy="300" r="215" fill="${CREAM}"/>
<circle cx="300" cy="300" r="192" fill="none" stroke="#d9d2bd" stroke-width="14"/>
<rect x="38" y="120" width="52" height="180" rx="24" fill="${CREAM}"/>
${forkGaps}
<rect x="53" y="290" width="22" height="236" rx="11" fill="${CREAM}"/>
<path d="M516,112 Q586,126 562,300 H516 Z" fill="${CREAM}"/>
<rect x="528" y="290" width="22" height="236" rx="11" fill="${CREAM}"/>
${place(tile(CREAM), 300, 300, 250)}`
  )
}

const soda = () => {
  const body = 'M118,190 L150,560 Q154,590 184,590 H416 Q446,590 450,560 L482,190 Z'
  return svg(
    '0 0 600 600',
    `<rect x="330" y="30" width="26" height="240" rx="13" transform="rotate(18 343 150)" fill="${YELLOW}"/>
<defs><clipPath id="soda"><path d="${body}"/></clipPath></defs>
<path d="${body}" fill="${CREAM}"/>
<rect x="100" y="190" width="400" height="48" clip-path="url(#soda)" fill="${YELLOW}"/>
<path d="M105,172 Q105,120 150,120 H450 Q495,120 495,172 Z" fill="#1c1a16"/>
<rect x="95" y="166" width="410" height="28" rx="12" fill="#2a2722"/>
${place(tile(CREAM), 300, 405, 250)}`
  )
}

const designs = [
  { key: 'burger', name: 'Burger', note: 'The code is the patty', draw: burger },
  { key: 'pizza', name: 'Pizza', note: 'The code sits on the cheese', draw: pizza },
  { key: 'chai', name: 'Chai', note: 'On the cup, with steam', draw: chai },
  { key: 'fries', name: 'Fries', note: 'A label on the fries box', draw: fries },
  { key: 'plate', name: 'Plate', note: 'Served on a plate with cutlery', draw: plate },
  { key: 'soda', name: 'Cold drink', note: 'On a takeaway cup with a straw', draw: soda }
]

mkdirSync('qr-food', { recursive: true })
const built = designs.map((design) => {
  const svg = design.draw()
  writeFileSync(`qr-food/${design.key}.svg`, svg)
  return { ...design, svg, big: true }
})

writeFileSync('qr-food.html', overviewPage(site, built, { codeSize: 46, roundSize: 46 }))
built.forEach((design, index) => {
  writeFileSync(
    `qr-food/${index + 1}-${design.key}.html`,
    tableSheet(site, design, index, { codeSize: 72, roundSize: 78 })
  )
})
console.log(`Built ${built.length} food QR designs into qr-food/ and qr-food.html`)
