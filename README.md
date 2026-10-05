# JENZY Lounge QR menu

The menu customers open by scanning the QR code on the tables.

Live page: https://jenzy-lounge.github.io/

## Change a price or an item

1. Edit `menu.csv`. Columns are category, name, price and description. Sizes such as Half, Full, 6 pcs or 500 ml are grouped under one item automatically. For deals, list what is included in the description, separated by semicolons.
2. Run `npm install` once, then `npm run build`.
3. Commit and push. The live page updates within a minute. The printed QR code does not change.

## Change the address, hours or phone numbers

Edit `site.json`, then build, commit and push as above.

## QR code

`qr.png` (1200 px) and `qr.svg` hold the QR code on its own, for stickers, posters or social media. They are rebuilt by `npm run build` and always point at the live page address.

## Table cards

`table-cards.pdf` is an A4 sheet with four cards. Print it on card stock and cut along the dashed lines. To regenerate it after a build:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --virtual-time-budget=5000 --print-to-pdf=table-cards.pdf "file://$PWD/cards.html"
```

The QR code holds the live page address from `site.json`. If the café moves to its own domain, set it up in the repository's Pages settings; GitHub forwards the old address, so printed cards keep working.
