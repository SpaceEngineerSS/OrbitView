// Renders every brand bitmap from one SVG drawing: favicons, PWA icons
// (regular and maskable), the Apple touch icon and the social preview image.
//
//   node scripts/render-brand.mjs      (run docs:snap first; the preview uses docs/img/desktop-iss.webp)

import puppeteer from "puppeteer";
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (f) => join(root, "public", f);

/** The app icon. `bleed` drops the rounded corners for maskable / iOS icons. */
function iconSvg({ bleed = false, inset = 0 } = {}) {
    const s = 64;
    const scale = (s - inset * 2) / s;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24356f"/><stop offset="1" stop-color="#0c1330"/></linearGradient></defs>
  <rect width="64" height="64" rx="${bleed ? 0 : 15}" fill="url(#g)"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <g transform="rotate(-22 32 34)" fill="none" stroke="#f4f5f8" stroke-width="2.2"><path d="M7 34 A25 8.5 0 0 1 57 34" stroke-opacity="0.35"/></g>
    <circle cx="32" cy="34" r="12" fill="#f4f5f8"/>
    <g transform="rotate(-22 32 34)" fill="none" stroke="#f4f5f8" stroke-width="2.2"><path d="M7 34 A25 8.5 0 0 0 57 34" stroke-opacity="0.8"/></g>
    <circle cx="54.9" cy="27.9" r="4.2" fill="#ffc94d"/>
  </g>
</svg>`;
}

/** ICO container holding PNG images (supported by every current browser). */
function pngsToIco(pngs) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
    const dir = Buffer.alloc(16 * pngs.length);
    let offset = 6 + dir.length;
    pngs.forEach(({ size, data }, i) => {
        const o = i * 16;
        dir.writeUInt8(size >= 256 ? 0 : size, o);
        dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
        dir.writeUInt16LE(1, o + 4);
        dir.writeUInt16LE(32, o + 6);
        dir.writeUInt32LE(data.length, o + 8);
        dir.writeUInt32LE(offset, o + 12);
        offset += data.length;
    });
    return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

async function renderSvg(svg, size, transparent = true) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

try {
    writeFileSync(pub("favicon.svg"), iconSvg());

    for (const size of [144, 192, 512]) writeFileSync(pub(`icon-${size}x${size}.png`), await renderSvg(iconSvg(), size));
    // Maskable: full bleed, artwork inside the 80% safe zone
    for (const size of [192, 512]) writeFileSync(pub(`icon-maskable-${size}x${size}.png`), await renderSvg(iconSvg({ bleed: true, inset: 6.4 }), size, false));
    writeFileSync(pub("apple-touch-icon.png"), await renderSvg(iconSvg({ bleed: true, inset: 4 }), 180, false));

    const icoParts = [];
    for (const size of [16, 32, 48]) icoParts.push({ size, data: Buffer.from(await renderSvg(iconSvg(), size)) });
    writeFileSync(pub("favicon.ico"), pngsToIco(icoParts));

    // Social preview: 1200×630
    const shot = join(root, "docs", "img", "desktop-iss.webp");
    const shotData = existsSync(shot) ? `data:image/webp;base64,${readFileSync(shot).toString("base64")}` : "";
    const font = "'Instrument Sans', 'Segoe UI', system-ui, sans-serif";
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(`<html><head>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap" rel="stylesheet">
</head><body style="margin:0;width:1200px;height:630px;background:#eef0f5;font-family:${font};color:#101218;overflow:hidden;position:relative">
  <div style="position:absolute;left:72px;top:96px;width:440px">
    <div style="width:84px;height:84px">${iconSvg().replace("<svg ", '<svg width="84" height="84" ')}</div>
    <div style="font-size:64px;font-weight:600;letter-spacing:-0.03em;margin-top:28px">OrbitView</div>
    <div style="font-size:26px;line-height:1.35;color:#636878;margin-top:14px">Every tracked satellite on a 3D globe, with your passes, Doppler and orbit in one place.</div>
    <div style="display:flex;gap:10px;margin-top:34px;font-size:18px;font-weight:600">
      <span style="background:rgba(28,154,83,.12);color:#1c9a53;padding:8px 16px;border-radius:999px">Visible passes</span>
      <span style="background:rgba(52,102,242,.12);color:#3466f2;padding:8px 16px;border-radius:999px">SGP4 · open source</span>
    </div>
  </div>
  ${shotData ? `<div style="position:absolute;left:580px;top:70px;width:900px;height:506px;border-radius:28px;overflow:hidden;box-shadow:0 24px 64px rgba(16,18,24,.25)">
    <img src="${shotData}" style="width:900px;height:506px;object-fit:cover;object-position:left top">
  </div>` : ""}
</body></html>`, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(pub("og-image.png"), await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));

    // Manifest screenshots come from the docs set
    mkdirSync(pub("screenshots"), { recursive: true });
    for (const [from, to] of [["desktop-iss.webp", "desktop.webp"], ["mobile-iss.webp", "mobile.webp"]]) {
        const src = join(root, "docs", "img", from);
        if (existsSync(src)) copyFileSync(src, pub(join("screenshots", to)));
    }
    console.log("brand assets written to public/");
} finally {
    await browser.close();
}
