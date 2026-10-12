// Takes the screenshots used in the README and docs.
//
//   npm run dev            (in another terminal)
//   npm run docs:snap      (BASE_URL=http://localhost:3000 by default)
//
// Every shot uses a fixed simulation time and observer so they can be
// retaken after a UI change and still line up. Output: docs/img/*.png

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "img");
const TIME = process.env.SNAP_TIME ?? "2026-10-12T18:20:00Z";
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, altitude: 40, label: "İstanbul" };

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Persisted app state, written before the page loads. */
function seed(page, locale, extra = {}) {
    const state = {
        state: {
            observer: ISTANBUL,
            settings: {
                showOrbit: true, showGroundTrack: true, showFootprint: true, showNightShadow: true,
                autoRotate: false, basemap: "dark", clock: "utc", minElevation: 10,
            },
            favorites: ["25544", "20580"],
            filter: "all",
            ...extra,
        },
        version: 1,
    };
    return page.evaluateOnNewDocument((s, l) => {
        localStorage.setItem("orbitview-v4", s);
        localStorage.setItem("orbitview-locale", l);
    }, JSON.stringify(state), locale);
}

async function open(page, query) {
    await page.goto(`${BASE}/?t=${encodeURIComponent(TIME)}${query}`, { waitUntil: "networkidle2", timeout: 120_000 });
    await page.waitForSelector(".globe-region canvas", { timeout: 60_000 });
    // Catalog in, first frames drawn, tiles settled.
    await page.waitForFunction(() => !document.body.innerText.match(/Loading catalog|Katalog yükleniyor/), { timeout: 60_000 });
    await sleep(6000);
}

async function pauseClock(page) {
    // Space toggles play/pause; stopping the clock keeps every shot at TIME.
    await page.keyboard.press("Space");
    await sleep(300);
}

async function tab(page, id) {
    await page.click(`[data-tab="${id}"]`);
    await sleep(2500);
}

async function shoot(page, name) {
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    console.log(`saved docs/img/${name}.png`);
}

const browser = await puppeteer.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});

try {
    for (const locale of ["en", "tr"]) {
        const suffix = locale === "en" ? "" : "-tr";

        // Desktop
        const desk = await browser.newPage();
        await desk.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
        await seed(desk, locale);

        await open(desk, "");
        await pauseClock(desk);
        await shoot(desk, `desktop-overview${suffix}`);

        await open(desk, "&sat=25544");
        await pauseClock(desk);
        await shoot(desk, `desktop-iss${suffix}`);
        await tab(desk, "passes");
        await shoot(desk, `desktop-passes${suffix}`);
        await tab(desk, "doppler");
        await shoot(desk, `desktop-doppler${suffix}`);
        await tab(desk, "lifetime");
        await shoot(desk, `desktop-lifetime${suffix}`);
        await desk.close();

        // Phone
        const phone = await browser.newPage();
        await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        await seed(phone, locale);
        await open(phone, "&sat=25544");
        await pauseClock(phone);
        await shoot(phone, `mobile-peek${suffix}`);
        await phone.click('button[data-grip="1"]');
        await sleep(800);
        await tab(phone, "passes");
        await shoot(phone, `mobile-passes${suffix}`);
        await phone.close();
    }
} finally {
    await browser.close();
}
