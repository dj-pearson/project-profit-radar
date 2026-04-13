/**
 * Brikly App Store & Play Store Screenshot Capture
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
 * Authentication:
 *   Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env:
 *   TEST_USER_EMAIL=demo@example.com
 *   TEST_USER_PASSWORD=YourPassword123
 *
 * Output: screenshots/app-store/ and screenshots/play-store/
 */

import { test, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ─── Authentication Configuration ───

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.warn(
    '⚠️  Warning: TEST_USER_EMAIL and TEST_USER_PASSWORD not found in .env\n' +
    '   Screenshots will be captured without authentication.\n' +
    '   Add the following to your .env file:\n' +
    '   TEST_USER_EMAIL=your-email@example.com\n' +
    '   TEST_USER_PASSWORD=YourPassword123'
  );
}

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
    path: '/financial',
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
const AUTH_STATE_FILE = resolve(process.cwd(), '.playwright-auth.json');

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Authenticate user and save session state
 */
async function authenticateUser(page: Page): Promise<boolean> {
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    return false; // Skip authentication if credentials not provided
  }

  try {
    console.log('🔐 Authenticating user...');
    
    // Navigate to auth page
    await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the login form to be visible
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Wait a bit for React to fully hydrate
    await page.waitForTimeout(1000);
    
    // Fill in credentials
    await page.fill('input[type="email"], input[name="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER_PASSWORD);
    
    // Wait before clicking submit
    await page.waitForTimeout(500);
    
    // Click sign in button
    await page.click('button[type="submit"]:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Login")');
    
    // Wait longer for full authentication flow including profile fetch
    await page.waitForTimeout(5000);
    
    // Wait for navigation away from auth page  
    const waitForNav = page.waitForURL((url) => !url.toString().includes('/auth'), { timeout: 20000 }).catch(() => {
      console.warn('Navigation timeout, checking session anyway...');
    });
    
    await waitForNav;
    
    // Give extra time for profile to load and session to stabilize
    await page.waitForTimeout(3000);
    
    // Check for Supabase session in localStorage
    const sessionCheck = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      
      // Look for the Supabase auth token key
      const authTokenKey = keys.find(k => k.includes('sb-') && k.includes('auth-token'));
      
      let hasValidSession = false;
      if (authTokenKey) {
        try {
          const value = localStorage.getItem(authTokenKey);
          if (value && value.includes('access_token')) {
            hasValidSession = true;
          }
        } catch (e) {
          // ignore
        }
      }
      
      return {
        currentPath: window.location.pathname,
        allKeys: keys,
        authTokenKey: authTokenKey,
        hasValidSession: hasValidSession
      };
    });
    
    console.log('Session check:', JSON.stringify(sessionCheck, null, 2));
    
    if (sessionCheck.hasValidSession) {
      console.log('✅ Authentication successful - session found in localStorage');
      
      // Save the authentication state (includes cookies, localStorage, sessionStorage)
      await page.context().storageState({ path: AUTH_STATE_FILE });
      
      // Verify the file was created
      if (existsSync(AUTH_STATE_FILE)) {
        console.log(`✅ Auth state saved to ${AUTH_STATE_FILE}`);
      } else {
        console.error('❌ Failed to save auth state file');
        return false;
      }
      
      return true;
    } else {
      console.error('❌ Authentication failed - no valid session found');
      console.error('Current path:', sessionCheck.currentPath);
      console.error('localStorage keys:', sessionCheck.allKeys);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return false;
  }
}

async function waitForPageReady(page: Page, screenPage: ScreenPage) {
  // Enable console logging for important errors only
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && 
        !text.includes('404') && // Ignore 404s
        !text.includes('financial_records') && // Ignore known missing table errors  
        (text.includes('auth') || text.includes('session') || text.includes('redirect'))) {
      console.log(`Browser console [${msg.type()}]:`, text);
    }
  });

  try {
    // Navigate to the page - use domcontentloaded to be faster
    await page.goto(screenPage.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for network to settle (but don't fail if it doesn't)
    await page.waitForLoadState('network idle', { timeout: 10000 }).catch(() => {
      console.log(`Network didn't settle for ${screenPage.path}, continuing anyway`);
    });
  } catch (error) {
    console.error(`Error navigating to ${screenPage.path}:`, error);
    throw error;
  }
  
  // Give extra time for React to render and profile to load
  await page.waitForTimeout(2000);

  // Check the page state
  const pageState = await page.evaluate(() => {
    const currentUrl = window.location.pathname;
    const bodyText = document.body.innerText.toLowerCase();
    
    return {
      currentUrl,
      isAuthPage: currentUrl.includes('/auth'),
      isLoadingPage: bodyText.includes('loading') && bodyText.length < 200, // Only flag if mostly just "loading"
      is404Page: bodyText.includes('page not found') || bodyText.includes('404'),
      hasContent: document.body.children.length > 1,
      bodyLength: bodyText.length
    };
  });
  
  console.log(`Page state for ${screenPage.path}:`, pageState);

  // Check if we got redirected to auth page (unauthorized)
  if (pageState.isAuthPage) {
    console.warn(`⚠️  ${screenPage.path} redirected to auth page - skipping this screenshot`);
    // Don't throw error, just log warning and let test continue
    return; // This will cause screenshot to not be taken, but test won't fail
  }
  
  // Check if we're stuck on loading  
  if (pageState.isLoadingPage) {
    console.warn(`⚠️  Page is showing loading state for ${screenPage.path}, waiting up to 10 seconds...`);
    
    // Wait up to 10 seconds for the loading to complete
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      
      const stillLoading = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('loading');
      });
      
      if (!stillLoading) {
        console.log(`✅ Page loaded successfully for ${screenPage.path}`);
        break;
      }
      
      // After 10 seconds, give up and just capture whatever is showing
      if (i === 19) {
        console.warn(`⚠️  Page still loading after 10 seconds for ${screenPage.path}, capturing anyway`);
      }
    }
  }
  
  // Check if we got a 404
  if (pageState.is404Page) {
    console.warn(`⚠️  Got 404 page for ${screenPage.path} - skipping this screenshot`);
    return; // Skip this screenshot but don't fail the test
  }

  if (screenPage.waitFor) {
    await page.waitForSelector(screenPage.waitFor, { timeout: 10000 }).catch(() => {
      console.warn(`⚠️  Selector ${screenPage.waitFor} not found on ${screenPage.path}`);
    });
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

  try {
    await waitForPageReady(page, screenPage);
  } catch (error) {
    console.error(`Error preparing ${screenPage.path}:`, error);
    return; // Skip this screenshot
  }
  
  // Check if we're on the auth page (waitForPageReady might have returned early)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth')) {
    console.warn(`⚠️  Skipping screenshot for ${screenPage.path} (on auth page)`);
    return;
  }
  
  // Debug: Log the final URL we're screenshotting
  const finalUrl = page.url();
  if (finalUrl.includes('/auth')) {
    console.error(`⚠️  Warning: Capturing auth page instead of ${screenPage.path}`);
  }

  await page.screenshot({
    path: filePath,
    type: 'png',
    fullPage: false, // Viewport only — stores want exact dimensions
  });
  
  console.log(`✅ Captured ${screenPage.label} @ ${device.name}`);
}

// ─── Test Suites ───

test.describe('App Store Screenshots', () => {
  test.describe.configure({ mode: 'serial' });
  
  // Authenticate once before all tests
  test.beforeAll(async ({ browser }) => {
    if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
      const page = await browser.newPage();
      const authenticated = await authenticateUser(page);
      await page.close();
      
      if (!authenticated) {
        console.warn('⚠️  Authentication failed. Screenshots will be captured without authentication.');
        console.warn('   Some pages may redirect to login or show restricted content.');
      }
    } else {
      console.warn('⚠️  No credentials provided. Screenshots will be captured without authentication.');
    }
  });

  for (const device of APP_STORE_DEVICES) {
    test.describe(device.name, () => {
      // Apply storage state conditionally
      if (existsSync(AUTH_STATE_FILE)) {
        test.use({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
          storageState: AUTH_STATE_FILE,
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        });
      } else {
        test.use({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        });
      }

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
  
  // Authenticate once before all tests (if not already done)
  test.beforeAll(async ({ browser }) => {
    if (TEST_USER_EMAIL && TEST_USER_PASSWORD && !existsSync(AUTH_STATE_FILE)) {
      const page = await browser.newPage();
      const authenticated = await authenticateUser(page);
      await page.close();
      
      if (!authenticated) {
        console.warn('⚠️  Authentication failed. Screenshots will be captured without authentication.');
      }
    }
  });

  for (const device of PLAY_STORE_DEVICES) {
    test.describe(device.name, () => {
      // Apply storage state conditionally
      if (existsSync(AUTH_STATE_FILE)) {
        test.use({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
          storageState: AUTH_STATE_FILE,
          userAgent:
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        });
      } else {
        test.use({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
          userAgent:
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        });
      }

      for (const screenPage of PAGES) {
        test(`${screenPage.label}`, async ({ page }) => {
          await captureForDevice(page, device, screenPage);
        });
      }
    });
  }
});
