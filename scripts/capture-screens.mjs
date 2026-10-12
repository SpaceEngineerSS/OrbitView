// Takes the screenshots used in the README and docs.
//
//   npm run dev            (in another terminal)
//   npm run docs:snap      (BASE_URL=http://localhost:3000 by default)
//
// Every shot uses a fixed simulation time and observer, so they can be
// retaken after a UI change and still line up. The default time is a moment
// when the ISS is visibly overhead in Istanbul. Output: docs/img/*.webp

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "img");
const TIME = process.env.SNAP_TIME ?? "2026-10-14T03:40:30Z";
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, altitude: 40, label: "İstanbul" };

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, { locale, theme, mobile }) {
    const page = await browser.newPage();
    await page.setViewport(mobile
        ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        : { width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
    const state = {
        state: {
            observer: ISTANBUL,
            settings: {
                theme: "system", basemap: "imagery", clock: "utc", minElevation: 10,
                showOrbit: true, showGroundTrack: true, showFootprint: true, showNightShadow: true, autoRotate: false,
            },
            favorites: ["25544", "20580"],
            filter: "all",
        },
        version: 1,
    };
    await page.evaluateOnNewDocument((s, l) => {
        localStorage.setItem("orbitview-v4", s);
        localStorage.setItem("orbitview-locale", l);
    }, JSON.stringify(state), locale);
    page.on("pageerror", (e) => console.warn("page error:", e.message));
    return page;
}

async function open(page, query = "") {
    await page.goto(`${BASE}/?t=${encodeURIComponent(TIME)}${query}`, { waitUntil: "networkidle2", timeout: 120_000 });
    await page.waitForSelector(".globe-region canvas", { timeout: 60_000 });
    await page.waitForFunction(() => !/Loading catalog|Katalog yükleniyor/.test(document.body.innerText), { timeout: 90_000 });
    await sleep(8000); // tiles, first frames, card animations
}

async function shoot(page, name) {
    await page.screenshot({ path: join(OUT, `${name}.webp`), type: "webp", quality: 82 });
    console.log(`saved docs/img/${name}.webp`);
}

/** Scroll the inspector (or phone sheet) so the card with this heading is at the top. */
async function scrollToCard(page, heading) {
    await page.evaluate((h) => {
        const el = [...document.querySelectorAll("section h3")].find((x) => x.textContent?.includes(h));
        const card = el?.closest("section");
        card?.scrollIntoView({ block: "start" });
        // keep it clear of the sticky header in the inspector
        const scroller = card?.closest(".scroll");
        if (scroller && getComputedStyle(scroller).position === "fixed") scroller.scrollBy(0, -96);
    }, heading);
    await sleep(1200);
}

async function flickSheetUp(page) {
    const grip = await page.$('button[data-grip="1"]');
    const box = await grip.boundingBox();
    const x = box.x + box.width / 2;
    await page.touchscreen.touchStart(x, box.y + 10);
    for (let i = 1; i <= 6; i++) { await page.touchscreen.touchMove(x, box.y + 10 - i * 60); await sleep(16); }
    await page.touchscreen.touchEnd();
    await sleep(1200);
}

const browser = await puppeteer.launch({
    headless: true,
    args: (process.env.SNAP_GL === "swiftshader"
        ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"]).concat(["--hide-scrollbars"]),
});

const PASSES = { en: "Next 48 hours", tr: "Önümüzdeki 48 saat" };

/** One fresh tab per scene: WebGL in headless Chrome doesn't survive many reloads. */
async function scene(opts, query, fn) {
    const page = await newPage(browser, opts);
    try {
        await open(page, query);
        await fn(page);
    } finally {
        await page.close();
    }
}

try {
    for (const locale of ["en", "tr"]) {
        const s = locale === "en" ? "" : "-tr";
        const desk = { locale, theme: "light", mobile: false };
        const phone = { locale, theme: "light", mobile: true };

        await scene(desk, "&sat=25544", async (p) => {
            await shoot(p, `desktop-iss${s}`);
            await scrollToCard(p, PASSES[locale]);
            await shoot(p, `desktop-passes${s}`);
        });
        await scene({ ...desk, theme: "dark" }, "", (p) => shoot(p, `desktop-browse-dark${s}`));
        await scene(phone, "", (p) => shoot(p, `mobile-browse${s}`));
        await scene(phone, "&sat=25544", async (p) => {
            await shoot(p, `mobile-iss${s}`);
            await flickSheetUp(p);
            await scrollToCard(p, PASSES[locale]);
            await shoot(p, `mobile-passes${s}`);
        });
        await scene({ ...phone, theme: "dark" }, "&sat=25544", (p) => shoot(p, `mobile-iss-dark${s}`));
    }
} finally {
    await browser.close();
}
