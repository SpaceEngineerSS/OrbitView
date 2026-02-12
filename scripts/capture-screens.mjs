import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../public/screenshots');
const URL = 'http://localhost:3000'; // Make sure the app is running!

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
    console.log('🚀 Launching browser for screenshot capture...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
    });

    const page = await browser.newPage();

    // Set a user agent to avoid bot detection if necessary, though localhost is fine
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log(`🌐 Navigating to ${URL}...`);
        // Wait until network is idle to ensure assets are loaded
        await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });

        // --- 1. Desktop Capture ---
        console.log('📸 Capturing Desktop View...');
        await page.setViewport({ width: 1920, height: 1080 });

        // Wait for Globe or critical UI to be visible
        // We'll wait a bit extra for Cesium to render tiles
        await new Promise(r => setTimeout(r, 5000));

        await page.screenshot({
            path: path.join(OUTPUT_DIR, 'desktop-preview.png'),
            fullPage: false
        });
        console.log('✅ Desktop screenshot saved.');

        // --- 2. Mobile Capture (iPhone 14 Pro dims) ---
        console.log('📱 Capturing Mobile View...');
        await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });

        // Reload to trigger mobile-specific logic (e.g. Globe resolution reduction)
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 5000)); // Wait for render

        await page.screenshot({
            path: path.join(OUTPUT_DIR, 'mobile-preview.png'),
            fullPage: false
        });
        console.log('✅ Mobile screenshot saved.');

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error);
    } finally {
        await browser.close();
        console.log('✨ Done.');
    }
}

capture();
