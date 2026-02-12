/**
 * BuildDesk App Store & Play Store Screenshot Capture
 *
 * Captures screenshots at all required sizes for Apple App Store
 * and Google Play Store submission.
 *
 * Usage:
 *   npm run mobile:screenshots
 *
 * Or with a running dev server:
 *   PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run mobile:screenshots
 *
 * Output: screenshots/app-store/ and screenshots/play-store/
 */

import { test, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Device Definitions ───

interface DeviceSpec {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  folder: string;
  isMobile: boolean;
  hasTouch: boolean;
}

// Apple App Store — required and recommended sizes
const APP_STORE_DEVICES: DeviceSpec[] = [
  {
    name: 'iPhone-6.9inch',
    width: 440,
    height: 956,
    deviceScaleFactor: 3,
    folder: 'app-store/6.9-inch-iPhone',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'iPhone-6.7inch',
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    folder: 'app-store/6.7-inch-iPhone',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'iPhone-6.5inch',
    width: 428,
    height: 926,
    deviceScaleFactor: 3,
    folder: 'app-store/6.5-inch-iPhone',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'iPhone-5.5inch',
    width: 414,
    height: 736,
    deviceScaleFactor: 3,
    folder: 'app-store/5.5-inch-iPhone',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'iPad-13inch',
    width: 1032,
    height: 1376,
    deviceScaleFactor: 2,
    folder: 'app-store/13-inch-iPad',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'iPad-12.9inch',
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    folder: 'app-store/12.9-inch-iPad',
    isMobile: true,
    hasTouch: true,
  },
];

// Google Play Store — required sizes
const PLAY_STORE_DEVICES: DeviceSpec[] = [
  {
    name: 'Phone-1080x2340',
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    folder: 'play-store/phone',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'Tablet-7inch',
    width: 600,
    height: 960,
    deviceScaleFactor: 2,
    folder: 'play-store/7-inch-tablet',
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'Tablet-10inch',
    width: 900,
    height: 1280,
    deviceScaleFactor: 2,
    folder: 'play-store/10-inch-tablet',
    isMobile: true,
    hasTouch: true,
  },
];

// ─── Pages to Screenshot ───

interface ScreenPage {
  /** File name for the screenshot (no extension) */
  name: string;
  /** Route path */
  path: string;
  /** Short description for logging */
  label: string;
  /** Optional: wait for this selector before capturing */
  waitFor?: string;
  /** Optional: milliseconds to wait after page load for animations */
  delay?: number;
}

const PAGES: ScreenPage[] = [
  {
    name: '01-dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    delay: 2000,
  },
  {
    name: '02-projects',
    path: '/projects',
    label: 'Projects',
    delay: 1500,
  },
  {
    name: '03-financial-dashboard',
    path: '/financial-dashboard',
    label: 'Financial Dashboard',
    delay: 1500,
  },
  {
    name: '04-time-tracking',
    path: '/time-tracking',
    label: 'Time Tracking',
    delay: 1500,
  },
  {
    name: '05-scheduling',
    path: '/scheduling',
    label: 'Scheduling',
    delay: 1500,
  },
  {
    name: '06-estimates',
    path: '/estimates',
    label: 'Estimates',
    delay: 1500,
  },
  {
    name: '07-daily-reports',
    path: '/daily-reports',
    label: 'Daily Reports',
    delay: 1500,
  },
  {
    name: '08-documents',
    path: '/documents',
    label: 'Documents',
    delay: 1500,
  },
  {
    name: '09-analytics',
    path: '/analytics',
    label: 'Analytics',
    delay: 1500,
  },
  {
    name: '10-safety',
    path: '/safety',
    label: 'Safety',
    delay: 1500,
  },
];

// ─── Helpers ───

const OUTPUT_DIR = resolve(process.cwd(), 'screenshots');

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function waitForPageReady(page: Page, screenPage: ScreenPage) {
  try {
    await page.goto(screenPage.path, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    // networkidle can timeout on long-polling pages; domcontentloaded is enough
    await page.goto(screenPage.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  if (screenPage.waitFor) {
    await page.waitForSelector(screenPage.waitFor, { timeout: 10000 }).catch(() => {});
  }

  if (screenPage.delay) {
    await page.waitForTimeout(screenPage.delay);
  }

  // Wait for fonts and images to settle
  await page.waitForTimeout(500);
}

async function captureForDevice(
  page: Page,
  device: DeviceSpec,
  screenPage: ScreenPage,
) {
  const dir = resolve(OUTPUT_DIR, device.folder);
  ensureDir(dir);

  const filePath = resolve(dir, `${screenPage.name}.png`);

  await page.setViewportSize({
    width: device.width,
    height: device.height,
  });

  await waitForPageReady(page, screenPage);

  await page.screenshot({
    path: filePath,
    type: 'png',
    fullPage: false, // Viewport only — stores want exact dimensions
  });
}

// ─── Test Suites ───

test.describe('App Store Screenshots', () => {
  test.describe.configure({ mode: 'serial' });

  for (const device of APP_STORE_DEVICES) {
    test.describe(device.name, () => {
      test.use({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: device.isMobile,
        hasTouch: device.hasTouch,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      });

      for (const screenPage of PAGES) {
        test(`${screenPage.label}`, async ({ page }) => {
          await captureForDevice(page, device, screenPage);
        });
      }
    });
  }
});

test.describe('Play Store Screenshots', () => {
  test.describe.configure({ mode: 'serial' });

  for (const device of PLAY_STORE_DEVICES) {
    test.describe(device.name, () => {
      test.use({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: device.isMobile,
        hasTouch: device.hasTouch,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
      });

      for (const screenPage of PAGES) {
        test(`${screenPage.label}`, async ({ page }) => {
          await captureForDevice(page, device, screenPage);
        });
      }
    });
  }
});
