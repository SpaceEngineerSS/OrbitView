/**
 * OrbitView Screenshot Capture Script
 * Captures desktop and mobile screenshots for documentation
 * 
 * Usage: node scripts/capture-screens.js
 * Requires: npm install puppeteer --save-dev
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

// Viewport configurations
const VIEWPORTS = {
    desktop: { width: 1920, height: 1080, name: 'desktop-view' },
    mobile: { width: 390, height: 844, name: 'mobile-view', isMobile: true }
};

async function captureScreenshots() {
    console.log('🚀 Starting OrbitView Screenshot Capture...\n');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`📁 Created directory: ${OUTPUT_DIR}`);
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        for (const [type, config] of Object.entries(VIEWPORTS)) {
            console.log(`📸 Capturing ${type} view (${config.width}x${config.height})...`);

            const page = await browser.newPage();

            await page.setViewport({
                width: config.width,
                height: config.height,
                isMobile: config.isMobile || false,
                deviceScaleFactor: 2 // Retina quality
            });

            // Navigate and wait for network idle
            await page.goto(BASE_URL, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for globe to render
            await page.waitForSelector('canvas', { timeout: 10000 });

            // Additional wait for animations to settle
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Capture screenshot
            const filename = `${config.name}.png`;
            const filepath = path.join(OUTPUT_DIR, filename);

            await page.screenshot({
                path: filepath,
                fullPage: false
            });

            console.log(`   ✅ Saved: public/screenshots/${filename}`);

            await page.close();
        }

        console.log('\n🎉 Screenshots captured successfully! 📸');
        console.log(`   Location: ${OUTPUT_DIR}`);

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    captureScreenshots();
}

module.exports = { captureScreenshots };
