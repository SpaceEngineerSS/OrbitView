/**
 * Screenshot Capture Script for OrbitView Documentation
 * Captures desktop and mobile previews using Puppeteer
 * 
 * Usage: npm run docs:snap
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SCREENSHOTS_DIR = join(ROOT_DIR, 'public', 'screenshots');

// Configuration
const BASE_URL = 'http://localhost:3001';
const WAIT_TIME = 5000; // Wait for globe to render

const VIEWPORTS = {
    desktop: { width: 1920, height: 1080 },
    mobile: { width: 390, height: 844, isMobile: true, hasTouch: true }
};

// Helper function for delay (replaces deprecated waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ensureDirectoryExists(dir) {
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
}

async function captureScreenshots() {
    console.log('🚀 Starting OrbitView screenshot capture...\n');

    // Ensure screenshots directory exists
    await ensureDirectoryExists(SCREENSHOTS_DIR);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Desktop Screenshot
        console.log('🖥️  Capturing desktop view (1920x1080)...');
        const desktopPage = await browser.newPage();
        await desktopPage.setViewport(VIEWPORTS.desktop);
        await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(WAIT_TIME);

        const desktopPath = join(SCREENSHOTS_DIR, 'desktop-preview.png');
        await desktopPage.screenshot({ path: desktopPath, fullPage: false });
        console.log(`   ✅ Saved: ${desktopPath}\n`);
        await desktopPage.close();

        // Mobile Screenshot (iPhone 12 Pro dimensions)
        console.log('📱 Capturing mobile view (390x844)...');
        const mobilePage = await browser.newPage();
        await mobilePage.setViewport(VIEWPORTS.mobile);
        await mobilePage.emulate({
            viewport: VIEWPORTS.mobile,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        });
        await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(WAIT_TIME);

        const mobilePath = join(SCREENSHOTS_DIR, 'mobile-preview.png');
        await mobilePage.screenshot({ path: mobilePath, fullPage: false });
        console.log(`   ✅ Saved: ${mobilePath}\n`);
        await mobilePage.close();

        console.log('🎉 Screenshot capture complete!');
        console.log('   Files saved to: public/screenshots/');

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run
captureScreenshots();
