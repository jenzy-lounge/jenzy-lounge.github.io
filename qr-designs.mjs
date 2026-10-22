import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { M, createCode, escape, overviewPage, renderCode, tableSheet } from './qr-lib.mjs'

const site = JSON.parse(readFileSync('site.json', 'utf8'))
const code = createCode(site.url)

const BLACK = '#0d0d0b'
const YELLOW = '#ffd21f'
const WHITE = '#ffffff'
const BADGE = { fill: BLACK, ring: YELLOW, text: YELLOW }

const wrap = (tile) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile.size} ${tile.size}" width="${tile.size}" height="${tile.size}">${tile.svg}</svg>`

const circleFrame = (tile) => {
  const ringR = (tile.size / 2) * 1.2
  const outerR = ringR + 5.2 * M
  const canvas = outerR * 2
  const shift = outerR - tile.size / 2
  const cx = outerR
  const arc = (radius, sweep) =>
    `M${cx - radius},${cx} A${radius},${radius} 0 0 ${sweep} ${cx + radius},${cx}`
  const ringText = (id, radius, sweep, label) =>
    `<defs><path id="${id}" d="${arc(radius, sweep)}"/></defs><text font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="${2.9 * M}" letter-spacing="${0.5 * M}" fill="${YELLOW}" text-anchor="middle"><textPath href="#${id}" startOffset="50%">${label}</textPath></text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}"><circle cx="${cx}" cy="${cx}" r="${outerR}" fill="${BLACK}"/><circle cx="${cx}" cy="${cx}" r="${ringR}" fill="${WHITE}"/>${ringText('ring-top', ringR + 1.7 * M, 1, 'SCAN FOR THE MENU')}${ringText('ring-bottom', ringR + 3.9 * M, 0, `${escape(site.name)} ${escape(site.suffix).toUpperCase()}`)}<g transform="translate(${shift} ${shift})">${tile.svg}</g></svg>`
}

const designs = [
  {
    key: 'classic',
    name: 'Classic',
    note: 'Square modules, soft corner eyes',
    style: { modules: 'square', eyes: 'rounded', dark: BLACK, light: WHITE, rx: 3 * M }
  },
  {
    key: 'dots',
    name: 'Dots',
    note: 'Round dots, round eyes',
    style: { modules: 'dot', eyes: 'circle', dark: BLACK, light: WHITE, rx: 3 * M }
  },
  {
    key: 'soft',
    name: 'Soft',
    note: 'Rounded modules, leaf eyes',
    style: { modules: 'rounded', eyes: 'leaf', dark: BLACK, light: WHITE, rx: 3 * M }
  },
  {
    key: 'yellow',
    name: 'Yellow',
    note: 'Black dots on the brand yellow',
    style: { modules: 'dot', eyes: 'rounded', dark: BLACK, light: YELLOW, rx: 3 * M }
  },
  {
    key: 'night',
    name: 'Night',
    note: 'Yellow on black. Scans on modern phones; use a light one for tables',
    style: { modules: 'rounded', eyes: 'rounded', dark: YELLOW, light: BLACK }
  },
  {
    key: 'circle',
    name: 'Circle',
    note: 'Dots inside a round badge with a text ring',
    style: { modules: 'dot', eyes: 'circle', dark: BLACK, light: WHITE },
    frame: circleFrame,
    big: true
  }
]

mkdirSync('qr-designs', { recursive: true })
const built = designs.map((design) => {
  const tile = renderCode(code, site.letters, { ...design.style, badgeColors: BADGE })
  const svg = (design.frame ?? wrap)(tile)
  writeFileSync(`qr-designs/${design.key}.svg`, svg)
  return { ...design, svg }
})

writeFileSync('qr-designs.html', overviewPage(site, built, { codeSize: 48, roundSize: 56 }))
built.forEach((design, index) => {
  writeFileSync(
    `qr-designs/${index + 1}-${design.key}.html`,
    tableSheet(site, design, index, { codeSize: 60, roundSize: 72 })
  )
})
console.log(
  `Built ${built.length} QR designs (version ${code.version}, ${code.n}x${code.n}, level H) into qr-designs/ and qr-designs.html`
)
