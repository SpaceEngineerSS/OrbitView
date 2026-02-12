import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../public/screenshots');
const URL = 'http://localhost:3001'; // Make sure the app is running!

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
    console.log('🚀 Launching browser for screenshot capture...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--window-size=1920,1080'
        ],
        defaultViewport: null,
    });

    const page = await browser.newPage();

    // Set a user agent to avoid bot detection if necessary, though localhost is fine
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log(`🌐 Navigating to ${URL}...`);
        // Wait until network is idle to ensure assets are loaded
        const response = await page.goto(URL, { waitUntil: 'networkidle0', timeout: 90000 });

        if (response?.status() !== 200) {
            console.warn(`⚠️ Page loaded with status ${response?.status()}`);
        }

        // --- 1. Desktop Capture ---
        console.log('📸 Capturing Desktop View...');
        await page.setViewport({ width: 1920, height: 1080 });

        // Wait for Cesium Canvas explicitly
        await page.waitForSelector('canvas', { timeout: 30000 });
        console.log('   - Canvas detected');

        // Wait for Fly-in Animation (Start + 4s duration) + Tile Loading
        console.log('   - Waiting for cinematic fly-in & tiles...');
        await new Promise(r => setTimeout(r, 12000));

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

        await page.waitForSelector('canvas', { timeout: 30000 });
        console.log('   - Mobile Canvas detected');

        // Wait again for mobile reload + animation
        await new Promise(r => setTimeout(r, 12000));

        await page.screenshot({
            path: path.join(OUTPUT_DIR, 'mobile-preview.png'),
            fullPage: false
        });
        console.log('✅ Mobile screenshot saved.');

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error);

        // Take an error screenshot to see what's happening
        try {
            await page.screenshot({
                path: path.join(OUTPUT_DIR, 'debug-error.png'),
                fullPage: true
            });
            console.log('📸 Saved debug-error.png');
        } catch (e) {
            console.error('Could not save debug screenshot');
        }
    } finally {
        await browser.close();
        console.log('✨ Done.');
    }
}

capture();
