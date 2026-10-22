import QRCode from 'qrcode'

export const M = 10
export const QUIET = 4
const BADGE_R = 5.4
const HALO_R = BADGE_R + 0.7

export const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const createCode = (url) => {
  const code = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const n = code.modules.size
  return { n, version: code.version, isDark: (r, c) => code.modules.get(r, c) === 1 }
}

const inEye = (n, r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)

const nearBadge = (n, r, c) => Math.hypot(c + 0.5 - n / 2, r + 0.5 - n / 2) < HALO_R + 0.5

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

export const badge = (cx, cy, radius, letters, { fill, ring, text }) => {
  const scale = radius / 98
  return `<g transform="translate(${cx - 100 * scale} ${cy - 100 * scale}) scale(${scale})"><circle cx="100" cy="100" r="98" fill="${fill}"/><circle cx="100" cy="100" r="90" fill="none" stroke="${ring}" stroke-width="4"/><g fill="none" stroke="${ring}" stroke-width="6" stroke-linejoin="round" transform="translate(62 22) scale(0.62)"><path d="${HAT}"/><path d="M26 82h68"/></g><text x="100" y="152" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="${text}">${escape(letters)}</text></g>`
}

export const renderCode = (code, letters, { modules, eyes, dark, light, badgeColors, rx = 0 }) => {
  const { n, isDark } = code
  const size = (n + 2 * QUIET) * M
  const o = QUIET * M
  const parts = [`<rect width="${size}" height="${size}" rx="${rx}" fill="${light}"/>`]
  for (let r = 0; r < n; r += 1)
    for (let c = 0; c < n; c += 1) {
      if (!isDark(r, c) || inEye(n, r, c) || nearBadge(n, r, c)) continue
      parts.push(moduleShape(o + c * M, o + r * M, modules, dark))
    }
  parts.push(eye(o, o, eyes, dark))
  parts.push(eye(o + (n - 7) * M, o, eyes, dark))
  parts.push(eye(o, o + (n - 7) * M, eyes, dark))
  const centre = o + (n / 2) * M
  parts.push(`<circle cx="${centre}" cy="${centre}" r="${HALO_R * M}" fill="${light}"/>`)
  parts.push(badge(centre, centre, BADGE_R * M, letters, badgeColors))
  return { size, svg: parts.join('') }
}

export const place = (tile, cx, cy, width) =>
  `<g transform="translate(${cx - width / 2} ${cy - width / 2}) scale(${width / tile.size})">${tile.svg}</g>`

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Caveat+Brush&display=swap">'

export const overviewPage = (site, designs, { codeSize, roundSize }) => {
  const card = (design, index) => `<div class="card">
  <div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="scan">Scan for menu</div>
  <div class="code ${design.big ? 'round' : ''}">${design.svg}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="label"><b>${index + 1} · ${escape(design.name)}</b>${escape(design.note)}</div>
</div>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(site.name)} ${escape(site.suffix)} QR code designs</title>
${FONTS}
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
.code { margin-top: 1.5mm; width: ${codeSize}mm; height: ${codeSize}mm; }
.code.round { width: ${roundSize}mm; height: ${roundSize}mm; margin-top: 0; }
.code svg { width: 100%; height: 100%; }
.hint { font-size: 3.2mm; font-weight: 600; color: #f6f3ea; }
.label { font-size: 2.9mm; line-height: 1.4; color: #aaa598; max-width: 80mm; }
.label b { display: block; color: #ffd21f; font-size: 3.6mm; letter-spacing: 0.3mm; text-transform: uppercase; }
</style>
</head>
<body>
${designs.map(card).join('\n')}
</body>
</html>
`
}

export const tableSheet = (site, design, index, { codeSize, roundSize }) => {
  const card = `<div class="card">
  <div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="scan">Scan for menu</div>
  <div class="code ${design.big ? 'round' : ''}">${design.svg}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="meta">Open ${escape(site.hoursLabel)}<br>WhatsApp ${escape(site.whatsapp)} · ${escape(site.phone)}</div>
</div>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(site.name)} ${escape(site.suffix)} table cards, design ${index + 1} ${escape(design.name)}</title>
${FONTS}
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
.code { margin-top: 2mm; width: ${codeSize}mm; height: ${codeSize}mm; }
.code.round { width: ${roundSize}mm; height: ${roundSize}mm; margin-top: 0; }
.code svg { width: 100%; height: 100%; }
.hint { font-size: 3.6mm; font-weight: 600; color: #f6f3ea; }
.meta { font-size: 3.2mm; line-height: 1.5; color: #aaa598; }
</style>
</head>
<body>
${card}
${card}
${card}
${card}
</body>
</html>
`
}
