import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const site = JSON.parse(readFileSync('site.json', 'utf8'))
const code = QRCode.create(site.url, { errorCorrectionLevel: 'H' })
const n = code.modules.size
const isDark = (r, c) => code.modules.get(r, c) === 1

const M = 10
const QUIET = 4
const BADGE_R = 5.4
const HALO_R = BADGE_R + 0.7

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)

const nearBadge = (r, c) => {
  const dx = c + 0.5 - n / 2
  const dy = r + 0.5 - n / 2
  return Math.hypot(dx, dy) < HALO_R + 0.5
}

const roundedPath = (x, y, w, h, [tl, tr, br, bl]) =>
  [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : '',
    'Z'
  ].join(' ')

const eyeRadii = {
  square: [0, 0, 0, 0],
  rounded: [2.2, 2.2, 2.2, 2.2],
  leaf: [0, 2.2, 0, 2.2]
}

const eye = (x, y, kind, color) => {
  if (kind === 'circle') {
    const cx = x + 3.5 * M
    const cy = y + 3.5 * M
    return `<path fill="${color}" fill-rule="evenodd" d="M${cx - 3.5 * M},${cy} a${3.5 * M},${3.5 * M} 0 1 0 ${7 * M},0 a${3.5 * M},${3.5 * M} 0 1 0 ${-7 * M},0 Z M${cx - 2.5 * M},${cy} a${2.5 * M},${2.5 * M} 0 1 0 ${5 * M},0 a${2.5 * M},${2.5 * M} 0 1 0 ${-5 * M},0 Z"/><circle cx="${cx}" cy="${cy}" r="${1.5 * M}" fill="${color}"/>`
  }
  const outer = eyeRadii[kind].map((v) => v * M)
  const inner = eyeRadii[kind].map((v) => v * 0.64 * M)
  const centre = eyeRadii[kind].map((v) => v * 0.4 * M)
  return `<path fill="${color}" fill-rule="evenodd" d="${roundedPath(x, y, 7 * M, 7 * M, outer)} ${roundedPath(x + M, y + M, 5 * M, 5 * M, inner)}"/><path fill="${color}" d="${roundedPath(x + 2 * M, y + 2 * M, 3 * M, 3 * M, centre)}"/>`
}

const moduleShape = (x, y, kind, color) => {
  if (kind === 'dot') return `<circle cx="${x + M / 2}" cy="${y + M / 2}" r="${0.45 * M}" fill="${color}"/>`
  if (kind === 'rounded')
    return `<rect x="${x + 0.04 * M}" y="${y + 0.04 * M}" width="${0.92 * M}" height="${0.92 * M}" rx="${0.32 * M}" fill="${color}"/>`
  return `<rect x="${x}" y="${y}" width="${M}" height="${M}" fill="${color}"/>`
}

const HAT =
  'M60 4c-9 0-16 5-19 12-3-1-6-2-9-2C21 14 12 22 12 33c0 9 6 16 14 18v20h68V51c8-2 14-9 14-18 0-11-9-19-20-19-3 0-6 1-9 2C76 9 69 4 60 4z'

const badge = (cx, cy, radius, { fill, ring, text }) => {
  const scale = radius / 98
  return `<g transform="translate(${cx - 100 * scale} ${cy - 100 * scale}) scale(${scale})"><circle cx="100" cy="100" r="98" fill="${fill}"/><circle cx="100" cy="100" r="90" fill="none" stroke="${ring}" stroke-width="4"/><g fill="none" stroke="${ring}" stroke-width="6" stroke-linejoin="round" transform="translate(62 22) scale(0.62)"><path d="${HAT}"/><path d="M26 82h68"/></g><text x="100" y="152" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="${text}">${escape(site.letters)}</text></g>`
}

const render = ({ modules, eyes, dark, light, badgeColors, frame }) => {
  const size = (n + 2 * QUIET) * M
  const o = QUIET * M
  const parts = []
  for (let r = 0; r < n; r += 1)
    for (let c = 0; c < n; c += 1) {
      if (!isDark(r, c) || inEye(r, c) || nearBadge(r, c)) continue
      parts.push(moduleShape(o + c * M, o + r * M, modules, dark))
    }
  parts.push(eye(o, o, eyes, dark))
  parts.push(eye(o + (n - 7) * M, o, eyes, dark))
  parts.push(eye(o, o + (n - 7) * M, eyes, dark))
  const centre = o + (n / 2) * M
  parts.push(`<circle cx="${centre}" cy="${centre}" r="${HALO_R * M}" fill="${light}"/>`)
  parts.push(badge(centre, centre, BADGE_R * M, badgeColors))
  const body = parts.join('')
  if (frame === 'circle') {
    const ringR = (size / 2) * 1.2
    const outerR = ringR + 5.2 * M
    const canvas = outerR * 2
    const shift = outerR - size / 2
    const topR = ringR + 1.7 * M
    const bottomR = ringR + 3.9 * M
    const cx = outerR
    const arc = (radius, sweep) => `M${cx - radius},${cx} A${radius},${radius} 0 0 ${sweep} ${cx + radius},${cx}`
    const ringText = (id, radius, sweep, label) =>
      `<defs><path id="${id}" d="${arc(radius, sweep)}"/></defs><text font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="${2.9 * M}" letter-spacing="${0.5 * M}" fill="#ffd21f" text-anchor="middle"><textPath href="#${id}" startOffset="50%">${label}</textPath></text>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}"><circle cx="${cx}" cy="${cx}" r="${outerR}" fill="#0d0d0b"/><circle cx="${cx}" cy="${cx}" r="${ringR}" fill="${light}"/>${ringText('ring-top', topR, 1, 'SCAN FOR THE MENU')}${ringText('ring-bottom', bottomR, 0, `${escape(site.name)} ${escape(site.suffix).toUpperCase()}`)}<g transform="translate(${shift} ${shift})">${body}</g></svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${frame === 'tile' ? 3 * M : 0}" fill="${light}"/>${body}</svg>`
}

const BLACK = '#0d0d0b'
const YELLOW = '#ffd21f'
const WHITE = '#ffffff'

const designs = [
  {
    key: 'classic',
    name: 'Classic',
    note: 'Square modules, soft corner eyes',
    modules: 'square',
    eyes: 'rounded',
    dark: BLACK,
    light: WHITE,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'tile'
  },
  {
    key: 'dots',
    name: 'Dots',
    note: 'Round dots, round eyes',
    modules: 'dot',
    eyes: 'circle',
    dark: BLACK,
    light: WHITE,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'tile'
  },
  {
    key: 'soft',
    name: 'Soft',
    note: 'Rounded modules, leaf eyes',
    modules: 'rounded',
    eyes: 'leaf',
    dark: BLACK,
    light: WHITE,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'tile'
  },
  {
    key: 'yellow',
    name: 'Yellow',
    note: 'Black dots on the brand yellow',
    modules: 'dot',
    eyes: 'rounded',
    dark: BLACK,
    light: YELLOW,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'tile'
  },
  {
    key: 'night',
    name: 'Night',
    note: 'Yellow on black. Scans on modern phones; use a light one for tables',
    modules: 'rounded',
    eyes: 'rounded',
    dark: YELLOW,
    light: BLACK,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'none'
  },
  {
    key: 'circle',
    name: 'Circle',
    note: 'Dots inside a round badge with a text ring',
    modules: 'dot',
    eyes: 'circle',
    dark: BLACK,
    light: WHITE,
    badgeColors: { fill: BLACK, ring: YELLOW, text: YELLOW },
    frame: 'circle'
  }
]

mkdirSync('qr-designs', { recursive: true })
const svgs = designs.map((design) => {
  const svg = render(design)
  writeFileSync(`qr-designs/${design.key}.svg`, svg)
  return { ...design, svg }
})

const card = (design, index) => `<div class="card">
  <div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="scan">Scan for menu</div>
  <div class="code ${design.frame === 'circle' ? 'round' : ''}">${design.svg}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="label"><b>${index + 1} · ${escape(design.name)}</b>${escape(design.note)}</div>
</div>`

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(site.name)} ${escape(site.suffix)} QR code designs</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Caveat+Brush&display=swap">
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 99mm 99mm 99mm; font-family: 'Barlow', Arial, sans-serif; }
.card { background: #0d0d0b; color: #f6f3ea; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6mm; text-align: center; outline: 0.2mm dashed #8a8676; outline-offset: -0.1mm; padding: 4mm 6mm; }
.card svg { display: block; }
.brand { font-family: 'Caveat Brush', cursive; font-size: 8.5mm; line-height: 0.95; color: #ffd21f; }
.brand span { display: block; font-size: 5mm; letter-spacing: 0.7mm; color: #f6f3ea; text-transform: uppercase; }
.scan { margin-top: 0.5mm; font-family: 'Caveat Brush', cursive; font-size: 7.5mm; line-height: 1; color: #14130f; background: #ffd21f; padding: 1mm 4mm 1.3mm; border-radius: 1.5mm 3.5mm 2mm 3mm; transform: rotate(-1.5deg); }
.code { margin-top: 1.5mm; width: 48mm; height: 48mm; }
.code.round { width: 56mm; height: 56mm; margin-top: 0; }
.code svg { width: 100%; height: 100%; }
.hint { font-size: 3.2mm; font-weight: 600; color: #f6f3ea; }
.label { font-size: 2.9mm; line-height: 1.4; color: #aaa598; max-width: 80mm; }
.label b { display: block; color: #ffd21f; font-size: 3.6mm; letter-spacing: 0.3mm; text-transform: uppercase; }
</style>
</head>
<body>
${svgs.map(card).join('\n')}
</body>
</html>
`
writeFileSync('qr-designs.html', page)

const tableCard = (design) => `<div class="card">
  <div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="scan">Scan for menu</div>
  <div class="code ${design.frame === 'circle' ? 'round' : ''}">${design.svg}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="meta">Open ${escape(site.hoursLabel)}<br>WhatsApp ${escape(site.whatsapp)} · ${escape(site.phone)}</div>
</div>`

const tableSheet = (design, index) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(site.name)} ${escape(site.suffix)} table cards, design ${index + 1} ${escape(design.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Caveat+Brush&display=swap">
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; font-family: 'Barlow', Arial, sans-serif; }
.card { background: #0d0d0b; color: #f6f3ea; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2mm; text-align: center; outline: 0.2mm dashed #8a8676; outline-offset: -0.1mm; padding: 6mm; }
.card svg { display: block; }
.brand { font-family: 'Caveat Brush', cursive; font-size: 11mm; line-height: 0.95; color: #ffd21f; }
.brand span { display: block; font-size: 6.4mm; letter-spacing: 0.8mm; color: #f6f3ea; text-transform: uppercase; }
.scan { margin-top: 1.5mm; font-family: 'Caveat Brush', cursive; font-size: 9.5mm; line-height: 1; color: #14130f; background: #ffd21f; padding: 1.2mm 5mm 1.6mm; border-radius: 1.5mm 3.5mm 2mm 3mm; transform: rotate(-1.5deg); }
.code { margin-top: 2mm; width: 60mm; height: 60mm; }
.code.round { width: 72mm; height: 72mm; margin-top: 0; }
.code svg { width: 100%; height: 100%; }
.hint { font-size: 3.6mm; font-weight: 600; color: #f6f3ea; }
.meta { font-size: 3.2mm; line-height: 1.5; color: #aaa598; }
</style>
</head>
<body>
${tableCard(design)}
${tableCard(design)}
${tableCard(design)}
${tableCard(design)}
</body>
</html>
`

svgs.forEach((design, index) => {
  writeFileSync(`qr-designs/${index + 1}-${design.key}.html`, tableSheet(design, index))
})
console.log(`Built ${svgs.length} QR designs (version ${code.version}, ${n}x${n}, level H) into qr-designs/ and qr-designs.html`)
