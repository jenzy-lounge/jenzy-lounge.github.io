import { readFileSync, writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const site = JSON.parse(readFileSync('site.json', 'utf8'))

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const money = (amount) => `Rs ${Number(amount).toLocaleString('en-US')}`

const SIZE_PATTERNS = [
  /^(.*) (Quarter|Half|Full)$/,
  /^(.*) (\d+ pcs)$/,
  /^(Cold Drink|Water) (.+)$/
]

const splitSize = (name) => {
  for (const pattern of SIZE_PATTERNS) {
    const match = pattern.exec(name)
    if (match) return { base: match[1], size: match[2] }
  }
  return { base: name, size: '' }
}

const [header, ...body] = parseCsv(readFileSync('menu.csv', 'utf8'))
const column = (name) => header.indexOf(name)
const categories = []
for (const cells of body) {
  const categoryName = cells[column('category')].trim()
  const name = cells[column('name')].trim()
  const price = Number(cells[column('price')])
  const description = (cells[column('description')] ?? '').trim()
  if (!categoryName || !name || !Number.isFinite(price)) continue
  let category = categories.find((entry) => entry.name === categoryName)
  if (!category) {
    category = { name: categoryName, id: slug(categoryName), items: [] }
    categories.push(category)
  }
  const { base, size } = splitSize(name)
  const last = category.items[category.items.length - 1]
  if (size && last && last.name === base && last.sizes.length) {
    last.sizes.push({ label: size, price })
    continue
  }
  category.items.push(
    size
      ? { name: base, description, sizes: [{ label: size, price }] }
      : { name, description, price, sizes: [] }
  )
}

const itemCount = categories.reduce((sum, category) => sum + category.items.length, 0)

const badge = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="${escape(site.name)} logo"><circle cx="100" cy="100" r="98" fill="#0d0d0b"/><circle cx="100" cy="100" r="92" fill="none" stroke="#f2b705" stroke-width="3"/><g fill="none" stroke="#f2b705" stroke-width="5" stroke-linejoin="round" transform="translate(74 22) scale(0.43)"><path d="M60 4c-9 0-16 5-19 12-3-1-6-2-9-2C21 14 12 22 12 33c0 9 6 16 14 18v20h68V51c8-2 14-9 14-18 0-11-9-19-20-19-3 0-6 1-9 2C76 9 69 4 60 4z"/><path d="M26 82h68"/></g><text x="100" y="128" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="72" fill="#f2b705">${escape(site.letters)}</text><text x="100" y="160" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="19" letter-spacing="5" fill="#f2b705">${escape(site.name)}</text></svg>`

const digits = (phone) => phone.replace(/\D/g, '')
const international = (phone) => `92${digits(phone).replace(/^0/, '')}`

const itemHtml = (item, deal) => {
  const search = escape(`${item.name} ${item.description}`.toLowerCase())
  if (deal) {
    const includes = item.description
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
    return `<li class="deal" data-search="${search}"><div class="deal-head"><h3>${escape(item.name)}</h3><span class="tag">${money(item.price)}</span></div><ul class="includes">${includes.map((part) => `<li>${escape(part)}</li>`).join('')}</ul></li>`
  }
  if (item.sizes.length)
    return `<li class="item" data-search="${search}"><h3>${escape(item.name)}</h3><ul class="sizes">${item.sizes
      .map(
        (size) =>
          `<li><span>${escape(size.label)}</span><span class="dots"></span><span class="price">${money(size.price)}</span></li>`
      )
      .join('')}</ul></li>`
  return `<li class="item" data-search="${search}"><div class="line"><h3>${escape(item.name)}</h3><span class="dots"></span><span class="price">${money(item.price)}</span></div></li>`
}

const sections = categories
  .map((category) => {
    const deal = category.name === 'Deals'
    return `<section id="${category.id}" class="category${deal ? ' deals' : ''}"><h2>${escape(category.name)}</h2><ul class="${deal ? 'deal-list' : 'items'}">${category.items.map((item) => itemHtml(item, deal)).join('')}</ul></section>`
  })
  .join('\n')

const chips = categories
  .map((category) => `<a href="#${category.id}" data-chip="${category.id}">${escape(category.name)}</a>`)
  .join('')

const featured = JSON.parse(readFileSync('featured.json', 'utf8')).map((dish, index, list) => {
  const { base, size } = splitSize(dish.name)
  const item = categories
    .flatMap((category) => category.items)
    .find((entry) => entry.name === dish.name || (size === '' && entry.name === base))
  if (!item) throw new Error(`featured.json: "${dish.name}" is not on the menu`)
  const price = item.sizes.length
    ? `from ${money(Math.min(...item.sizes.map((entry) => entry.price)))}`
    : money(item.price)
  return { ...dish, title: dish.title ?? dish.name, price, number: String(index + 1).padStart(2, '0'), total: String(list.length).padStart(2, '0') }
})

const embers = Array.from({ length: 16 }, (_, k) => {
  const x = (k * 61) % 100
  const d = 7 + ((k * 37) % 6)
  const t = -((k * 1.3) % d)
  const dx = ((k * 29) % 60) - 30
  return `<i style="--x:${x}%;--d:${d}s;--t:${t.toFixed(1)}s;--dx:${dx}px"></i>`
}).join('')

const showHtml = `<div class="stage">
  <div class="embers" aria-hidden="true">${embers}</div>
  ${featured
    .map(
      (dish, index) => `<section class="dish${index === 0 ? ' on' : ''}" id="dish-${dish.number}" aria-label="${escape(dish.title)}">
    <div class="dish-glow"></div>
    <div class="dish-inner">
      <div class="dish-info">
        <p class="dish-num"><span>${dish.number}</span> / ${dish.total}</p>
        <p class="dish-kicker">${escape(dish.kicker)}</p>
        <h2 class="dish-title">${escape(dish.title)}</h2>
        <p class="dish-text">${escape(dish.text)}</p>
        <div class="dish-buy"><span class="dish-price">${escape(dish.price)}</span><a class="dish-order" href="https://wa.me/${international(site.whatsapp)}?text=${encodeURIComponent(`Hi ${site.name}, I'd like to order: ${dish.title}`)}">Order on WhatsApp</a></div>
      </div>
      <div class="dish-stage">
        <div class="dish-pics">
          <img class="pic-whole" src="${escape(dish.image)}" alt="${escape(dish.title)}" width="900" height="900" ${index < 1 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
          <img class="pic-burst" src="${escape(dish.image.replace(/\.webp$/, '-burst.webp'))}" alt="" width="900" height="900" loading="lazy" decoding="async">
        </div>
        <p class="dish-word" style="--len:${dish.word.length}"><span>${escape(dish.word)}</span></p>
      </div>
    </div>
  </section>`
    )
    .join('\n  ')}
  <ol class="stage-list" aria-hidden="true">${featured.map((dish) => `<li><b>${dish.number}</b>${escape(dish.title)}</li>`).join('')}</ol>
  <p class="stage-hint" aria-hidden="true">Scroll to serve the next dish <span>&#8595;</span></p>
  <div class="stage-bar" aria-hidden="true"><i id="stage-fill"></i></div>
</div>`

const tickerWords = featured.map((dish) => dish.title)
const tickerHtml = [...tickerWords, ...tickerWords]
  .map((word, k) => `<span class="${k % 2 ? 'hollow' : ''}">${escape(word)}</span><b>&#10022;</b>`)
  .join('')

const storyWords = 'Every order at Jenzy is cooked when you order it. Burgers are smashed on a hot griddle, shawarma is toasted until it crackles, tikka is charred over the flame and the chai is boiled strong in milk. Then it comes to your table, hot.'
  .split(' ')
  .map((word) => {
    const pics = { griddle: 'smash', crackles: 'shawarma', flame: 'fish', milk: 'chai' }
    const key = word.replace(/[^a-z]/gi, '').toLowerCase()
    const pic = pics[key] ? ` <img class="story-pic" src="img/${pics[key]}.webp" alt="" loading="lazy">` : ''
    return `<span>${escape(word)}</span>${pic}`
  })
  .join(' ')

const updated = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date())

const favicon = `data:image/svg+xml,${encodeURIComponent(badge(64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escape(site.name)} ${escape(site.suffix)} Menu</title>
<meta name="description" content="Menu and prices for ${escape(site.name)} ${escape(site.suffix)}, ${escape(site.address)}. Open ${escape(site.hoursLabel)}.">
<meta name="theme-color" content="#0d0d0b">
<meta property="og:title" content="${escape(site.name)} ${escape(site.suffix)} Menu">
<meta property="og:description" content="Burgers, BBQ, fish, shawarma, deals and more. Open ${escape(site.hoursLabel)}.">
<meta property="og:type" content="website">
<meta property="og:url" content="${escape(site.url)}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Caveat+Brush&display=swap">
<style>
:root {
  --bg: #0d0d0b;
  --panel: #171714;
  --line: #2b2a24;
  --ink: #f6f3ea;
  --muted: #aaa598;
  --yellow: #ffd21f;
  --gold: #f2b705;
  --red: #d8312a;
  --display: 'Caveat Brush', 'Marker Felt', 'Comic Sans MS', cursive;
  --body: 'Barlow', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
.category { scroll-margin-top: 118px; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.45; -webkit-text-size-adjust: 100%; }
a { color: inherit; }
.wrap { max-width: 720px; margin: 0 auto; padding-inline: 18px; }
.hero { padding-block: 26px 18px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.hero h1 { margin: 4px 0 0; font-family: var(--display); font-weight: 400; font-size: 56px; line-height: 0.95; color: var(--yellow); letter-spacing: 1px; }
.hero h1 span { display: block; color: var(--ink); font-size: 34px; letter-spacing: 3px; text-transform: uppercase; }
.tagline { margin: 0; font-size: 12.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--muted); }
.status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); font-size: 14px; font-weight: 600; }
.status i { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
.status.open i { background: #35c46a; box-shadow: 0 0 0 4px rgba(53, 196, 106, 0.18); }
.status.closed i { background: var(--red); }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 4px; }
.btn { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 18px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; border: 1px solid var(--line); background: var(--panel); }
.btn.primary { background: var(--yellow); border-color: var(--yellow); color: #14130f; }
.btn small { font-weight: 500; opacity: 0.8; }
.bar { position: sticky; top: 0; z-index: 5; background: var(--bg); border-block: 1px solid var(--line); padding-top: env(safe-area-inset-top, 0px); }
.search { padding-block: 10px 8px; }
.search input { width: 100%; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; padding: 0 14px; outline: none; }
.search input::placeholder { color: var(--muted); }
.search input:focus-visible { border-color: var(--yellow); }
.chips { display: flex; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 10px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.chips::-webkit-scrollbar { display: none; }
.chips a { flex: none; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; }
.chips a.active { background: var(--yellow); border-color: var(--yellow); color: #14130f; }
:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }
main { padding-block: 8px 28px; }
.category { padding-top: 26px; }
.category h2 { margin: 0 0 12px; display: inline-block; font-family: var(--display); font-weight: 400; font-size: 30px; line-height: 1; color: #14130f; background: var(--yellow); padding: 6px 16px 7px; border-radius: 6px 14px 8px 12px; transform: rotate(-1.2deg); }
.items, .deal-list, .sizes, .includes { list-style: none; margin: 0; padding: 0; }
.item { padding: 11px 0; border-bottom: 1px solid var(--line); }
.item h3, .deal h3 { margin: 0; font-size: 17px; font-weight: 600; }
.line, .sizes li { display: flex; align-items: baseline; gap: 8px; }
.dots { flex: 1; min-width: 14px; border-bottom: 2px dotted #4a483f; transform: translateY(-4px); }
.price { font-weight: 700; color: var(--yellow); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sizes { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.sizes li { padding-left: 14px; color: var(--muted); font-size: 15.5px; }
.deal-list { display: grid; gap: 12px; }
@media (min-width: 620px) { .deal-list { grid-template-columns: 1fr 1fr; } }
.deal { border: 1.5px solid var(--gold); border-radius: 16px; background: var(--panel); padding: 14px 16px 15px; }
.deal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.deal h3 { font-family: var(--display); font-weight: 400; font-size: 25px; line-height: 1.05; color: var(--yellow); text-transform: uppercase; }
.tag { flex: none; background: var(--red); color: #fff; font-weight: 700; font-size: 16px; padding: 4px 11px 5px; border-radius: 5px 10px 6px 9px; transform: rotate(-2deg); font-variant-numeric: tabular-nums; white-space: nowrap; }
.includes { margin-top: 10px; display: flex; flex-direction: column; gap: 3px; font-size: 15px; }
.includes li { padding-left: 16px; position: relative; }
.includes li::before { content: ''; position: absolute; left: 2px; top: 0.58em; width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); }
.empty { padding: 40px 0; text-align: center; color: var(--muted); }
footer { margin-top: 12px; border-top: 1px solid var(--line); background: #0a0a09; padding-block: 30px calc(32px + env(safe-area-inset-bottom, 0px)); color: var(--muted); font-size: 15px; }
.foot-brand { display: flex; align-items: center; gap: 14px; }
.foot-brand svg { flex: none; }
.foot-name strong { display: block; font-family: var(--display); font-weight: 400; font-size: 30px; line-height: 1; color: var(--yellow); letter-spacing: 1px; }
.slogan { display: block; margin-top: 4px; font-family: var(--display); font-size: 21px; line-height: 1; color: var(--ink); }
.heart { color: var(--red); }
.foot-grid { display: grid; gap: 14px; margin-top: 24px; }
@media (min-width: 620px) { .foot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .foot-block:last-child { grid-column: 1 / -1; } }
.foot-block { min-width: 0; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.foot-block h2 { margin: 0; font-family: var(--body); font-weight: 700; font-size: 12.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--gold); }
.foot-block p { margin: 0; color: var(--ink); line-height: 1.45; }
.foot-block .status { align-self: flex-start; }
.foot-link { align-self: flex-start; color: var(--yellow); font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(255, 210, 31, 0.45); padding-bottom: 1px; }
.foot-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
.foot-actions .btn { flex: 1 1 200px; justify-content: center; }
.foot-bottom { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 18px; font-size: 13px; }
.foot-bottom a { color: var(--ink); font-weight: 700; text-decoration: none; white-space: nowrap; }
.hero .jump { margin-top: 6px; display: inline-flex; flex-direction: column; align-items: center; gap: 2px; color: var(--muted); font-size: 13px; letter-spacing: 1.4px; text-transform: uppercase; text-decoration: none; }
.hero .jump b { font-family: var(--display); font-weight: 400; font-size: 24px; letter-spacing: 0.5px; text-transform: none; color: var(--yellow); }
.hero .jump i { font-style: normal; animation: nudge 1.6s ease-in-out infinite; color: var(--yellow); font-size: 20px; }
@keyframes nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
.show { position: relative; border-top: 1px solid var(--line); }
.dish { position: relative; min-height: 100svh; display: grid; place-items: center; padding: 64px 18px 28px; overflow: hidden; }
.dish + .dish { border-top: 1px solid #1b1a16; }
.dish-glow { position: absolute; inset: 0; background: radial-gradient(60% 45% at 50% 52%, rgba(255, 210, 31, 0.16), rgba(255, 210, 31, 0) 70%); pointer-events: none; }
.dish-inner { position: relative; width: 100%; max-width: 1120px; display: grid; justify-items: center; text-align: center; gap: 6px; }
.dish-info { display: contents; }
.dish-num { order: 1; margin: 0; font-family: var(--display); font-size: 22px; color: var(--muted); line-height: 1; }
.dish-num span { font-size: 42px; color: var(--yellow); }
.dish-kicker { order: 2; margin: 2px 0 0; font-size: 12.5px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase; color: var(--gold); }
.dish-stage { order: 3; position: relative; width: min(86vw, 44svh, 560px); display: grid; justify-items: center; }
.dish-pics { position: relative; width: 100%; aspect-ratio: 1; }
.dish-pics img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; -webkit-mask-image: radial-gradient(closest-side, #000 70%, transparent 100%); mask-image: radial-gradient(closest-side, #000 70%, transparent 100%); }
.pic-burst { display: none !important; }
.dish-word { position: relative; margin: -0.42em 0 0; padding: 0 0.1em 0.12em; overflow: hidden; font-family: var(--display); font-weight: 400; font-size: min(calc(140vw / var(--len)), 22svh, 150px); line-height: 0.95; color: var(--yellow); letter-spacing: 1px; transform: rotate(-3deg); pointer-events: none; }
.dish-word span { display: block; text-shadow: 0 6px 0 #8a6a00, 0 18px 40px rgba(255, 210, 31, 0.35); }
.dish-title { order: 4; margin: 8px 0 0; font-size: 24px; font-weight: 700; line-height: 1.15; }
.dish-text { order: 5; margin: 2px 0 0; max-width: 420px; color: var(--muted); font-size: 15px; line-height: 1.4; }
.dish-buy { order: 6; margin-top: 8px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px 16px; }
.dish-price { font-family: var(--display); font-size: 34px; line-height: 1; color: #14130f; background: var(--yellow); padding: 4px 14px 6px; border-radius: 6px 14px 8px 12px; transform: rotate(-2deg); }
.dish-order { color: var(--yellow); font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(255, 210, 31, 0.45); padding-bottom: 1px; }
.embers, .stage-list, .stage-hint, .stage-bar { display: none; }
@media (min-width: 900px) {
  .dish { padding: 70px 40px 40px; }
  .dish-inner { grid-template-columns: 360px 1fr; align-items: center; text-align: left; justify-items: start; gap: 0 40px; }
  .dish-info { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .dish-info > * { order: 0; }
  .dish-buy { justify-content: flex-start; }
  .dish-stage { justify-self: center; width: min(48vw, 66svh, 620px); }
  .dish-word { font-size: min(calc(150vw / var(--len)), 20svh, 170px); }
  .dish-glow { background: radial-gradient(45% 55% at 66% 50%, rgba(255, 210, 31, 0.16), rgba(255, 210, 31, 0) 70%); }
}
.pin { height: calc(var(--n) * 120svh); }
.pin .stage { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.pin .dish { position: absolute; inset: 0; min-height: 0; border: 0; opacity: 0; visibility: hidden; transition: opacity 0.5s ease, visibility 0s linear 0.5s; }
.pin .dish.on { opacity: 1; visibility: visible; transition: opacity 0.5s ease; }
.pin .pic-burst { display: block !important; }
.pin .pic-whole { opacity: calc(1 - clamp(0, (var(--p, 0) - 0.3) * 3, 1)); transform: scale(calc(0.9 + var(--p, 0) * 0.1)); }
.pin .pic-burst { opacity: clamp(0, (var(--p, 0) - 0.3) * 3, 1); transform: scale(calc(0.92 + var(--p, 0) * 0.16)) rotate(calc(var(--p, 0) * -4deg)); }
.pin .dish-word span { transform: translateY(110%); transition: transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1); }
.pin .dish.on .dish-word span { transform: none; }
.pin .dish.past .dish-word span { transform: translateY(-110%); }
.pin .dish-num, .pin .dish-kicker, .pin .dish-title, .pin .dish-text, .pin .dish-buy { opacity: 0; transform: translateY(18px); transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.pin .dish.past .dish-num, .pin .dish.past .dish-kicker, .pin .dish.past .dish-title, .pin .dish.past .dish-text, .pin .dish.past .dish-buy { transform: translateY(-18px); }
.pin .dish.on .dish-num, .pin .dish.on .dish-kicker, .pin .dish.on .dish-title, .pin .dish.on .dish-text, .pin .dish.on .dish-buy { opacity: 1; transform: none; }
.pin .dish.on .dish-kicker { transition-delay: 0.05s; }
.pin .dish.on .dish-title { transition-delay: 0.1s; }
.pin .dish.on .dish-text { transition-delay: 0.15s; }
.pin .dish.on .dish-buy { transition-delay: 0.2s; }
.pin .dish.on .dish-price { transform: rotate(-2deg); }
.pin .embers { display: block; position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.embers i { position: absolute; bottom: -12px; left: var(--x); width: 4px; height: 4px; border-radius: 50%; background: var(--yellow); box-shadow: 0 0 10px 2px rgba(255, 190, 0, 0.7); opacity: 0; animation: rise var(--d) linear infinite; animation-delay: var(--t); }
@keyframes rise { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.85; } 100% { transform: translate(var(--dx), -105svh); opacity: 0; } }
.pin .stage-bar { display: block; position: absolute; right: 10px; top: 50%; width: 3px; height: 34svh; transform: translateY(-50%); background: var(--line); border-radius: 3px; overflow: hidden; z-index: 3; }
.stage-bar i { position: absolute; inset: 0; background: var(--yellow); transform-origin: top; transform: scaleY(var(--s, 0)); }
@media (min-width: 900px) {
  .pin .stage-hint { display: block; position: absolute; left: 40px; bottom: 26px; margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase; color: var(--muted); z-index: 3; }
  .stage-hint span { display: inline-block; color: var(--yellow); animation: nudge 1.6s ease-in-out infinite; }
}
@media (min-width: 1180px) {
  .pin .stage-list { display: flex; flex-direction: column; gap: 9px; position: absolute; right: 34px; top: 50%; transform: translateY(-50%); margin: 0; padding: 0; list-style: none; z-index: 3; font-size: 12px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #5f5b4f; }
  .stage-list li { transition: color 0.3s ease, transform 0.3s ease; }
  .stage-list b { display: inline-block; width: 26px; color: inherit; }
  .stage-list li.on { color: var(--yellow); transform: translateX(-8px); }
  .pin .stage-bar { right: 20px; }
}
.ticker { overflow: hidden; border-block: 1px solid var(--line); background: #0a0a09; padding: 14px 0; }
.ticker-track { display: flex; align-items: center; gap: 22px; width: max-content; animation: slide 38s linear infinite; }
.ticker span { font-family: var(--display); font-size: 40px; line-height: 1; color: var(--yellow); white-space: nowrap; }
.ticker span.hollow { color: transparent; -webkit-text-stroke: 1.5px var(--yellow); }
.ticker b { color: var(--gold); font-size: 20px; }
@keyframes slide { to { transform: translateX(-50%); } }
.story { padding-block: 80px; }
.story-label { margin: 0 0 18px; font-size: 12.5px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase; color: var(--gold); }
.story-text { margin: 0; font-size: clamp(27px, 6.4vw, 46px); font-weight: 700; line-height: 1.22; letter-spacing: -0.3px; }
.story-text span { color: #34322b; transition: color 0.35s ease; }
.story-text span.lit { color: var(--ink); }
.no-js .story-text span, .still .story-text span { color: var(--ink); }
.story-pic { display: inline-block; width: 1.5em; height: 1em; object-fit: cover; border-radius: 999px; vertical-align: -0.12em; border: 2px solid var(--yellow); }
.mask { padding: 30px 0 70px; text-align: center; overflow: hidden; }
.mask-word { margin: 0; font-family: var(--display); font-size: 34vw; line-height: 0.85; color: var(--yellow); background-image: url(img/fries-burst.webp); background-size: calc(100% + var(--m, 0) * 60%); background-position: center; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 8px 30px rgba(255, 210, 31, 0.25)); }
@media (min-width: 900px) { .mask-word { font-size: 280px; } }
.mask p.slogan-big { margin: 10px 0 0; font-family: var(--display); font-size: 30px; color: var(--ink); }
.loader { position: fixed; inset: 0; z-index: 50; display: none; place-items: center; background: var(--bg); transition: clip-path 0.8s cubic-bezier(0.7, 0, 0.2, 1); clip-path: inset(0 0 0 0); }
.js .loader { display: grid; }
.loader.done { clip-path: inset(0 0 100% 0); }
.loader-in { display: grid; justify-items: center; gap: 12px; }
.loader-count { font-family: var(--display); font-size: 64px; line-height: 1; color: var(--yellow); font-variant-numeric: tabular-nums; }
.loader-line { width: 160px; height: 2px; background: var(--line); overflow: hidden; }
.loader-line i { display: block; height: 100%; background: var(--yellow); transform-origin: left; transform: scaleX(var(--l, 0)); }
.show-nav { position: fixed; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); z-index: 6; transform: translate(-50%, -160%); transition: transform 0.35s ease; display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 999px; background: rgba(23, 23, 20, 0.92); border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
.show-nav.on { transform: translate(-50%, 0); }
.show-nav span { white-space: nowrap; padding: 0 12px; font-family: var(--display); font-size: 20px; color: var(--yellow); font-variant-numeric: tabular-nums; }
.show-nav a { padding: 9px 16px; border-radius: 999px; background: var(--yellow); color: #14130f; font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap; }
.note { display: block; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .ticker-track, .embers i, .hero .jump i, .stage-hint span { animation: none !important; } .loader { display: none !important; } }
[hidden] { display: none !important; }
</style>
</head>
<body>
<header class="hero wrap" id="top">
  ${badge(108)}
  <h1>${escape(site.name)}<span>${escape(site.suffix)}</span></h1>
  <p class="tagline">${escape(site.tagline)}</p>
  <span class="status" id="status"><i></i><span>Open ${escape(site.hoursLabel)}</span></span>
  <div class="actions">
    <a class="btn primary" href="https://wa.me/${international(site.whatsapp)}">WhatsApp <small>${escape(site.whatsapp)}</small></a>
    <a class="btn" href="tel:${digits(site.phone)}">Call <small>${escape(site.phone)}</small></a>
  </div>
  <a class="jump" href="#show"><b>Scroll to taste</b>our favourites<i>&#8595;</i></a>
</header>
<div class="loader" id="loader" aria-hidden="true"><div class="loader-in">${badge(84)}<span class="loader-count" id="loader-count">0%</span><span class="loader-line"><i id="loader-line"></i></span></div></div>
<div class="show" id="show" style="--n:${featured.length}">
${showHtml}
</div>
<div class="ticker" aria-hidden="true"><div class="ticker-track">${tickerHtml}</div></div>
<section class="story wrap" id="story"><p class="story-label">The Jenzy way</p><p class="story-text" id="story-text">${storyWords}</p></section>
<section class="mask" id="mask"><p class="mask-word" aria-label="${escape(site.name)}">${escape(site.name)}</p><p class="slogan-big">Taste you'll love</p></section>
<nav class="show-nav" id="show-nav" aria-label="Favourites"><span id="show-count">01 / ${String(featured.length).padStart(2, '0')}</span><a href="#menu">Full menu &#8595;</a></nav>
<div class="bar" id="menu">
  <div class="wrap">
    <div class="search"><label class="sr" for="q" hidden>Search the menu</label><input id="q" type="search" inputmode="search" autocomplete="off" placeholder="Search ${itemCount} items, e.g. zinger, tikka, fries"></div>
    <nav class="chips" aria-label="Menu sections">${chips}</nav>
  </div>
</div>
<main class="wrap">
${sections}
<p class="empty" id="empty" hidden>Nothing on the menu matches that. Try another word.</p>
</main>
<footer id="visit">
  <div class="wrap">
    <div class="foot-brand">
      ${badge(64)}
      <div class="foot-name"><strong>${escape(site.name)} ${escape(site.suffix)}</strong><span class="slogan"><span class="heart">&#9829;</span> Taste you'll love</span></div>
    </div>
    <div class="foot-grid">
      <section class="foot-block">
        <h2>Find us</h2>
        <p>${escape(site.address)}</p>
        <a class="foot-link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(`${site.name} ${site.suffix}, ${site.address}`)}">Open in Google Maps</a>
      </section>
      <section class="foot-block">
        <h2>Hours</h2>
        <p>${escape(site.hoursLabel)}</p>
        <span class="status"><i></i><span>Open ${escape(site.hoursLabel)}</span></span>
      </section>
      <section class="foot-block">
        <h2>Order or reserve</h2>
        <p>Call or message us for takeaway, delivery and table bookings.</p>
        <div class="foot-actions">
          <a class="btn primary" href="https://wa.me/${international(site.whatsapp)}">WhatsApp <small>${escape(site.whatsapp)}</small></a>
          <a class="btn" href="tel:${digits(site.phone)}">Call <small>${escape(site.phone)}</small></a>
        </div>
      </section>
    </div>
    <div class="foot-bottom">
      <span>Prices in Pakistani rupees and may change. Menu updated ${escape(updated)}.<span class="note">Dish pictures are for illustration; serving may vary.</span></span>
      <a href="#top">Back to top &#8593;</a>
    </div>
  </div>
</footer>
<script>
document.documentElement.classList.add('js');
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var loader = document.getElementById('loader');
  var seen = false;
  try { seen = sessionStorage.getItem('jz-loaded') === '1'; sessionStorage.setItem('jz-loaded', '1'); } catch (e) {}
  if (reduce || seen) { loader.parentNode.removeChild(loader); }
  else {
    var countEl = document.getElementById('loader-count');
    var line = document.getElementById('loader-line');
    var first = document.querySelector('.pic-whole');
    var ready = false;
    var start = performance.now();
    var markReady = function () { ready = true; };
    if (first && !first.complete) { first.addEventListener('load', markReady); first.addEventListener('error', markReady); } else markReady();
    var tick = function (now) {
      var elapsed = now - start;
      var target = ready ? 1 : 0.9;
      var value = Math.min(target, elapsed / 1100);
      if (elapsed > 2600) value = 1;
      countEl.textContent = Math.round(value * 100) + '%';
      line.style.setProperty('--l', value.toFixed(3));
      if (value >= 1) {
        setTimeout(function () { loader.classList.add('done'); }, 150);
        setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 1100);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  var show = document.getElementById('show');
  var dishes = Array.prototype.slice.call(document.querySelectorAll('.dish'));
  var listItems = Array.prototype.slice.call(document.querySelectorAll('.stage-list li'));
  var nav = document.getElementById('show-nav');
  var count = document.getElementById('show-count');
  var fill = document.getElementById('stage-fill');
  var story = document.getElementById('story-text');
  var words = story ? Array.prototype.slice.call(story.querySelectorAll('span')) : [];
  var mask = document.getElementById('mask');
  var maskWord = mask ? mask.querySelector('.mask-word') : null;
  var total = String(dishes.length).padStart(2, '0');
  if (reduce) { document.documentElement.classList.add('still'); dishes.forEach(function (d) { d.classList.add('on'); }); return; }
  show.classList.add('pin');
  var active = -1;
  var lit = -1;
  var pending = false;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var setActive = function (index) {
    if (index === active) return;
    active = index;
    dishes.forEach(function (d, k) { d.classList.toggle('on', k === index); d.classList.toggle('past', k < index); });
    listItems.forEach(function (li, k) { li.classList.toggle('on', k === index); });
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + total;
  };
  var frame = function () {
    pending = false;
    var vh = window.innerHeight;
    var rect = show.getBoundingClientRect();
    var span = show.offsetHeight - vh;
    var progress = clamp(-rect.top / span, 0, 0.99999);
    var t = progress * dishes.length;
    var index = Math.floor(t);
    setActive(index);
    dishes[index].style.setProperty('--p', clamp((t - index) * 1.15, 0, 1).toFixed(3));
    fill.style.setProperty('--s', progress.toFixed(3));
    nav.classList.toggle('on', rect.top < -20 && rect.bottom > vh * 0.6);
    if (story) {
      var sr = story.getBoundingClientRect();
      var sp = clamp((vh * 0.85 - sr.top) / (sr.height + vh * 0.35), 0, 1);
      var upto = Math.round(sp * words.length) - 1;
      if (upto !== lit) { words.forEach(function (w, k) { w.classList.toggle('lit', k <= upto); }); lit = upto; }
    }
    if (maskWord) {
      var mr = mask.getBoundingClientRect();
      maskWord.style.setProperty('--m', clamp(1 - (mr.top + mr.height) / (vh + mr.height), 0, 1).toFixed(3));
    }
  };
  var request = function () { if (!pending) { pending = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  listItems.forEach(function (li, k) {
    li.style.cursor = 'pointer';
    li.addEventListener('click', function () {
      var span = show.offsetHeight - window.innerHeight;
      window.scrollTo({ top: show.getBoundingClientRect().top + window.scrollY + span * ((k + 0.05) / dishes.length), behavior: 'smooth' });
    });
  });
  frame();
})();
(function () {
  var opensAt = ${Number(site.opensAt)}, closesAt = ${Number(site.closesAt)}, zone = ${JSON.stringify(site.timeZone)};
  var pills = Array.prototype.slice.call(document.querySelectorAll('.status'));
  try {
    var hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: zone }).format(new Date()));
    var open = opensAt < closesAt ? hour >= opensAt && hour < closesAt : hour >= opensAt || hour < closesAt;
    var clock = function (h) { return (h % 12 || 12) + (h < 12 ? ' am' : ' pm'); };
    pills.forEach(function (pill) {
      pill.classList.add(open ? 'open' : 'closed');
      pill.lastElementChild.textContent = open ? 'Open now, until ' + clock(closesAt) : 'Closed now, opens ' + clock(opensAt);
    });
  } catch (error) {}

  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-chip]'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.category'));
  var rail = document.querySelector('.chips');
  var current = '';
  var setActive = function (id) {
    if (id === current) return;
    current = id;
    chips.forEach(function (chip) {
      var active = chip.getAttribute('data-chip') === id;
      chip.classList.toggle('active', active);
      if (active) rail.scrollLeft = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2;
    });
  };
  var bar = document.querySelector('.bar');
  var tops = [];
  var barHeight = 0;
  var pinned = false;
  var queued = false;
  var measure = function () {
    barHeight = bar.offsetHeight;
    tops = sections.map(function (section) { return section.hidden ? Infinity : section.offsetTop; });
  };
  var spy = function () {
    queued = false;
    if (pinned) return;
    var line = window.scrollY + barHeight + 48;
    var id = '';
    var last = '';
    for (var i = 0; i < sections.length; i += 1) {
      if (tops[i] === Infinity) continue;
      last = sections[i].id;
      if (!id || tops[i] <= line) id = sections[i].id;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = last;
    if (id) setActive(id);
  };
  var requestSpy = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(spy);
  };
  var release = function () { pinned = false; };
  window.addEventListener('scroll', requestSpy, { passive: true });
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('wheel', release, { passive: true });
  window.addEventListener('keydown', release);
  window.addEventListener('resize', function () { measure(); requestSpy(); });
  window.addEventListener('load', function () { measure(); requestSpy(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); requestSpy(); });
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      pinned = true;
      setActive(chip.getAttribute('data-chip'));
    });
  });
  measure();
  spy();

  var input = document.getElementById('q');
  var empty = document.getElementById('empty');
  input.addEventListener('input', function () {
    var words = input.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
    var any = false;
    sections.forEach(function (section) {
      var shown = 0;
      Array.prototype.forEach.call(section.querySelectorAll('[data-search]'), function (item) {
        var text = item.getAttribute('data-search');
        var match = words.every(function (word) { return text.indexOf(word) !== -1; });
        item.hidden = !match;
        if (match) shown += 1;
      });
      section.hidden = shown === 0;
      if (shown) any = true;
    });
    empty.hidden = any;
    measure();
    requestSpy();
  });
})();
</script>
</body>
</html>
`

writeFileSync('index.html', page)

const qr = await QRCode.toString(site.url, {
  type: 'svg',
  errorCorrectionLevel: 'Q',
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' }
})
writeFileSync('qr.svg', qr)
await QRCode.toFile('qr.png', site.url, {
  width: 1200,
  errorCorrectionLevel: 'Q',
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' }
})

const card = `<div class="card">
  ${badge(92)}
  <div class="brand">${escape(site.name)}<span>${escape(site.suffix)}</span></div>
  <div class="scan">Scan for menu</div>
  <div class="code">${qr.replace(/<\?xml[^>]*\?>/, '')}</div>
  <div class="hint">Open your phone camera and point it here</div>
  <div class="meta">Open ${escape(site.hoursLabel)}<br>WhatsApp ${escape(site.whatsapp)} · ${escape(site.phone)}</div>
</div>`

const cards = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(site.name)} ${escape(site.suffix)} table cards</title>
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
.code { margin-top: 2mm; width: 50mm; height: 50mm; background: #fff; border-radius: 3mm; padding: 1.5mm; }
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
writeFileSync('cards.html', cards)

console.log(
  `Built index.html with ${itemCount} menu entries in ${categories.length} sections, qr.svg, qr.png and cards.html for ${site.url}`
)
